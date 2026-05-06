#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cleanup() {
    echo ""
    echo "Shutting down..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

echo ""
echo "  Betterman — starting up"
echo "  ======================"
echo ""

# Backend
echo "[backend] installing dependencies..."
cd "$PROJECT_DIR/backend"
pip install -q -r requirements.txt 2>&1 | tail -1

echo "[backend] starting on http://localhost:8000"
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# Frontend
echo "[frontend] installing dependencies..."
cd "$PROJECT_DIR/frontend"
npm install --silent 2>&1 | tail -1

echo "[frontend] starting on http://localhost:5173"
npx vite --host 0.0.0.0 --port 5173 &
FRONTEND_PID=$!

echo ""
echo "  Backend  → http://localhost:8000"
echo "  Frontend → http://localhost:5173"
echo "  Docs     → http://localhost:8000/docs"
echo ""
echo "  Press Ctrl+C to stop"
echo ""

wait
