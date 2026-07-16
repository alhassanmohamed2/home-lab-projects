# STAGE 1: Build Frontend
FROM node:18-alpine as frontend-build
WORKDIR /app/frontend
COPY frontend/package.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# STAGE 2: Build Backend & Serve
FROM python:3.9-slim

WORKDIR /app

# Install backend dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/main.py .

# Copy built frontend assets from Stage 1 to a 'static' folder
COPY --from=frontend-build /app/frontend/dist ./static

# Create a data directory (we will mount the host files here)
RUN mkdir /data

# Expose the requested port
EXPOSE 8059

# Run the server on port 8059
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8059"]