#!/bin/bash
cd /home/sylvia/ClaudeWork/TheProgram/backend
source test_venv/bin/activate

# Set CORS origins
export CORS_ORIGINS="http://localhost:3000,http://localhost:3001,http://localhost:5173"

echo "Starting backend with CORS enabled..."
echo "Allowed origins: $CORS_ORIGINS"

# Start uvicorn
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
