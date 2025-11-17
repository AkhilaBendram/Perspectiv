FROM python:3.11-slim

# Create app directory inside the container
WORKDIR /app

# Copy requirements first
COPY requirements.txt /app/requirements.txt

# Install packages
RUN pip install --no-cache-dir -r requirements.txt

# Copy the whole backend into the container
COPY . /app

# Expose port
EXPOSE 8001

# Run FastAPI with uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
