#!/usr/bin/env bash
# Urban Air Quality Assistant - Single Command Local Launcher (POSIX Bash)
# Starts FastAPI backend (port 8000) and Vite frontend (port 3000)

set -e

echo "=========================================================="
echo " Starting Urban Air Quality Assistant (Local Dev Server) "
echo "=========================================================="

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

# 1. Verify / Setup Backend Venv
if [ ! -d "$BACKEND_DIR/.venv" ]; then
    echo "[!] Virtual environment not found in backend/.venv. Setting up..."
    cd "$BACKEND_DIR"
    python3 -m venv .venv
    source .venv/bin/activate
    pip install -r requirements.txt
    cd "$ROOT_DIR"
fi

# 2. Verify / Setup Frontend Node Modules
if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    echo "[!] Frontend packages not found. Installing..."
    cd "$FRONTEND_DIR"
    npm install
    cd "$ROOT_DIR"
fi

# Trap SIGINT to kill background processes on exit
cleanup() {
    echo ""
    echo "[*] Shutting down services..."
    kill $(jobs -p) 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "[*] Starting FastAPI Backend on http://127.0.0.1:8000..."
cd "$BACKEND_DIR"
source .venv/bin/activate
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload &
BACKEND_PID=$!

echo "[*] Starting Vite Frontend on http://localhost:3000..."
cd "$FRONTEND_DIR"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "[SUCCESS] Both services launched successfully!"
echo "  - Frontend UI: http://localhost:3000"
echo "  - Backend API: http://127.0.0.1:8000"
echo "  - API Swagger: http://127.0.0.1:8000/docs"
echo ""
echo "Press Ctrl+C to terminate both servers."

wait
