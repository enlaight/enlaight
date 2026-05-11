"""Create n8n workflows from local JSON files.

Usage:
    N8N_API_KEY=<key> python create_n8n_workflow.py [folder_or_file]

If no path is given, defaults to ../workflows/dashboard-youscan relative to
this script and creates one workflow per JSON file in that folder.
N8N_BASE_URL defaults to https://facsimile-n8n.enlaight.ai/api/v1.
"""

import json
import os
import sys
from pathlib import Path

import requests

DEFAULT_DIR = Path(__file__).resolve().parent.parent / "workflows" / "dashboard-youscan"
DEFAULT_BASE_URL = "https://facsimile-n8n.enlaight.ai/api/v1"
REQUEST_TIMEOUT = int(os.getenv("N8N_TIMEOUT", "15"))


def create_workflow(json_path: Path, base_url: str, headers: dict) -> bool:
    with json_path.open("r", encoding="utf-8") as f:
        workflow_data = json.load(f)

    for key in ("nodes", "connections"):
        if key not in workflow_data:
            print(f"ERROR: {json_path.name} — missing '{key}'", file=sys.stderr)
            return False

    payload = {
        "name": workflow_data.get("name", json_path.stem),
        "nodes": workflow_data["nodes"],
        "connections": workflow_data["connections"],
        "settings": workflow_data.get("settings", {}),
    }

    try:
        response = requests.post(
            f"{base_url}/workflows",
            headers=headers,
            json=payload,
            timeout=REQUEST_TIMEOUT,
        )
    except requests.RequestException as exc:
        print(f"ERROR: {json_path.name} — request failed: {exc}", file=sys.stderr)
        return False

    if response.status_code in (200, 201):
        print(f"OK: {json_path.name} → '{payload['name']}'")
        return True

    print(
        f"ERROR: {json_path.name} — HTTP {response.status_code}: {response.text}",
        file=sys.stderr,
    )
    return False


def main() -> int:
    api_key = os.getenv("N8N_API_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkMzk2Mjk2Mi02M2MwLTQzOTUtYTRkZC1kMzRlNTI0YmJhZDMiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzc4NTE3OTM4fQ.C5vp7_PSgdqb7EH76YNBaS6ne_-JWr3ISSO6ZtgDzeg")
    if not api_key:
        print("ERROR: N8N_API_KEY environment variable is required.", file=sys.stderr)
        print("       Generate one in n8n Settings > API and export it before running.", file=sys.stderr)
        return 2

    base_url = os.getenv("N8N_BASE_URL", DEFAULT_BASE_URL).rstrip("/")
    target = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_DIR

    if target.is_file():
        json_files = [target]
    elif target.is_dir():
        json_files = sorted(target.glob("*.json"))
        if not json_files:
            print(f"ERROR: no JSON files found in {target}", file=sys.stderr)
            return 2
    else:
        print(f"ERROR: path not found: {target}", file=sys.stderr)
        return 2

    headers = {
        "X-N8N-API-KEY": api_key,
        "Content-Type": "application/json",
    }

    succeeded = 0
    failed = 0
    for json_path in json_files:
        if create_workflow(json_path, base_url, headers):
            succeeded += 1
        else:
            failed += 1

    print(f"\nDone: {succeeded} created, {failed} failed (of {len(json_files)}).")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
