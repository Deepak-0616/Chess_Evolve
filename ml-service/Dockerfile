# ==============================================================================
# Production Dockerfile for Chess Evolve ML FastAPI Engine
# ==============================================================================

FROM python:3.10-slim

WORKDIR /app

# Install system dependencies including Stockfish engine
RUN apt-get update && apt-get install -y --no-install-recommends \
    stockfish \
    curl \
    ca-certificates \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install PyTorch CPU and Python dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Create non-root application user
RUN useradd -m -u 1000 appuser && \
    mkdir -p /app/artifacts && \
    chown -R appuser:appuser /app

ENV PORT=8000
ENV STOCKFISH_PATH=/usr/games/stockfish
ENV MODEL_STORAGE_PATH=/app/artifacts
ENV PYTHONUNBUFFERED=1

COPY app ./app

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
