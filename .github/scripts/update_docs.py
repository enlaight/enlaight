#!/usr/bin/env python3
"""
update_docs.py
--------------
Called by the GitHub Action docs-update.yml on every PR.

Steps:
  1. Collect the PR diff (git diff against the base branch).
  2. Read all tracked Markdown files.
  3. Send diff + docs to OpenRouter and ask for a JSON response that
     maps filename → updated content for any doc that needs changing.
  4. Write changed files back to disk.
  5. Exit 0 always — the Action handles the git commit.

Environment variables required:
  OPENROUTER_API_KEY   Secret stored in GitHub Actions secrets.
  BASE_BRANCH          Set by the workflow (e.g. "main").  Default: "main".
  MAX_DIFF_CHARS       Soft cap on diff size sent to the LLM. Default: 40000.
"""

import json
import os
import subprocess
import sys
import textwrap
from pathlib import Path

import urllib.request
import urllib.error

# ── Configuration ─────────────────────────────────────────────────────────────

OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "")
BASE_BRANCH        = os.environ.get("BASE_BRANCH", "main")
MAX_DIFF_CHARS     = int(os.environ.get("MAX_DIFF_CHARS", 40_000))
MODEL              = "google/gemini-2.0-flash-001"
OPENROUTER_URL     = "https://openrouter.ai/api/v1/chat/completions"

# Markdown files to keep in sync — paths relative to repo root.
# Add or remove entries here as the project grows.
DOCS_TO_MANAGE = [
    "README.md",
    "INTEGRATIONS.md",
    "docs/architecture.md",
    "docs/operations.md",
    "docs/security.md",
]

# ── Helpers ───────────────────────────────────────────────────────────────────

def run(cmd: list[str], **kwargs) -> str:
    """Run a shell command and return stdout. Raises on non-zero exit."""
    result = subprocess.run(cmd, capture_output=True, text=True, **kwargs)
    if result.returncode != 0:
        print(f"[ERROR] Command failed: {' '.join(cmd)}", file=sys.stderr)
        print(result.stderr, file=sys.stderr)
        sys.exit(1)
    return result.stdout


def get_diff() -> str:
    """Return the unified diff of this PR against the base branch."""
    try:
        diff = run(["git", "diff", f"origin/{BASE_BRANCH}...HEAD", "--", "."])
    except SystemExit:
        # Fallback: diff against HEAD~1 if the base branch isn't available
        diff = run(["git", "diff", "HEAD~1", "HEAD", "--", "."])

    if len(diff) > MAX_DIFF_CHARS:
        diff = diff[:MAX_DIFF_CHARS] + "\n\n[diff truncated — exceeded MAX_DIFF_CHARS]\n"

    return diff


def read_docs(repo_root: Path) -> dict[str, str]:
    """Read all managed markdown files. Skip files that don't exist yet."""
    docs: dict[str, str] = {}
    for rel_path in DOCS_TO_MANAGE:
        full_path = repo_root / rel_path
        if full_path.exists():
            docs[rel_path] = full_path.read_text(encoding="utf-8")
        else:
            print(f"[SKIP] {rel_path} does not exist — skipping.")
    return docs


def build_prompt(diff: str, docs: dict[str, str]) -> str:
    """Construct the LLM prompt."""
    docs_block = "\n\n".join(
        f"### {path}\n```markdown\n{content}\n```"
        for path, content in docs.items()
    )

    return textwrap.dedent(f"""
        You are a technical documentation assistant for a software project.

        A pull request has introduced the following code changes:

        <diff>
        {diff}
        </diff>

        Below are the current contents of every documentation file in the project:

        <docs>
        {docs_block}
        </docs>

        Your task:
        1. Analyse the diff to understand what changed (new files, modified logic,
           new environment variables, new endpoints, changed dependencies, etc.).
        2. Decide which documentation files need to be updated to accurately reflect
           those changes.
        3. Return ONLY a valid JSON object where:
           - Each KEY is the relative file path (e.g. "README.md")
           - Each VALUE is the COMPLETE updated content of that file as a string
           - Only include files that actually need changes
           - If NO files need updating, return an empty object: {{}}

        Rules:
        - Preserve the existing tone, formatting, and structure of each document.
        - Do not invent features or endpoints that are not evidenced by the diff.
        - Do not add placeholder text or "TODO" sections.
        - Do not wrap your response in markdown code fences — output raw JSON only.

        Example response shape (do not copy this content):
        {{
          "README.md": "# Project\\n\\nUpdated content here...",
          "INTEGRATIONS.md": "# Integrations\\n\\nUpdated content here..."
        }}
    """).strip()


def call_openrouter(prompt: str) -> str:
    """POST the prompt to OpenRouter and return the assistant message content."""
    if not OPENROUTER_API_KEY:
        print("[ERROR] OPENROUTER_API_KEY is not set.", file=sys.stderr)
        sys.exit(1)

    payload = json.dumps({
        "model": MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.2,   # low temp → deterministic, factual output
        "max_tokens": 16384,
    }).encode("utf-8")

    req = urllib.request.Request(
        OPENROUTER_URL,
        data=payload,
        headers={
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://github.com/enlaight/enlaight-public",
            "X-Title": "Enlaight Docs Updater",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            body = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        print(f"[ERROR] OpenRouter HTTP {e.code}: {e.read().decode()}", file=sys.stderr)
        sys.exit(1)

    return body["choices"][0]["message"]["content"].strip()


def parse_response(raw: str) -> dict[str, str]:
    """Extract the JSON object from the LLM response."""
    # Strip accidental markdown fences if the model ignores instructions
    if raw.startswith("```"):
        lines = raw.splitlines()
        raw = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])

    try:
        result = json.loads(raw)
    except json.JSONDecodeError as exc:
        print(f"[ERROR] Could not parse LLM response as JSON: {exc}", file=sys.stderr)
        print("[RAW RESPONSE]", raw[:2000], file=sys.stderr)
        # Non-fatal: treat as "no changes needed" so the PR isn't blocked
        return {}

    if not isinstance(result, dict):
        print("[WARN] LLM returned non-dict JSON — treating as no changes.", file=sys.stderr)
        return {}

    return result


def write_updates(updates: dict[str, str], repo_root: Path) -> list[str]:
    """Write updated files to disk. Returns list of changed file paths."""
    changed = []
    for rel_path, new_content in updates.items():
        # Safety: only allow files in DOCS_TO_MANAGE to prevent path traversal
        if rel_path not in DOCS_TO_MANAGE:
            print(f"[SKIP] LLM tried to update unmanaged file '{rel_path}' — ignoring.")
            continue

        full_path = repo_root / rel_path
        full_path.parent.mkdir(parents=True, exist_ok=True)

        current = full_path.read_text(encoding="utf-8") if full_path.exists() else ""
        if new_content == current:
            print(f"[UNCHANGED] {rel_path}")
            continue

        full_path.write_text(new_content, encoding="utf-8")
        print(f"[UPDATED] {rel_path}")
        changed.append(rel_path)

    return changed


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    repo_root = Path(
        run(["git", "rev-parse", "--show-toplevel"]).strip()
    )

    print(f"[INFO] Repo root: {repo_root}")
    print(f"[INFO] Base branch: {BASE_BRANCH}")
    print(f"[INFO] Model: {MODEL}")

    # 1. Get diff
    print("\n[STEP 1] Collecting PR diff...")
    diff = get_diff()
    print(f"[INFO] Diff size: {len(diff):,} chars")

    if not diff.strip():
        print("[INFO] Empty diff — nothing to document. Exiting.")
        sys.exit(0)

    # 2. Read docs
    print("\n[STEP 2] Reading documentation files...")
    docs = read_docs(repo_root)
    print(f"[INFO] Loaded {len(docs)} file(s): {', '.join(docs)}")

    # 3. Build prompt and call LLM
    print("\n[STEP 3] Calling OpenRouter LLM...")
    prompt = build_prompt(diff, docs)
    raw_response = call_openrouter(prompt)
    print(f"[INFO] Response size: {len(raw_response):,} chars")

    # 4. Parse and write
    print("\n[STEP 4] Parsing LLM response...")
    updates = parse_response(raw_response)

    if not updates:
        print("[INFO] LLM determined no documentation changes are needed.")
        sys.exit(0)

    print(f"[INFO] LLM suggests updating: {', '.join(updates)}")

    print("\n[STEP 5] Writing updated files...")
    changed = write_updates(updates, repo_root)

    if changed:
        print(f"\n[DONE] Updated {len(changed)} file(s): {', '.join(changed)}")
    else:
        print("\n[DONE] No files were actually changed (content identical).")


if __name__ == "__main__":
    main()
