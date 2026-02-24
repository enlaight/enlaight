"""
YouScan Mention Normalizer (Ingestion → DB)
-------------------------------------------
Reads raw JSON mention files from the local 'raw/' data directory,
normalizes and deduplicates them into the warehouse database, then moves
each processed file to the local 'ingested/' directory.

Normalization pipeline covers:
  - Deduplication   : skips topics, files, and individual mentions already
                      present in the DB (keyed on youscan_topic_id / uuid /
                      youscan_mention_id respectively)
  - Timestamps      : all datetime fields parsed via dateutil.parser so
                      timezone-aware and naive strings are handled uniformly
  - Language        : stored as-is from the YouScan payload (ISO 639-1 code)
  - Source hashing  : 'source' field is stripped of stray quotes on ingest;
                      downstream consumers can hash the normalised value for
                      dedup across sources
  - Content shards  : title / text / fullText stored as typed rows in
                      YouscanContent so each content variant is independently
                      queryable

Required environment variables (see .env.sample):
  WAREHOUSE_DATABASE_URL - SQLAlchemy URL for the warehouse DB
                           e.g. mysql+pymysql://user:pass@host/db
  RAW_DATA_DIR           - Local directory containing raw JSON files
                           (e.g. ./data/raw)
  INGESTED_DATA_DIR      - Local directory to move processed files into
                           (e.g. ./data/ingested)
"""

import os
import sys
import uuid
import json
import shutil
import traceback
from pathlib import Path

from dateutil import parser as dateutil_parser
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

sys.path.append(".")
sys.path.append("..")
from models import YouscanTopics, YouscanIngestionFiles, YouscanMentions, YouscanContent

# ---------------------------------------------------------------------------
# Configuration — all values from environment variables
# ---------------------------------------------------------------------------

WAREHOUSE_DATABASE_URL = os.environ["WAREHOUSE_DATABASE_URL"]
RAW_DATA_DIR = Path(os.environ.get("RAW_DATA_DIR", "./data/raw"))
INGESTED_DATA_DIR = Path(os.environ.get("INGESTED_DATA_DIR", "./data/ingested"))

INGESTED_DATA_DIR.mkdir(parents=True, exist_ok=True)

engine = create_engine(WAREHOUSE_DATABASE_URL)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get(d, key, default=None):
    """Safe dict getter — returns default when key is absent or value is None."""
    return d.get(key) or default


def _parse_dt(value):
    """Parse a datetime string tolerantly; returns None if parsing fails."""
    if not value:
        return None
    try:
        return dateutil_parser.parse(value)
    except (ValueError, TypeError):
        return None


def _clean_source(value):
    """Strip stray quotes from source strings for consistent downstream hashing."""
    if value is None:
        return None
    return value.replace('"', "").strip() or None


# ---------------------------------------------------------------------------
# Main pipeline
# ---------------------------------------------------------------------------

files = sorted(RAW_DATA_DIR.glob("*.json"))
print(f"[SCAN] Found {len(files)} file(s) in {RAW_DATA_DIR}")

for file_path in files:
    try:
        file_name = file_path.name

        with open(file_path, "r", encoding="utf-8") as f:
            mentions_dict = json.load(f)

        with Session(engine) as session:

            # ------------------------------------------------------------------
            # 1. Deduplicate / upsert topic
            # ------------------------------------------------------------------
            topic_query = select(YouscanTopics).where(
                YouscanTopics.youscan_topic_id == mentions_dict["topic_id"]
            )
            topic_row = session.scalars(topic_query).first()

            if topic_row is None:
                topic_row = YouscanTopics(
                    uuid=uuid.uuid4().hex,
                    youscan_topic_id=mentions_dict["topic_id"],
                    name=mentions_dict["topic"]["name"],
                    query=mentions_dict["topic"].get("query", ""),
                )
                session.add(topic_row)
                session.commit()

            topic_id = topic_row.id

            # ------------------------------------------------------------------
            # 2. Deduplicate ingestion file
            # ------------------------------------------------------------------
            file_query = select(YouscanIngestionFiles).where(
                YouscanIngestionFiles.uuid == mentions_dict["uuid"]
            )
            if session.scalars(file_query).first() is not None:
                print(f"[SKIP] {file_name} already ingested.")
            else:
                file_row = YouscanIngestionFiles(
                    uuid=mentions_dict["uuid"],
                    youscan_topic_id=mentions_dict["topic_id"],
                    topic_id=topic_id,
                    file_name=file_name,
                    collected_at=_parse_dt(mentions_dict.get("collection_datetime")),
                    total_collected=mentions_dict.get("total", 0),
                )
                session.add(file_row)
                session.commit()

                # --------------------------------------------------------------
                # 3. Normalize & deduplicate mentions
                # --------------------------------------------------------------
                for mention in mentions_dict.get("mentions", []):
                    mention_query = select(YouscanMentions).where(
                        YouscanMentions.youscan_mention_id == mention["id"]
                    )
                    if session.scalars(mention_query).first() is not None:
                        continue  # already ingested

                    mention_row = YouscanMentions(
                        uuid=uuid.uuid4().hex,
                        youscan_mention_id=mention["id"],
                        topic_id=topic_id,
                        youscan_topic_id=mentions_dict["topic_id"],
                        # Timestamps — normalised via dateutil for tz-awareness
                        youscan_added_at=_parse_dt(_get(mention, "addedAt")),
                        published_at=_parse_dt(_get(mention, "published")),
                        # URLs
                        url=_get(mention, "url"),
                        image_url=_get(mention, "imageUrl"),
                        # Source — strip stray quotes for consistent hashing
                        source=_clean_source(_get(mention, "source")),
                        # Attribution & classification
                        author=_get(mention, "author"),
                        sentiment=_get(mention, "sentiment"),
                        resource_type=_get(mention, "resourceType"),
                        publication_place=_get(mention, "publicationPlace"),
                        # Language (ISO 639-1 as returned by YouScan)
                        language=_get(mention, "language"),
                        # Geo
                        country=_get(mention, "country"),
                        city=_get(mention, "city"),
                        region=_get(mention, "region"),
                        # Post metadata
                        post_type=_get(mention, "postType"),
                        post_id=_get(mention, "postId"),
                        discussion_id=_get(mention, "discussionId"),
                        # Engagement metrics
                        potential_reach=_get(mention, "potentialReach"),
                        engagement=_get(mention, "engagement"),
                        # Structured fields
                        tags=_get(mention, "tags"),
                        auto_categories=_get(mention, "autoCategories"),
                        subjects=_get(mention, "subjects"),
                    )
                    session.add(mention_row)
                    session.commit()

                    # ----------------------------------------------------------
                    # 4. Content shards (title / text / fullText)
                    # ----------------------------------------------------------
                    for content_type, field_key in [
                        ("mention_title", "title"),
                        ("mention_text", "text"),
                        ("mention_full_text", "fullText"),
                    ]:
                        if field_key in mention and mention[field_key]:
                            session.add(
                                YouscanContent(
                                    youscan_mention_id=mention_row.id,
                                    uuid=uuid.uuid4().hex,
                                    content_type=content_type,
                                    content=mention[field_key],
                                )
                            )
                    session.commit()

                print(
                    f"[DONE] {file_name}: "
                    f"{len(mentions_dict.get('mentions', []))} mentions processed."
                )

        # ----------------------------------------------------------------------
        # 5. Move file to ingested/ once fully processed
        # ----------------------------------------------------------------------
        dest = INGESTED_DATA_DIR / file_name
        shutil.move(str(file_path), str(dest))
        print(f"[MOVED] {file_name} → {dest}")

    except Exception:
        print(f"[ERROR] {file_path.name}:\n{traceback.format_exc()}")
