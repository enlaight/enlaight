#!/usr/bin/env python3
"""
Script to create a sample Knowledge Base (KB) in the Enlaight application.

This script:
1. Connects to the backend database to fetch an existing project
2. Creates a KB via the Django API using the KB creation logic
3. Optionally uploads sample files to the KB

Usage:
    python3 create_sample_kb.py
"""

import os
import sys
import django
import uuid
import requests
from pathlib import Path

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
# Ensure project src is on path (backend/src)
backend_src = os.path.join(os.path.dirname(__file__), '..', 'backend', 'src')
sys.path.insert(0, backend_src)
django.setup()

from django.conf import settings
from authentication.models.projects import Projects
from authentication.models.kb import KBLink


def create_sample_kb():
    """Create a sample Knowledge Base."""
    
    print("=" * 60)
    print("CREATING SAMPLE KNOWLEDGE BASE")
    print("=" * 60)
    print()
    
    # Step 1: Fetch an existing project (or create one for testing)
    print("Step 1: Fetching/creating a project...")
    try:
        project = Projects.objects.first()
        if not project:
            print("  ⚠ Warning: No projects found in database.")
            print("  Please run backend population script first.")
            return False
        print(f"  ✓ Using project: {project.name} (ID: {project.id})")
    except Exception as e:
        print(f"  ✗ Error fetching project: {e}")
        return False
    
    print()
    
    # Step 2: Call the n8n webhook to create KB
    print("Step 2: Creating Knowledge Base via n8n webhook...")
    
    n8n_base_url = settings.N8N_BASE_URL
    n8n_key = getattr(settings, 'N8N_KB_CREATE_KEY', settings.N8N_KB_KEY)
    
    if not n8n_base_url or not n8n_key:
        print("  ⚠ Warning: N8N_BASE_URL or N8N_KB_KEY not configured.")
        print("  Please set these environment variables before running this script.")
        return False
    
    kb_name = "Sample Knowledge Base"
    kb_description = "A sample knowledge base created automatically with sample documents."
    
    payload = {
        "name": kb_name,
        "description": kb_description,
    }
    
    headers = {
        "key": n8n_key,
        "Content-Type": "application/json",
    }
    
    try:
        url = f"{n8n_base_url}/webhook/kb/create/"
        print(f"  POST {url}")
        response = requests.post(url, headers=headers, json=payload, timeout=30)
        response.raise_for_status()
        data = response.json()
        print(f"  ✓ KB created successfully")
    except requests.Timeout:
        print(f"  ✗ Timeout calling n8n service")
        return False
    except requests.RequestException as e:
        print(f"  ✗ Error calling n8n service: {e}")
        return False
    
    # Extract KB external_id
    ext_id = (
        data.get("hash_id")
        or data.get("id")
        or (data.get("data") or {}).get("hash_id")
        or (data.get("kb") or {}).get("id")
    )
    
    if not ext_id:
        print(f"  ✗ No KB identifier in response: {data}")
        return False
    
    print(f"  ✓ KB hash_id: {ext_id}")
    print()
    
    # Step 3: Create KB link in the database
    print("Step 3: Registering KB link in database...")
    try:
        link, created = KBLink.objects.get_or_create(
            project_id=project.id,
            external_id=ext_id,
            defaults={"name": kb_name}
        )
        status = "Created" if created else "Already exists"
        print(f"  ✓ {status}: KBLink (ID: {link.id})")
        print(f"    - Project: {project.name}")
        print(f"    - External ID: {ext_id}")
        print(f"    - Name: {link.name}")
    except Exception as e:
        print(f"  ✗ Error creating KB link: {e}")
        return False
    
    print()
    
    # Step 4: Upload sample document if it exists
    print("Step 4: Uploading sample document...")
    sample_files_dir = Path(__file__).parent
    sample_file = sample_files_dir / "sample_document.txt"
    
    if sample_file.exists():
        print(f"  Found: {sample_file.name}")
        try:
            url = f"{n8n_base_url}/webhook/kb/file/add/"
            headers_file = {"key": n8n_key}
            
            with open(sample_file, "rb") as f:
                files = {
                    "file": (sample_file.name, f, "text/plain"),
                }
                data_form = {"hash_id": ext_id}
                
                print(f"  Uploading to KB...")
                response = requests.post(
                    url,
                    headers=headers_file,
                    files=files,
                    data=data_form,
                    timeout=60
                )
                response.raise_for_status()
                print(f"  ✓ File uploaded successfully")
        except requests.Timeout:
            print(f"  ⚠ Timeout uploading file (file may still be processing)")
        except requests.RequestException as e:
            print(f"  ⚠ Error uploading file: {e}")
    else:
        print(f"  ⚠ Sample document not found at {sample_file}")
    
    print()
    print("=" * 60)
    print("✓ KNOWLEDGE BASE CREATION COMPLETED")
    print("=" * 60)
    print()
    print(f"Knowledge Base Details:")
    print(f"  Name: {kb_name}")
    print(f"  Description: {kb_description}")
    print(f"  Hash ID: {ext_id}")
    print(f"  Project: {project.name}")
    print()
    
    return True


if __name__ == "__main__":
    try:
        success = create_sample_kb()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n⚠ Script interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n✗ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
