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
import traceback

# to be reviewed

SUPERSET_URL = os.environ.get("SUPERSET_BASE_URL", "http://localhost:8088")
SUPERSET_USERNAME = os.environ.get("SUPERSET_DB_USER", "admin")
SUPERSET_PASSWORD = os.environ.get("SUPERSET_DB_PASSWORD", "admin")
SUPERSET_DB_NAME = os.environ.get("SUPERSET_DB_NAME", "superset_database")
SUPERSET_TABLE = os.environ.get("SUPERSET_TABLE", "assistants_analytics")  # e.g. authentication_chatsession

if not SUPERSET_URL:
    print("SUPERSET_URL not set. Please set env var SUPERSET_URL (e.g. http://localhost:8088)")
    sys.exit(1)
if not SUPERSET_USERNAME or not SUPERSET_PASSWORD:
    print("SUPERSET_USERNAME and SUPERSET_PASSWORD must be set to authenticate to Superset API")
    sys.exit(1)

session = requests.Session()

# Debug flag to enable verbose output
DEBUG = os.environ.get("DEBUG_SAMPLE_CHARTS", "0").lower() in ("1", "true", "yes")

def log_debug(*args, **kwargs):
    if DEBUG:
        print("[create_sample_charts]", *args, **kwargs)

def safe_request(method: str, url: str, **kwargs) -> Optional[requests.Response]:
    """Wrapper around session.request that captures exceptions and prints useful debug info."""
    try:
        log_debug(f"Request: {method} {url} kwargs={{{', '.join(k for k in kwargs.keys())}}}")
        resp = session.request(method, url, timeout=30, **kwargs)
    except Exception as exc:
        print(f"Request error for {method} {url}: {exc}")
        if DEBUG:
            traceback.print_exc()
        return None

    log_debug(f"Response status: {resp.status_code} for {method} {url}")
    if DEBUG:
        # try to show a safe preview of the response body
        text = None
        try:
            text = resp.text
        except Exception:
            text = '<unreadable response body>'
        preview = text[:2000] if text is not None else ''
        print(f"Response preview (first 2000 chars):\n{preview}\n---end preview---")

    return resp

def superset_login(url: str, username: str, password: str) -> Optional[str]:
    """Attempt to log in and return access token (or None)."""
    login_url = f"{url.rstrip('/')}/api/v1/security/login"
    payload = {
        "username": username,
        "password": password,
        "provider": "db"
    }
    headers = {"Content-Type": "application/json"}
    print(login_url, payload, headers)

    resp = safe_request("POST", login_url, json=payload, headers=headers)
    if resp is None:
        print("Login request failed (no response).")
        return None
    if resp.status_code not in (200, 201):
        text = resp.text if resp is not None else '<no response body>'
        print(f"Login failed: {resp.status_code} - {text}")
        return None
    try:
        data = resp.json()
    except Exception:
        print("Login succeeded but response JSON could not be decoded:", resp.text[:2000])
        return None
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
    resp = safe_request("GET", dbs_url)
    if resp is None:
        print("Failed to query Superset databases (no response).")
        return None
    if resp.status_code != 200:
        print(f"Failed to query databases: {resp.status_code} - {resp.text}")
        return None
    try:
        data = resp.json()
    except Exception:
        print("Failed to parse databases response as JSON:", resp.text[:2000])
        return None
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
    resp = safe_request("GET", list_url, params={"q": json.dumps({"filters": []})})
    if resp is None:
        print("Failed to list datasets (no response).")
        return None
    if resp.status_code != 200:
        print(f"Failed to list datasets: {resp.status_code} - {resp.text}")
        return None
    try:
        results = resp.json().get("result") or resp.json().get("result", [])
    except Exception:
        print("Failed to parse datasets list response as JSON:", resp.text[:2000])
        return None
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
    log_debug(f"Creating dataset with payload: {payload}")
    resp = safe_request("POST", create_url, json=payload)
    if resp is None:
        print("Failed to create dataset (no response).")
        return None
    if resp.status_code in (200, 201):
        try:
            j = resp.json()
        except Exception:
            print("Dataset created but response JSON invalid:", resp.text[:2000])
            return None
        return j.get("id") or j.get("result", {}).get("id")
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
    log_debug(f"Creating chart '{slice_name}' ({viz_type}) payload: {payload}")
    resp = safe_request("POST", create_url, json=payload)
    if resp and resp.status_code in (200, 201):
        print(f"Created chart {slice_name} ({viz_type})")
        return True
    # Try with dataset_id field
    resp2 = safe_request("POST", create_url, json=payload_alias)
    if resp2 and resp2.status_code in (200, 201):
        print(f"Created chart {slice_name} ({viz_type})")
        return True

    # If we get here, both attempts failed — print useful diagnostics
    if resp is not None:
        print(f"Failed to create chart {slice_name} with datasource_id: {resp.status_code} - {resp.text}")
    if resp2 is not None:
        print(f"Failed to create chart {slice_name} with dataset_id: {resp2.status_code} - {resp2.text}")
    return False


def main():

    print("i am here!")


    token = superset_login(SUPERSET_URL, SUPERSET_USERNAME, SUPERSET_PASSWORD)
    print(token)
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
