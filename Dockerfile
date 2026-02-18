# ─── Stage 1: Build frontend ──────────────────────────────────────────────────
FROM node:20-alpine AS frontend-builder

WORKDIR /build/frontend

# Install deps (cached layer)
COPY frontend/package*.json ./
RUN npm ci --silent

# Copy source and build with web-compatible asset paths
COPY frontend/ ./
ENV BUILD_TARGET=web
RUN npm run build


# ─── Stage 2: Python runtime ──────────────────────────────────────────────────
FROM python:3.11-slim

WORKDIR /app

# System packages needed by pyswisseph and faster-whisper
RUN apt-get update && apt-get install -y --no-install-recommends \
        gcc \
        g++ \
    && rm -rf /var/lib/apt/lists/*

# Python dependencies (cached layer — only rebuilds when requirements change)
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt \
    && apt-get purge -y --auto-remove gcc g++ 2>/dev/null || true

# Application code
COPY backend/ ./backend/

# Built frontend from Stage 1
COPY --from=frontend-builder /build/frontend/dist ./dist

# ── Runtime configuration ──────────────────────────────────────────────────────
ENV PYTHONPATH=/app
ENV APP_ENV=production
ENV DEBUG=false
# Tell the backend where the built frontend lives
ENV FRONTEND_DIST=/app/dist
# Swiss Ephemeris extended data (bundled in the image)
ENV EPHEMERIS_PATH=/app/backend/data/ephemeris

WORKDIR /app/backend

EXPOSE 8000

# Single worker — SQLite doesn't support concurrent writes across workers
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
