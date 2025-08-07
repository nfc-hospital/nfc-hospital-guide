#!/bin/bash
echo "Starting Django ASGI Server with Daphne..."
cd "$(dirname "$0")"

echo "Activating virtual environment (if exists)..."
# source venv/bin/activate

echo "Starting Daphne ASGI server..."
daphne -b 0.0.0.0 -p 8000 nfc_hospital_system.asgi:application