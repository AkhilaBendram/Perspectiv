FROM python:3.11-slim

WORKDIR /app

# Copy backend requirements from correct path
COPY backend/requirements.txt /app/requirements.txt

RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend /app

ENV LOG_LEVEL=INFO

# Render ignores EXPOSE, but it's fine
EXPOSE 8000

# Use shell CMD so $PORT expands correctly
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port $PORT"]
