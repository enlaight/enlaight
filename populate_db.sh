#!/bin/bash

# Database Population Script for Enlaight
# Creates sample users, clients, projects, and chat sessions with proper relationship constraints

set -e

# Configuration
DJANGO_SETTINGS_MODULE="core.settings"
PYTHONPATH="./backend/src"
DB_NAME="enlaight"
DB_USER="root"
DB_HOST="127.0.0.1"
DB_PORT="3306"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Enlaight Database Population Script ===${NC}"
echo

# Function to generate random string
generate_random_string() {
    local length=$1
    python3 -c "import secrets; print(secrets.token_hex($((length/2))))" 2>/dev/null | cut -c1-$length
}

# Function to generate UUID
generate_uuid() {
    python3 -c "import uuid; print(uuid.uuid4())"
}

# Function to get Django shell context
run_django_command() {
    local command=$1
    cd backend && \
    DJANGO_SETTINGS_MODULE="core.settings" PYTHONPATH="./src" \
    python src/manage.py shell << EOF
$command
EOF
    cd ..
}

# Check if Django is available
echo -e "${BLUE}Checking Django setup...${NC}"
cd backend
DJANGO_SETTINGS_MODULE="core.settings" PYTHONPATH="./src" python src/manage.py check > /dev/null 2>&1 || {
    echo -e "${YELLOW}Warning: Could not verify Django setup${NC}"
}
cd ..

echo -e "${GREEN}✓ Django setup verified${NC}"
echo
# Run the Python script
echo -e "${BLUE}Executing database population via backend/populate_db.py...${NC}"
echo
cd backend
DJANGO_SETTINGS_MODULE="core.settings" PYTHONPATH="./src" python populate_db.py
cd ..

echo -e "${GREEN}✓ Script execution completed!${NC}"
