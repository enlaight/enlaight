"""
YouScan Mention Collector
-------------------------
Collects mentions for all active topics from the YouScan API over the previous
calendar day and saves the raw JSON to the local filesystem.

Required environment variables (see .env.sample):
  YOUSCAN_API_KEYS      - Comma-separated list of YouScan API keys
  YOUSCAN_URL           - Base URL for the YouScan API
                          (e.g. https://api.youscan.io/api/external/)
  WAREHOUSE_DATABASE_URL - MySQL connection URL for reading active topic IDs
                           (mysql+pymysql://user:pass@host:port/dbname)
  RAW_DATA_DIR          - Local directory where raw JSON files will be written
                          (e.g. ./data/raw)
"""

import os
import sys
import json
import uuid
import traceback
import time as _time
from datetime import datetime, time, timedelta
from pathlib import Path
from urllib.parse import urlparse

import requests
import mysql.connector

# ---------------------------------------------------------------------------
# Configuration — all values from environment variables
# ---------------------------------------------------------------------------

YOUSCAN_API_KEYS = [
    k.strip()
    for k in os.environ.get("YOUSCAN_API_KEYS", "").split(",")
    if k.strip()
]

YOUSCAN_URL = os.environ.get("YOUSCAN_URL", "").rstrip("/") + "/"
WAREHOUSE_DATABASE_URL = os.environ["WAREHOUSE_DATABASE_URL"]
RAW_DATA_DIR = Path(os.environ.get("RAW_DATA_DIR", "./data/raw"))
RAW_DATA_DIR.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------

def get_topics_from_db():
    """Fetch active YouScan topic IDs from the warehouse database."""
    print("[DB] Connecting to warehouse database...")
    connection = None
    try:
        parsed = urlparse(WAREHOUSE_DATABASE_URL)
        connection = mysql.connector.connect(
            host=parsed.hostname,
            user=parsed.username,
            password=parsed.password,
            database=parsed.path[1:],
            port=parsed.port or 3306,
        )
        cursor = connection.cursor()
        print("[DB] Executing query...")
        cursor.execute(
            "SELECT youscan_topic_id FROM youscan_topics WHERE youscan_topic_id <> 0"
        )
        topics = cursor.fetchall()
        print("[DB] Fetched topics from database:", topics)
        topic_ids = [topic[0] for topic in topics if topic[0] is not None]
        print(f"[DB] Found {len(topic_ids)} active topics in database")
        return topic_ids
    except Exception as e:
        print(f"[DB] Failed to get topics: {str(e)}")
        return []
    finally:
        if connection and connection.is_connected():
            cursor.close()
            connection.close()
            print("[DB] Database connection closed")


# ---------------------------------------------------------------------------
# YouScan API helpers
# ---------------------------------------------------------------------------

def get_topics():
    """Return a dict mapping topic_id → {name, query, api_key} for all API keys."""
    topic_dict = {}
    for api_key in YOUSCAN_API_KEYS:
        url = f"{YOUSCAN_URL}topics/?apiKey={api_key}"
        try:
            response = requests.get(url, timeout=30)
            response.raise_for_status()
            for topic in response.json().get("topics", []):
                topic_dict[topic["id"]] = {
                    "name": topic["name"],
                    "query": topic.get("query", ""),
                    "api_key": api_key,
                }
        except requests.exceptions.HTTPError as err:
            print(f"[API] Invalid or unauthorized API key ({api_key[:8]}...): {err}")
    return topic_dict


def get_mentions(topic_id, dt_from, dt_to, since_seq="", size=1000, api_key=None):
    """
    Fetch a single page of mentions for a topic within the given date range.

    Pagination is cursor-based via `sinceSeq` (sequence-ascending order ensures
    stable incremental collection). Returns the parsed JSON on success, or False
    on failure.

    Rate-limit / transient errors (429, 5xx) are retried up to MAX_RETRIES times
    with exponential back-off before giving up.
    """
    MAX_RETRIES = 5
    BACKOFF_BASE = 2  # seconds

    url = (
        f"{YOUSCAN_URL}topics/{topic_id}/mentions/"
        f"?apiKey={api_key}"
        f"&from={dt_from}&to={dt_to}"
        f"&sinceSeq={since_seq}&size={size}&orderBy=seqAsc"
    )

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            response = requests.get(url, timeout=30)

            if response.status_code == 200:
                return response.json()

            if response.status_code == 429 or response.status_code >= 500:
                wait = BACKOFF_BASE ** attempt
                print(
                    f"[API] HTTP {response.status_code} on attempt {attempt}/{MAX_RETRIES} "
                    f"for topic {topic_id}. Retrying in {wait}s..."
                )
                _time.sleep(wait)
                continue

            # Non-retryable error
            print(f"[API] Request failed ({response.status_code}): {response.text}")
            return False

        except requests.exceptions.RequestException as exc:
            wait = BACKOFF_BASE ** attempt
            print(
                f"[API] Network error on attempt {attempt}/{MAX_RETRIES}: {exc}. "
                f"Retrying in {wait}s..."
            )
            _time.sleep(wait)

    print(f"[API] Exhausted retries for topic {topic_id}.")
    return False


# ---------------------------------------------------------------------------
# Main collection loop
# ---------------------------------------------------------------------------

TOPICS_TO_SCAN = get_topics_from_db()
topic_dict = get_topics()

current_datetime = datetime.now()
last_midnight = datetime.combine(datetime.today(), time.min)
previous_midnight = last_midnight - timedelta(days=1)
start_date = previous_midnight.strftime("%Y-%m-%d")
end_date = last_midnight.strftime("%Y-%m-%d")

for topic_id in TOPICS_TO_SCAN:
    try:
        if topic_id not in topic_dict:
            print(f"[SKIP] Topic {topic_id} not found in YouScan API response.")
            continue

        current_topic = topic_dict[topic_id]

        # Validate topic is accessible via history endpoint
        history_url = (
            f"{YOUSCAN_URL}topics/{topic_id}/history"
            f"?apiKey={current_topic['api_key']}"
        )
        session = requests.Session()
        history_resp = session.get(url=history_url, timeout=30)
        history_resp.raise_for_status()

        # Paginated mention collection
        since_seq = ""
        size = 1000
        combined_mentions = []
        keep_collecting = True

        while keep_collecting:
            mentions = get_mentions(
                topic_id=topic_id,
                dt_from=start_date,
                dt_to=end_date,
                since_seq=since_seq,
                size=size,
                api_key=current_topic["api_key"],
            )

            if not mentions:
                raise Exception("Error while collecting mentions — aborting topic.")

            batch = mentions.get("mentions", [])
            combined_mentions.extend(batch)

            if len(batch) < size or len(batch) == 0:
                keep_collecting = False
            else:
                since_seq = combined_mentions[-1]["seq"]

            print(f"[COLLECT] Topic {topic_id}: {len(combined_mentions)} mentions so far")

        # Build export payload
        unique_identifier = uuid.uuid4().hex
        mentions_dict = {
            "topic_id": topic_id,
            "uuid": unique_identifier,
            "collection_datetime": current_datetime.isoformat(),
            "total": len(combined_mentions),
            "topic": current_topic,
            "mentions": combined_mentions,
        }

        # Write to local filesystem
        file_name = f"youscan_mentions_{topic_id}_{start_date}_{unique_identifier}.json"
        output_path = RAW_DATA_DIR / file_name
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(mentions_dict, f, ensure_ascii=False, indent=2)

        print(f"[DONE] Topic {topic_id}: {len(combined_mentions)} mentions saved to {output_path}")

    except Exception:
        print(f"[ERROR] Topic {topic_id}:\n{traceback.format_exc()}")
