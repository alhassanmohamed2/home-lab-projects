import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import WebTorrent from 'webtorrent';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs-extra';

// ── Global Crash Protection ──────────────────────────────────────────────────
// WebTorrent v2 client.remove() throws via rejected promises.
// Without these handlers, Node.js dies on every pause/delete.
process.on('uncaughtException', (err) => {
  console.error('[CRASH PREVENTED] Uncaught Exception:', err.message);
});
process.on('unhandledRejection', (reason) => {
  console.error('[CRASH PREVENTED] Unhandled Rejection:', reason?.message || reason);
});

// ── Setup ────────────────────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

const PORT = process.env.PORT || 8214;
const DOWNLOAD_PATH = process.env.DOWNLOAD_PATH || path.join(__dirname, 'downloads');
const STATE_FILE = path.join(__dirname, 'data', 'torrents.json');

fs.ensureDirSync(DOWNLOAD_PATH);
fs.ensureDirSync(path.dirname(STATE_FILE));

// Serve static files FIRST so the app loads even if engine is slow
app.use(express.static(path.join(__dirname, 'public')));

// Debug endpoint to check raw engine state
app.get('/api/debug', (req, res) => {
  const engineTorrents = client.torrents.map(t => ({
    infoHash: t.infoHash,
    name: t.name,
    progress: t.progress,
    downloaded: t.downloaded,
    length: t.length,
    downloadSpeed: t.downloadSpeed,
    numPeers: t.numPeers,
    ready: t.ready,
    paused: t.paused,
    timeRemaining: t.timeRemaining
  }));
  const state = torrentsState.map(s => ({
    infoHash: s.infoHash,
    name: s.name,
    progress: s.progress,
    paused: s.paused,
    length: s.length
  }));
  res.json({ engine: engineTorrents, state: state });
});

// Well-known public trackers to inject into every torrent for better peer discovery
const PUBLIC_TRACKERS = [
  'udp://tracker.opentrackr.org:1337/announce',
  'udp://open.stealth.si:80/announce',
  'udp://tracker.torrent.eu.org:451/announce',
  'udp://tracker.bittor.pw:1337/announce',
  'udp://public.popcorn-tracker.org:6969/announce',
  'udp://tracker.dler.org:6969/announce',
  'udp://exodus.desync.com:6969/announce',
  'udp://open.demonii.com:1337/announce',
  'udp://explodie.org:6969/announce',
  'udp://tracker.coppersurfer.tk:6969/announce',
  'udp://tracker.leechers-paradise.org:6969/announce',
  'udp://9.rarbg.to:2710/announce',
  'udp://tracker.pirateparty.gr:6969/announce',
  'udp://tracker.cyberia.is:6969/announce'
];

const client = new WebTorrent();

// ── State Management ─────────────────────────────────────────────────────────
let torrentsState = [];
const processingIds = new Set();

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const data = fs.readJsonSync(STATE_FILE);
      if (Array.isArray(data)) return data;
    }
  } catch (err) {
    console.error('Error loading state:', err.message);
  }
  return [];
}

function saveState() {
  try {
    const data = torrentsState.map(t => ({
      magnet: t.magnet,
      name: t.name || 'Unknown Torrent',
      infoHash: t.infoHash,
      paused: !!t.paused,
      progress: typeof t.progress === 'number' ? t.progress : 0,
      length: t.length || 0,
      addedAt: t.addedAt || new Date().toISOString()
    }));
    fs.writeJsonSync(STATE_FILE, data);
  } catch (err) {
    console.error('Error saving state:', err.message);
  }
}

// ── Helper: safely remove a torrent from the engine ──────────────────────────
// WebTorrent v2's client.get() returns a Promise, NOT the torrent object.
// We MUST use client.torrents.find() to get the actual torrent synchronously.
function getActiveTorrent(infoHash) {
  if (!infoHash) return null;
  return client.torrents.find(t => t.infoHash === infoHash) || null;
}

async function safeEngineRemove(infoHash) {
  const torrent = getActiveTorrent(infoHash);
  if (!torrent) return; // not in engine, nothing to do

  return new Promise((resolve) => {
    try {
      // Try to destroy the torrent directly (most reliable)
      torrent.destroy({ destroyStore: false }, (err) => {
        if (err) console.error('Engine destroy callback error:', err.message);
        resolve();
      });
    } catch (e) {
      console.error('Engine destroy sync error:', e.message);
      resolve();
    }
  }).catch((err) => {
    console.error('Engine destroy promise error:', err.message);
  });
}

// ── Helper: extract infoHash from magnet URI ─────────────────────────────────
function extractInfoHash(input) {
  if (!input) return null;
  if (input.startsWith('magnet:')) {
    const match = input.match(/btih:([a-fA-F0-9]{40}|[a-zA-Z2-7]{32})/);
    return match ? match[1].toLowerCase() : null;
  }
  return input;
}

// ── Add Torrent ──────────────────────────────────────────────────────────────
function addTorrent(input, shouldSave = true, startPaused = false) {
  try {
    const infoHash = extractInfoHash(input);

    // Find or create state entry
    let entry = torrentsState.find(t =>
      (t.infoHash && t.infoHash === infoHash) || t.magnet === input
    );

    if (!entry) {
      entry = {
        magnet: input,
        infoHash: infoHash,
        name: 'Fetching metadata...',
        paused: startPaused,
        progress: 0,
        length: 0,
        addedAt: new Date().toISOString()
      };
      torrentsState.push(entry);
    }

    if (startPaused) {
      entry.paused = true;
      if (shouldSave) saveState();
      broadcastUpdate();
      return;
    }

    // If already in engine, just sync state with the existing handle
    const existing = infoHash ? getActiveTorrent(infoHash) : null;
    if (existing) {
      console.log('Already in engine, syncing:', infoHash);
      entry.paused = false;
      entry.name = existing.name || entry.name;
      entry.length = existing.length || entry.length;
      if (shouldSave) saveState();
      broadcastUpdate();
      return;
    }

    entry.paused = false;
    const torrent = client.add(input, { path: DOWNLOAD_PATH, announce: PUBLIC_TRACKERS });

    // Immediately capture the infoHash from the handle
    if (torrent && !entry.infoHash) {
      entry.infoHash = torrent.infoHash;
    }

    torrent.on('ready', () => {
      console.log('Torrent ready:', torrent.name);
      entry.infoHash = torrent.infoHash;
      entry.name = torrent.name || entry.name;
      entry.length = torrent.length || entry.length;
      io.emit('torrent-added', { name: entry.name });
      saveState();
      broadcastUpdate();
    });

    torrent.on('done', () => {
      console.log('Download complete:', torrent.name);
      entry.progress = 1;
      io.emit('torrent-done', { id: torrent.infoHash, name: torrent.name });
      saveState();
    });

    torrent.on('error', (err) => {
      console.error('Torrent error:', err.message);
    });

    if (shouldSave) saveState();
    broadcastUpdate();
  } catch (err) {
    console.error('addTorrent error:', err.message);
  }
}

// ── Broadcast State to All Clients ───────────────────────────────────────────
function broadcastUpdate() {
  const list = torrentsState.map(entry => {
    const active = entry.infoHash ? getActiveTorrent(entry.infoHash) : null;

    if (active && !entry.paused) {
      // Sync from engine, but protect progress from going backwards
      entry.name = active.name || entry.name;
      entry.length = active.length || entry.length;

      // Calculate progress from multiple sources
      const engineProgress = active.progress || 0;
      const downloadedProgress = (active.downloaded && active.length) 
        ? active.downloaded / active.length 
        : 0;
      
      entry.progress = Math.max(entry.progress || 0, engineProgress, downloadedProgress);

      return {
        id: entry.infoHash,
        name: entry.name,
        progress: entry.progress,
        downloadSpeed: active.downloadSpeed || 0,
        uploadSpeed: active.uploadSpeed || 0,
        numPeers: active.numPeers || 0,
        length: entry.length,
        downloaded: active.downloaded || Math.round(entry.progress * entry.length),
        timeRemaining: active.timeRemaining,
        paused: false,
        done: entry.progress >= 1
      };
    }

    // Paused or not yet in engine
    return {
      id: entry.infoHash || entry.magnet,
      name: entry.name || 'Fetching metadata...',
      progress: entry.progress || 0,
      downloadSpeed: 0,
      uploadSpeed: 0,
      numPeers: 0,
      length: entry.length || 0,
      downloaded: (entry.progress || 0) * (entry.length || 0),
      timeRemaining: 0,
      paused: !!entry.paused,
      done: (entry.progress || 0) >= 1
    };
  });

  io.emit('update', list);
}

// ── Socket.IO Events ─────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log('Client connected');
  broadcastUpdate();

  // ── Add ──
  socket.on('add-torrent', (data) => {
    console.log('Adding torrent, input length:', typeof data === 'string' ? data.length : 'buffer');
    addTorrent(data);
    setTimeout(broadcastUpdate, 500);
  });

  // ── Pause ──
  socket.on('pause-torrent', async (infoHash) => {
    if (processingIds.has(infoHash)) return;
    processingIds.add(infoHash);

    try {
      const entry = torrentsState.find(t => t.infoHash === infoHash);
      if (!entry) return;

      // Capture progress from engine before removing
      const active = getActiveTorrent(infoHash);
      if (active) {
        entry.progress = Math.max(entry.progress || 0, active.progress || 0);
      }

      entry.paused = true;
      await safeEngineRemove(infoHash);
      saveState();
      broadcastUpdate();
      console.log('Paused:', infoHash);
    } finally {
      processingIds.delete(infoHash);
    }
  });

  // ── Resume ──
  socket.on('resume-torrent', (infoHash) => {
    if (processingIds.has(infoHash)) return;
    processingIds.add(infoHash);

    try {
      const entry = torrentsState.find(t => t.infoHash === infoHash);
      if (!entry) return;

      entry.paused = false;
      addTorrent(entry.magnet, true, false);
      saveState();
      broadcastUpdate();
      console.log('Resumed:', infoHash);
    } finally {
      processingIds.delete(infoHash);
    }
  });

  // ── Delete ──
  socket.on('remove-torrent', async (infoHash) => {
    if (processingIds.has(infoHash)) return;
    processingIds.add(infoHash);

    try {
      console.log('Deleting:', infoHash);
      torrentsState = torrentsState.filter(t => t.infoHash !== infoHash);
      await safeEngineRemove(infoHash);
      saveState();
      broadcastUpdate();
      socket.emit('torrent-removed', infoHash);
      console.log('Deleted:', infoHash);
    } finally {
      processingIds.delete(infoHash);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// ── Timers ───────────────────────────────────────────────────────────────────
setInterval(broadcastUpdate, 1000);
setInterval(saveState, 10000);

// ── Restore State on Startup ─────────────────────────────────────────────────
const savedState = loadState();
console.log('Restoring', savedState.length, 'torrents from state');

// First, populate torrentsState with all saved entries
savedState.forEach(t => {
  torrentsState.push({
    magnet: t.magnet,
    name: t.name || 'Fetching metadata...',
    infoHash: t.infoHash,
    paused: !!t.paused,
    progress: t.progress || 0,
    length: t.length || 0,
    addedAt: t.addedAt || new Date().toISOString()
  });
});

// Then, start non-paused torrents in the engine
torrentsState.forEach(entry => {
  if (entry.paused) {
    console.log('Skipping paused torrent:', entry.name);
    return;
  }

  console.log('Starting torrent in engine:', entry.name);
  try {
    const torrent = client.add(entry.magnet, { path: DOWNLOAD_PATH, announce: PUBLIC_TRACKERS });

    if (torrent && !entry.infoHash) {
      entry.infoHash = torrent.infoHash;
    }

    torrent.on('ready', () => {
      console.log('Torrent ready:', torrent.name);
      entry.infoHash = torrent.infoHash;
      entry.name = torrent.name || entry.name;
      entry.length = torrent.length || entry.length;
      saveState();
      broadcastUpdate();
    });

    torrent.on('done', () => {
      console.log('Download complete:', torrent.name);
      entry.progress = 1;
      saveState();
    });

    torrent.on('error', (err) => {
      console.error('Torrent error:', err.message);
    });
  } catch (err) {
    console.error('Error restoring torrent:', err.message);
  }
});

// ── Start Server ─────────────────────────────────────────────────────────────
server.listen(PORT, '0.0.0.0', () => {
  console.log(`TorrentFlow running on http://0.0.0.0:${PORT}`);
  console.log(`Downloads: ${DOWNLOAD_PATH}`);
});
