#!/bin/bash

# create_defaults - runs KB creation, DB population and Superset sample chart creation
set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
NC='\033[0m'

# Run n8n sample KB creation first
if [ -f "n8n/create_sample_kb.sh" ]; then
  echo -e "${BLUE}Running n8n sample KB creation script...${NC}"
  bash n8n/create_sample_kb.sh
  echo -e "${GREEN}N8N KB creation completed.${NC}"
  echo ""
else
  echo -e "${BLUE}N8N KB creation script not found at n8n/create_sample_kb.sh. Skipping.${NC}"
  echo ""
fi

# Run DB Population script
echo -e "${BLUE}Running backend data population script...${NC}"
cd backend
DJANGO_SETTINGS_MODULE="core.settings" PYTHONPATH="./src" python populate_db.py
cd ..

echo -e "${GREEN}Backend population completed.${NC}"

# Run Superset sample charts creator
if [ -f "superset/create_sample_charts.sh" ]; then
  echo -e "${BLUE}Running Superset sample charts script...${NC}"
  bash superset/create_sample_charts.sh
  echo -e "${GREEN}Superset sample charts script finished.${NC}"
else
  echo -e "${BLUE}Superset script not found at superset/create_sample_charts.sh. Skipping.${NC}"
fi

echo -e "${GREEN}create_defaults completed.${NC}"
