FROM python:3.10-slim

WORKDIR /app

# Install ping and dependencies required for playwright
RUN apt-get update && apt-get install -y iputils-ping \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first to leverage Docker cache
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install Playwright dependencies (chromium)
RUN playwright install --with-deps chromium

# Copy the rest of the application
COPY . .

# Expose the requested port
EXPOSE 8745

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8745"]
