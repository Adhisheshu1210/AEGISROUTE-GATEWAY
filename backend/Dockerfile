# Production GPU Ingestion Base Image
FROM nvcr.io/nvidia/rapidsai/rapidsai:24.04-cuda12.0-py3.10

# Set system environment parameters
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000

# Establish server home directory
WORKDIR /app

# Ingest and cache pipeline dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source repository to workdir
COPY . .

# Expose API runtime port
EXPOSE 8000

# Launch Uvicorn server in optimized production workers config
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
