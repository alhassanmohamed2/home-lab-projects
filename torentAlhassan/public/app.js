const socket = io();

// ── DOM References ───────────────────────────────────────────────────────────
const magnetInput = document.getElementById('magnet-input');
const addBtn = document.getElementById('add-btn');
const torrentList = document.getElementById('torrent-list');
const activeCount = document.getElementById('active-count');
const statusDot = document.querySelector('.dot');
const statusText = document.querySelector('.status-text');

// ── Connection Status ────────────────────────────────────────────────────────
socket.on('connect', () => {
  statusDot.style.background = 'var(--success)';
  statusDot.style.boxShadow = '0 0 10px var(--success)';
  statusText.textContent = 'Connected';
});

socket.on('disconnect', () => {
  statusDot.style.background = '#ff4d4d';
  statusDot.style.boxShadow = '0 0 10px #ff4d4d';
  statusText.textContent = 'Disconnected';
});

socket.on('connect_error', () => {
  statusDot.style.background = '#ff4d4d';
  statusDot.style.boxShadow = '0 0 10px #ff4d4d';
  statusText.textContent = 'Connection Error';
});

// ── Tab Switching ────────────────────────────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    const target = document.getElementById(`${btn.dataset.tab}-tab`);
    if (target) target.classList.add('active');
  });
});

// ── Add Torrent (Magnet) ─────────────────────────────────────────────────────
addBtn.addEventListener('click', () => {
  const magnet = magnetInput.value.trim();
  if (!magnet) return;

  socket.emit('add-torrent', magnet);
  magnetInput.value = '';
  addBtn.textContent = 'Adding...';
  addBtn.disabled = true;
  setTimeout(() => {
    addBtn.textContent = 'Add Torrent';
    addBtn.disabled = false;
  }, 2000);
});

magnetInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') addBtn.click();
});

// ── File Upload ──────────────────────────────────────────────────────────────
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('torrent-file');

if (dropZone && fileInput) {
  dropZone.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', (e) => {
    if (e.target.files[0]) handleFile(e.target.files[0]);
  });

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });
}

function handleFile(file) {
  if (!file || !file.name.endsWith('.torrent')) return;
  const reader = new FileReader();
  reader.onload = (e) => socket.emit('add-torrent', e.target.result);
  reader.readAsArrayBuffer(file);
}

// ── Render Torrents ──────────────────────────────────────────────────────────
socket.on('update', (torrents) => {
  if (!Array.isArray(torrents)) return;
  renderTorrents(torrents);
});

socket.on('torrent-removed', (id) => {
  const el = document.getElementById(id);
  if (el) el.remove();
  checkEmptyState();
});

function renderTorrents(list) {
  // Get set of active IDs from server
  const serverIds = new Set(list.map(t => t.id).filter(Boolean));

  // Remove cards that no longer exist on the server
  torrentList.querySelectorAll('.torrent-card').forEach(card => {
    if (!serverIds.has(card.id)) card.remove();
  });

  // Remove empty state if torrents exist
  if (list.length > 0) {
    const empty = torrentList.querySelector('.empty-state');
    if (empty) empty.remove();
  }

  // Add or update each torrent
  list.forEach(t => {
    if (!t.id) return;

    let el = document.getElementById(t.id);
    if (!el) {
      el = createCard(t);
      torrentList.appendChild(el);
    }
    updateCard(el, t);
  });

  // Update counter
  activeCount.textContent = list.length;

  // Show empty state if no torrents
  if (list.length === 0) checkEmptyState();
}

function createCard(t) {
  const div = document.createElement('div');
  div.id = t.id;
  div.className = 'torrent-card' + (t.paused ? ' paused' : '');
  div.innerHTML = `
    <div class="torrent-info">
      <div class="name-group">
        <h3 class="torrent-name">${escapeHtml(t.name)}</h3>
        <div class="stats-inline">
          <span class="size">Calculating...</span>
          <span class="peers">0 peers</span>
        </div>
      </div>
      <div class="action-group">
        <button class="pause-btn" onclick="handlePause('${t.id}')">${t.paused ? '▶ Resume' : '⏸ Pause'}</button>
        <button class="delete-btn" onclick="handleDelete('${t.id}')">✕ Delete</button>
      </div>
    </div>
    <div class="progress-container">
      <div class="progress-bar-bg">
        <div class="progress-fill"></div>
      </div>
      <div class="progress-details">
        <span class="percentage">0%</span>
        <div class="speed-group">
          <span class="down-speed">↓ 0 B/s</span>
          <span class="eta">---</span>
        </div>
      </div>
    </div>
  `;
  return div;
}

function updateCard(el, t) {
  // Name
  el.querySelector('.torrent-name').textContent = t.name || 'Fetching metadata...';

  // Size
  el.querySelector('.size').textContent = t.length > 0 ? formatBytes(t.length) : 'Fetching metadata...';

  // Peers
  const peers = t.numPeers || 0;
  el.querySelector('.peers').textContent = t.paused ? 'Paused' : `${peers} peer${peers !== 1 ? 's' : ''}`;

  // Progress
  const prog = Math.min(t.progress || 0, 1);
  el.querySelector('.percentage').textContent = `${(prog * 100).toFixed(1)}%`;
  el.querySelector('.progress-fill').style.width = `${prog * 100}%`;

  // Speed
  if (t.paused) {
    el.querySelector('.down-speed').textContent = '⏸ Paused';
  } else if (t.done) {
    el.querySelector('.down-speed').textContent = '✓ Complete';
  } else if (t.downloadSpeed === 0 && prog > 0 && prog < 1) {
    el.querySelector('.down-speed').textContent = '🔍 Checking files...';
  } else {
    el.querySelector('.down-speed').textContent = `↓ ${formatBytes(t.downloadSpeed || 0)}/s`;
  }

  // ETA
  el.querySelector('.eta').textContent = t.done ? 'Finished' : (t.paused ? '---' : formatETA(t.timeRemaining));

  // Pause button — always sync from server state
  const pauseBtn = el.querySelector('.pause-btn');
  if (pauseBtn && !pauseBtn.disabled) {
    pauseBtn.textContent = t.paused ? '▶ Resume' : '⏸ Pause';
    pauseBtn.className = t.paused ? 'pause-btn resume' : 'pause-btn';
  }

  // Card state
  if (t.paused) {
    el.classList.add('paused');
  } else {
    el.classList.remove('paused');
  }

  // Done state
  if (t.done) {
    el.querySelector('.progress-fill').style.background = 'var(--success)';
    el.classList.add('done');
    if (pauseBtn) pauseBtn.style.display = 'none';
  }
}

// ── Actions ──────────────────────────────────────────────────────────────────
window.handlePause = (id) => {
  const el = document.getElementById(id);
  if (!el) return;

  const isPaused = el.classList.contains('paused');
  const btn = el.querySelector('.pause-btn');

  if (isPaused) {
    el.classList.remove('paused');
    if (btn) { btn.textContent = 'Resuming...'; btn.disabled = true; }
    socket.emit('resume-torrent', id);
  } else {
    el.classList.add('paused');
    if (btn) { btn.textContent = 'Pausing...'; btn.disabled = true; }
    socket.emit('pause-torrent', id);
  }

  // Re-enable button after server responds
  setTimeout(() => { if (btn) btn.disabled = false; }, 2000);
};

window.handleDelete = (id) => {
  const el = document.getElementById(id);
  if (!el) return;

  // Visual feedback: fade out
  el.style.opacity = '0.3';
  el.style.pointerEvents = 'none';
  socket.emit('remove-torrent', id);

  // If server doesn't respond in 3s, remove the card anyway
  setTimeout(() => {
    const stillThere = document.getElementById(id);
    if (stillThere) stillThere.remove();
    checkEmptyState();
  }, 3000);
};

function checkEmptyState() {
  const cards = torrentList.querySelectorAll('.torrent-card');
  if (cards.length === 0 && !torrentList.querySelector('.empty-state')) {
    torrentList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📂</div>
        <p>No active downloads</p>
      </div>
    `;
    activeCount.textContent = '0';
  }
}

// ── Utilities ────────────────────────────────────────────────────────────────
function formatBytes(bytes) {
  if (!bytes || isNaN(bytes) || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  if (i < 0 || i >= sizes.length) return '0 B';
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatETA(ms) {
  if (!ms || ms === Infinity || ms < 0) return 'Calculating...';
  const s = Math.floor((ms / 1000) % 60);
  const m = Math.floor((ms / 60000) % 60);
  const h = Math.floor(ms / 3600000);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
