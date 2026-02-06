#!/bin/bash

# create_sample_kb.sh - Creates a sample knowledge base with sample text file
set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${BLUE}Running sample KB creation script...${NC}"
echo ""

# Create KB via Django and upload sample document
echo -e "${BLUE}Creating Knowledge Base in Enlaight and uploading sample document...${NC}"
DJANGO_SETTINGS_MODULE="core.settings" PYTHONPATH="../backend/src" python3 create_sample_kb.py

echo ""
echo -e "${GREEN}Sample KB creation completed.${NC}"
