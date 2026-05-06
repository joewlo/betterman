#!/bin/bash
set -e

echo "============================================"
echo "  Betterman - Starting up"
echo "============================================"

cd "$(dirname "$0")"

# Setup backend
echo ""
echo "[1/3] Installing backend dependencies..."
cd backend
pip install -q -r requirements.txt
cd ..

# Setup frontend
echo "[2/3] Installing frontend dependencies..."
cd frontend
npm install --silent 2>&1 | tail -1
cd ..

# Start backend
echo "[3/3] Starting backend & frontend..."
echo ""

# Start backend in background
cd backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
cd ..

# Start frontend
cd frontend
npx vite --host 0.0.0.0 --port 5173 &
FRONTEND_PID=$!
cd ..

echo ""
echo "============================================"
echo "  Backend:  http://localhost:8000"
echo "  Frontend: http://localhost:5173"
echo "  API Docs: http://localhost:8000/docs"
echo "============================================"
echo ""
echo "Press Ctrl+C to stop both servers"

cleanup() {
    echo ""
    echo "Shutting down..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}
trap cleanup SIGINT SIGTERM

wait
