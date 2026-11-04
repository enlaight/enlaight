"""Report interpolation and markup that differs between en.json and a locale.

Usage:  python3 scripts/check_locale_placeholders.py

check_locales.py answers "is every key present". This answers "does every
key that IS present still interpolate", which is a different failure: a key
can be fully translated and still be broken, and i18next says nothing about
it — it renders whatever literal text it was given.

For every key present in both en.json and a locale it compares, as multisets:

  - i18next variables      {{count}}, {{name, uppercase}}  -> count, name
  - nesting references     $t(some.key)                    -> some.key
  - markup tags            <strong>, <1>, <br/>            -> strong, 1, br

A difference is an ERROR and fails the run, so this can gate a build the way
check_locales.py does. It is the class of defect the script was written for:

    ru  "botModal.projectsSelected": "Выбрано проектов: {cou{nt}"
    en  "botModal.projectsSelected": "{{count}} project(s) selected"

Russian users saw the literal "{cou{nt}" where the number should have been.

Single-brace text that looks like a placeholder — "{name}", which i18next
does not interpolate, since the default delimiters are {{ and }} — is
reported as a WARNING when en.json and every locale agree on it. That is a
defect in the source strings rather than a translation problem, it is
pre-existing, and failing on it would mean this script could never pass.
"""
import json
import re
import sys
from collections import Counter
from pathlib import Path

LOCALES = Path(__file__).resolve().parent.parent / "src" / "locales"
if not LOCALES.is_dir():
    LOCALES = Path("frontend/src/locales")

VARIABLE = re.compile(r"\{\{\s*([^{},\s]+)[^{}]*\}\}")
NESTING = re.compile(r"\$t\(\s*([^)\s]+)\s*\)")
TAG = re.compile(r"</?\s*([A-Za-z][A-Za-z0-9]*|\d+)\s*/?>")
SINGLE_BRACE = re.compile(r"(?<!\{)\{([A-Za-z_][A-Za-z0-9_]*)\}(?!\})")


def flatten(d, prefix=""):
    out = {}
    for k, v in d.items():
        key = f"{prefix}.{k}" if prefix else k
        if isinstance(v, dict):
            out.update(flatten(v, key))
        else:
            out[key] = v
    return out


def shape(text):
    """The parts of a string that must survive translation unchanged."""
    return (
        Counter(VARIABLE.findall(text)),
        Counter(NESTING.findall(text)),
        Counter(t.lower() for t in TAG.findall(text)),
    )


def describe(want, got):
    parts = []
    for label, w, g in zip(("variable", "nesting", "tag"), want, got):
        if w == g:
            continue
        bits = []
        missing = sorted((w - g).elements())
        extra = sorted((g - w).elements())
        if missing:
            bits.append(f"missing {label}(s) {missing}")
        if extra:
            bits.append(f"unexpected {label}(s) {extra}")
        parts.append(", ".join(bits))
    return "; ".join(parts)


def main():
    if not LOCALES.is_dir():
        print(f"locale directory not found: {LOCALES}", file=sys.stderr)
        return 2

    base = flatten(json.loads((LOCALES / "en.json").read_text(encoding="utf-8")))
    others = {}
    for path in sorted(LOCALES.glob("*.json")):
        if path.name != "en.json":
            others[path.stem] = flatten(json.loads(path.read_text(encoding="utf-8")))

    errors = 0

    for lang, flat in others.items():
        bad = []
        for key, want in base.items():
            got = flat.get(key)
            if not isinstance(want, str) or not isinstance(got, str):
                continue
            if shape(want) != shape(got):
                bad.append((key, want, got))
        shared = sum(1 for k in base if k in flat)
        print(f"{lang + '.json':<10} {shared:>4} shared keys, {len(bad):>3} mismatched")
        for key, want, got in bad:
            errors += 1
            print(f"             - {key}: {describe(shape(want), shape(got))}")
            print(f"                 en: {want!r}")
            print(f"                 {lang}: {got!r}")

    # Single-brace text, reported only where the whole set of files agrees.
    warnings = []
    for key, want in base.items():
        if not isinstance(want, str):
            continue
        names = SINGLE_BRACE.findall(want)
        if not names:
            continue
        everywhere = all(
            isinstance(flat.get(key), str)
            and Counter(SINGLE_BRACE.findall(flat[key])) == Counter(names)
            for flat in others.values()
        )
        if everywhere:
            warnings.append((key, sorted(set(names)), want))
        # If a locale disagrees, the shape check above has already failed it.

    if warnings:
        print(
            f"\nWARNING  {len(warnings)} key(s) use single-brace text that i18next "
            "does not interpolate (its delimiters are {{ and }}), identically in "
            "en.json and every locale. Pre-existing; needs its own ticket."
        )
        for key, names, text in warnings:
            print(f"             - {key}: {names} in {text!r}")

    print(
        f"\nen.json has {len(base)} keys."
        + ("  No mismatches." if errors == 0 else f"  {errors} mismatch(es) above.")
    )
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
