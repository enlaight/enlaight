#!/bin/sh

set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if backend container is running
check_backend_running() {
    docker compose ps backend --format "{{.State}}" 2>/dev/null | grep -q "running"
}

echo -e "${BLUE}=== Enlaight Defaults Setup ===${NC}"
echo ""

# Verify backend is running
if ! check_backend_running; then
    echo -e "${YELLOW}Backend container is not running. Please start services with 'docker compose up' first.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Backend container is running${NC}"
echo ""

# Run n8n sample KB creation first
if [ -f "n8n/create_sample_kb.py" ]; then
  echo -e "${BLUE}Running n8n sample KB creation...${NC}"

  N8N_OK=false

  if docker compose exec -T backend python /app/n8n/create_sample_kb.py 2>/dev/null; then
    N8N_OK=true
  else
    echo -e "${YELLOW}Warning: Could not run n8n KB creation in container. Trying from host...${NC}"
    if python /app/n8n/create_sample_kb.py 2>/dev/null; then
      N8N_OK=true
    fi
  fi

  if [ "$N8N_OK" = true ]; then
    echo -e "${GREEN}N8N KB creation completed.${NC}"
  else
    echo -e "${YELLOW}N8N KB creation skipped.${NC}"
  fi

  echo ""
else
  echo -e "${YELLOW}N8N KB creation script not found at n8n/create_sample_kb.py. Skipping.${NC}"
  echo ""
fi


# Run DB Population script
echo -e "${BLUE}Running backend data population...${NC}"
if [ -f "backend/scripts/populate_db.py" ]; then
  docker compose exec -T backend sh -c \
    "DJANGO_SETTINGS_MODULE='core.settings' PYTHONPATH='/src' python /scripts/populate_db.py"
  echo -e "${GREEN}Backend population completed.${NC}"
  echo ""
else
  echo -e "${YELLOW}Backend population script not found at /scripts/populate_db.py. Skipping.${NC}"
  echo ""
fi

# Run Superset sample charts creator
# if [ -f "superset/create_sample_charts.py" ]; then
#   echo -e "${BLUE}Running Superset sample charts creation...${NC}"
#   docker compose exec -T backend python superset/create_sample_charts.py 2>/dev/null || {
#     echo -e "${YELLOW}Warning: Could not run Superset charts in container. Trying from host...${NC}"
#     python superset/create_sample_charts.py 2>/dev/null || echo -e "${YELLOW}Skipped Superset charts creation${NC}"
#   }
#   echo -e "${GREEN}Superset sample charts creation finished.${NC}"
# else
#   echo -e "${YELLOW}Superset creation script not found at superset/create_sample_charts.py. Skipping.${NC}"
# fi

echo ""
echo -e "${GREEN}create_defaults completed.${NC}"
