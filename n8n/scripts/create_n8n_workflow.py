"""Create an n8n workflow from a local JSON file.

Usage:
    N8N_API_KEY=<key> python create_n8n_workflow.py [workflow.json]

If no path is given, defaults to ../workflows/youscan-collect-mentions.json
relative to this script. N8N_BASE_URL defaults to http://localhost:5678/api/v1.
"""

import json
import os
import sys
from pathlib import Path

import requests

DEFAULT_JSON = Path(__file__).resolve().parent.parent / "workflows" / "youscan-collect-mentions.json"
DEFAULT_BASE_URL = "http://localhost:5678/api/v1"
REQUEST_TIMEOUT = int(os.getenv("N8N_TIMEOUT", "15"))


def main() -> int:
    api_key = os.getenv("N8N_API_KEY")
    if not api_key:
        print("ERROR: N8N_API_KEY environment variable is required.", file=sys.stderr)
        print("       Generate one in n8n Settings > API and export it before running.", file=sys.stderr)
        return 2

    base_url = os.getenv("N8N_BASE_URL", DEFAULT_BASE_URL).rstrip("/")
    json_path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_JSON

    if not json_path.is_file():
        print(f"ERROR: workflow JSON not found: {json_path}", file=sys.stderr)
        return 2

    with json_path.open("r", encoding="utf-8") as f:
        workflow_data = json.load(f)

    for key in ("nodes", "connections"):
        if key not in workflow_data:
            print(f"ERROR: invalid n8n workflow JSON — missing '{key}'", file=sys.stderr)
            return 2

    payload = {
        "name": workflow_data.get("name", "Imported Workflow"),
        "nodes": workflow_data["nodes"],
        "connections": workflow_data["connections"],
        "settings": workflow_data.get("settings", {}),
    }

    headers = {
        "X-N8N-API-KEY": api_key,
        "Content-Type": "application/json",
    }

    try:
        response = requests.post(
            f"{base_url}/workflows",
            headers=headers,
            json=payload,
            timeout=REQUEST_TIMEOUT,
        )
    except requests.RequestException as exc:
        print(f"ERROR: request to n8n failed: {exc}", file=sys.stderr)
        return 1

    if response.status_code in (200, 201):
        print("Workflow created successfully.")
        print(json.dumps(response.json(), indent=2))
        return 0

    print(f"ERROR: failed to create workflow (HTTP {response.status_code})", file=sys.stderr)
    print(response.text, file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main())
