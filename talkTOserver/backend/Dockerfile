FROM python:3.11-slim

# Install ffmpeg and pulseaudio client
RUN apt-get update && apt-get install -y \
    ffmpeg \
    pulseaudio-utils \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Environment variable to tell PulseAudio where to look for the socket
# This will be overridden or complemented by docker-compose mappings
ENV PULSE_SERVER=unix:/run/user/1000/pulse/native

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
