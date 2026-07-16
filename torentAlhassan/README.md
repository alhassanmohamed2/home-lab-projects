# TorrentFlow - Premium Web Downloader

A sleek, web-based torrent downloader built with Node.js, WebTorrent, and Socket.io.

## Features
- **Premium UI**: Modern dark theme with glassmorphism and smooth animations.
- **Real-time Tracking**: Monitor download speeds, progress, and ETA in real-time.
- **Persistence**: Your download list is saved automatically. Resume where you left off.
- **Dockerized**: Easy deployment with Docker Compose.
- **HDD Support**: Map your download folder to any external HDD.

## Quick Start

1. **Configure HDD Path**:
   Open `docker-compose.yml` and find the line:
   ```yaml
   - /path/to/your/hdd/downloads:/downloads
   ```
   Replace `/path/to/your/hdd/downloads` with the absolute path to your HDD folder (e.g., `/media/user/hdd/downloads`).

2. **Run with Docker**:
   ```bash
   docker-compose up -d
   ```

3. **Access the Web Interface**:
   Open your browser and navigate to `http://localhost:8214`.

## Technical Stack
- **Backend**: Node.js, Express, WebTorrent-Hybrid, Socket.io
- **Frontend**: Vanilla HTML5, CSS3 (Google Fonts Outfit), Javascript
- **Container**: Docker, Docker Compose
