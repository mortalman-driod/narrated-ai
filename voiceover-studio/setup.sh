#!/usr/bin/env bash
# Voiceover Studio — one-shot local setup
set -euo pipefail

echo "==> Backend"
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
echo "    Optional engines (recommended):"
echo "      pip install 'kokoro>=0.9'   # fast primary engine"
echo "      pip install 'TTS==0.22.*'   # XTTS v2 voice cloning"
cd ..

echo "==> Frontend"
cd frontend
npm install
cd ..

echo ""
echo "Done. Run in two terminals:"
echo "  cd backend && source .venv/bin/activate && uvicorn app.main:app --reload --port 8000"
echo "  cd frontend && npm run dev"
echo "Then open http://localhost:5173"
