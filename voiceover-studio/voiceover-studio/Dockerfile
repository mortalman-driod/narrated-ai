FROM node:22-bookworm-slim AS frontend
WORKDIR /build/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.11-slim-bookworm AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app/backend \
    STUDIO_DATA_DIR=/app/data \
    HF_HUB_OFFLINE=1 \
    TRANSFORMERS_OFFLINE=1
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg espeak-ng libsndfile1 \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY backend/ ./backend/
# Default image is the small CPU runtime. Use --build-arg ENGINE_EXTRAS=piper,kokoro,queue
# to include the optional Kokoro stack. CUDA needs a matching PyTorch base/build.
ARG ENGINE_EXTRAS=piper,queue
RUN pip install --no-cache-dir "./backend[${ENGINE_EXTRAS}]" \
    && if echo "$ENGINE_EXTRAS" | grep -q kokoro; then \
       pip install --no-cache-dir https://github.com/explosion/spacy-models/releases/download/en_core_web_sm-3.8.0/en_core_web_sm-3.8.0-py3-none-any.whl; fi
COPY scripts/ ./scripts/
COPY --from=frontend /build/frontend/dist ./frontend/dist/
RUN mkdir -p /app/data
EXPOSE 8000
CMD ["python", "-m", "uvicorn", "studio.api:app", "--host", "0.0.0.0", "--port", "8000"]
