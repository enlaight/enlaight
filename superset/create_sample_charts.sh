#!/bin/bash

# Wrapper to run the Python Superset sample charts creator
set -e

PYTHON_CMD=${PYTHON_CMD:-python3}
SCRIPT_DIR=$(dirname "$0")

echo "Running Superset sample charts creator (superset/create_sample_charts.py)"
$PYTHON_CMD "$SCRIPT_DIR/create_sample_charts.py"

echo "Superset sample charts script completed."
