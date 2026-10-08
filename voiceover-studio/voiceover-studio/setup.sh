#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
engine=piper
with_xtts=false
accept_xtts=false
skip_models=false
skip_frontend=false
while (($#)); do
  case "$1" in
    --engine) engine="${2:?Expected piper, kokoro, or both}"; shift 2 ;;
    --with-xtts) with_xtts=true; shift ;;
    --accept-xtts-license) accept_xtts=true; shift ;;
    --skip-models) skip_models=true; shift ;;
    --skip-frontend) skip_frontend=true; shift ;;
    *) echo "Unknown argument: $1" >&2; exit 2 ;;
  esac
done
case "$engine" in piper|kokoro|both) ;; *) echo 'Engine must be piper, kokoro, or both' >&2; exit 2 ;; esac
if $with_xtts && ! $accept_xtts; then
  echo 'Read the XTTS non-commercial model/output license in README, then pass --accept-xtts-license if you accept it.' >&2
  exit 2
fi
command -v ffmpeg >/dev/null || { echo 'Install ffmpeg first (see README).' >&2; exit 1; }
command -v ffprobe >/dev/null || { echo 'Install ffprobe first (see README).' >&2; exit 1; }
if [[ ! -f backend/.venv/bin/python ]]; then
  if command -v uv >/dev/null; then uv venv --python 3.11 backend/.venv
  else python3.11 -m venv backend/.venv; fi
fi
python_exe="$PWD/backend/.venv/bin/python"
install_packages() {
  if command -v uv >/dev/null; then uv pip install --python "$python_exe" "$@"
  else "$python_exe" -m pip install "$@"; fi
}
extras='dev,queue,piper'
if [[ "$engine" != piper ]]; then extras+=',kokoro'; fi
if $with_xtts; then extras+=',xtts'; fi
install_packages -e "./backend[$extras]"
if [[ "$engine" != piper ]]; then
  install_packages 'https://github.com/explosion/spacy-models/releases/download/en_core_web_sm-3.8.0/en_core_web_sm-3.8.0-py3-none-any.whl'
fi
if ! $skip_models; then
  "$python_exe" scripts/download_models.py --engine piper
  if [[ "$engine" != piper ]]; then "$python_exe" scripts/download_models.py --engine kokoro; fi
  if $with_xtts; then "$python_exe" scripts/download_models.py --engine xtts --accept-xtts-license; fi
fi
if ! $skip_frontend; then
  command -v npm >/dev/null || { echo 'Install Node.js/npm or pass --skip-frontend.' >&2; exit 1; }
  (cd frontend; if [[ -f package-lock.json ]]; then npm ci; else npm install; fi; npm run build)
fi
"$python_exe" scripts/preflight.py
echo 'Setup finished. Start: backend/.venv/bin/python -m uvicorn studio.api:app --app-dir backend --host 127.0.0.1 --port 8000'
