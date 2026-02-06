#!/usr/bin/env python3
"""
Simple Superset sample charts creator.

This script attempts to create three sample charts (line, bar, pie) in a running
Superset instance using the REST API. It requires the following environment
variables to be set:

- SUPERSET_URL: base URL of Superset (e.g. http://localhost:8088)
- SUPERSET_USERNAME
- SUPERSET_PASSWORD
- SUPERSET_DB_NAME: (optional) name of the Superset database entry to use
- SUPERSET_TABLE: (optional) table name to use as dataset (must exist in DB)

If the script cannot create charts automatically it will print helpful
instructions and exit with a non-zero code.

Note: Superset versions and API behavior vary. This script uses a best-effort
approach; you may need to adapt payloads for your Superset version.
"""

import os
import sys
import json
import time
from typing import Optional

import requests

SUPERSET_URL = os.environ.get("SUPERSET_BASE_URL")
SUPERSET_USERNAME = os.environ.get("SUPERSET_DB_USER")
SUPERSET_PASSWORD = os.environ.get("SUPERSET_DB_PASSWORD")
SUPERSET_DB_NAME = os.environ.get("SUPERSET_DB_NAME")
SUPERSET_TABLE = os.environ.get("SUPERSET_TABLE")  # e.g. authentication_chatsession

if not SUPERSET_URL:
    print("SUPERSET_URL not set. Please set env var SUPERSET_URL (e.g. http://localhost:8088)")
    sys.exit(1)
if not SUPERSET_USERNAME or not SUPERSET_PASSWORD:
    print("SUPERSET_USERNAME and SUPERSET_PASSWORD must be set to authenticate to Superset API")
    sys.exit(1)

session = requests.Session()

def superset_login(url: str, username: str, password: str) -> Optional[str]:
    """Attempt to log in and return access token (or None)."""
    login_url = f"{url.rstrip('/')}/api/v1/security/login"
    payload = {
        "username": username,
        "password": password,
        "provider": "db"
    }
    headers = {"Content-Type": "application/json"}

    resp = session.post(login_url, json=payload, headers=headers)
    if resp.status_code not in (200, 201):
        print(f"Login failed: {resp.status_code} - {resp.text}")
        return None
    data = resp.json()
    # Try common token fields
    token = data.get("access_token") or data.get("id_token") or data.get("token")
    if token:
        session.headers.update({"Authorization": f"Bearer {token}"})
        return token
    # Older Superset may use session cookie; session is persisted by requests.Session
    return None


def find_database_id(url: str, db_name: str) -> Optional[int]:
    """Find a database id by name via API (best-effort)."""
    dbs_url = f"{url.rstrip('/')}/api/v1/database/"
    resp = session.get(dbs_url)
    if resp.status_code != 200:
        print(f"Failed to query databases: {resp.status_code} - {resp.text}")
        return None
    data = resp.json()
    for item in data.get("result") or data.get("result", []):
        # fields differ between versions; try multiple names
        name = item.get("database_name") or item.get("name") or item.get("database")
        if name == db_name:
            return item.get("id")
    # fallback: try matching substring
    for item in data.get("result") or []:
        name = item.get("database_name") or item.get("name") or item.get("database")
        if db_name.lower() in str(name).lower():
            return item.get("id")
    return None


def find_or_create_dataset(url: str, db_id: int, table_name: str) -> Optional[int]:
    """Find dataset by table_name and database id, or create it."""
    list_url = f"{url.rstrip('/')}/api/v1/dataset/"
    resp = session.get(list_url, params={"q": json.dumps({"filters": []})})
    if resp.status_code != 200:
        print(f"Failed to list datasets: {resp.status_code} - {resp.text}")
        return None
    results = resp.json().get("result") or resp.json().get("result", [])
    for ds in results:
        # ds table might be under `table_name` or `table` depending on version
        if (ds.get("table_name") == table_name) or (ds.get("table") == table_name):
            return ds.get("id")

    # Create dataset
    payload = {
        "database": db_id,
        "table_name": table_name,
        "schema": None,
    }
    create_url = f"{url.rstrip('/')}/api/v1/dataset/"
    resp = session.post(create_url, json=payload)
    if resp.status_code in (200, 201):
        return resp.json().get("id") or resp.json().get("result", {}).get("id")
    print(f"Failed to create dataset: {resp.status_code} - {resp.text}")
    return None


def create_chart(url: str, dataset_id: int, viz_type: str, slice_name: str, params: dict) -> bool:
    create_url = f"{url.rstrip('/')}/api/v1/chart/"
    payload = {
        "slice_name": slice_name,
        "viz_type": viz_type,
        "datasource_id": dataset_id,
        "params": json.dumps(params),
    }
    # some Superset versions expect `dataset_id` instead of `datasource_id`
    payload_alias = payload.copy()
    payload_alias["dataset_id"] = payload_alias.pop("datasource_id")

    # Attempt create with datasource_id first
    resp = session.post(create_url, json=payload)
    if resp.status_code in (200, 201):
        print(f"Created chart {slice_name} ({viz_type})")
        return True
    # Try with dataset_id field
    resp = session.post(create_url, json=payload_alias)
    if resp.status_code in (200, 201):
        print(f"Created chart {slice_name} ({viz_type})")
        return True
    print(f"Failed to create chart {slice_name}: {resp.status_code} - {resp.text}")
    return False


def main():
    token = superset_login(SUPERSET_URL, SUPERSET_USERNAME, SUPERSET_PASSWORD)
    if token is None:
        print("Warning: login did not return a bearer token. Continuing with session cookies if present.")

    if not SUPERSET_DB_NAME:
        print("SUPERSET_DB_NAME not provided; attempting to auto-detect a matching database named 'enlaight' or similar.")
        cand = find_database_id(SUPERSET_URL, "enlaight")
        if cand:
            db_id = cand
            print(f"Auto-detected database id: {db_id}")
        else:
            print("Could not autodetect database. Provide SUPERSET_DB_NAME env var with the Superset DB entry name.")
            sys.exit(1)
    else:
        db_id = find_database_id(SUPERSET_URL, SUPERSET_DB_NAME)
        if not db_id:
            print(f"Could not find Superset database named '{SUPERSET_DB_NAME}'.")
            sys.exit(1)

    if not SUPERSET_TABLE:
        print("SUPERSET_TABLE not set. Please provide the table name created by the Django script (e.g. authentication_chatsession).")
        sys.exit(1)

    dataset_id = find_or_create_dataset(SUPERSET_URL, db_id, SUPERSET_TABLE)
    if not dataset_id:
        print("Failed to find or create dataset. Aborting chart creation.")
        sys.exit(1)

    # Create a simple line chart (time series)
    line_params = {
        "time_range": "Last week",
        "granularity_sqla": "created_at",
        "metrics": ["count"]
    }
    create_chart(SUPERSET_URL, dataset_id, "line", "Sample Line - Sessions over time", line_params)

    # Create a simple bar chart
    bar_params = {
        "groupby": ["agent_id"],
        "metrics": ["count"]
    }
    create_chart(SUPERSET_URL, dataset_id, "bar", "Sample Bar - Sessions by Agent", bar_params)

    # Create a simple pie chart
    pie_params = {
        "groupby": ["agent_id"],
        "metrics": ["count"]
    }
    create_chart(SUPERSET_URL, dataset_id, "pie", "Sample Pie - Session distribution by Agent", pie_params)

    print("All done. If charts failed to create, check the Superset API logs and adjust payloads for your Superset version.")


if __name__ == "__main__":
    main()
