import asyncio
import time
import sys
import os
import sqlite3
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime
from fastapi import FastAPI, BackgroundTasks
from fastapi.responses import HTMLResponse
from main import check_flybox_status
import threading
from contextlib import redirect_stdout

app = FastAPI()

# Global state to keep track of downtime
downtime_start = None
COOLDOWN_PERIOD = 30  # 30 seconds cooldown after automation runs
last_automation_time = 0

# Interactive state
automation_status = "idle" # idle, running, success, error

DB_FILE = "data/history.db"

def init_db():
    os.makedirs(os.path.dirname(DB_FILE), exist_ok=True)
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS run_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT,
            trigger_type TEXT,
            status TEXT
        )
    ''')
    conn.commit()
    conn.close()

init_db()

def add_history_entry(timestamp, trigger_type, status):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('INSERT INTO run_history (timestamp, trigger_type, status) VALUES (?, ?, ?)', 
              (timestamp, trigger_type, status))
    conn.commit()
    conn.close()

def update_latest_status(status):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('UPDATE run_history SET status = ? WHERE id = (SELECT MAX(id) FROM run_history)', (status,))
    conn.commit()
    conn.close()

class LogCatcher:
    def __init__(self):
        self.logs = []
    def write(self, message):
        msg = message.strip()
        if msg:
            self.logs.append(msg)
    def flush(self):
        pass

catcher = LogCatcher()

def run_automation_sync(trigger_type="Manual"):
    global automation_status
    automation_status = "running"
    catcher.logs.clear()
    catcher.logs.append(f"Automation starting ({trigger_type} trigger)...")
    
    start_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    add_history_entry(start_time, trigger_type, "Running")
    
    try:
        with redirect_stdout(catcher):
            check_flybox_status()
        automation_status = "success"
        update_latest_status("Success")
    except Exception as e:
        catcher.logs.append(f"Automation failed: {e}")
        automation_status = "error"
        update_latest_status("Failed")

ping_logs = []
def add_ping_log(msg):
    global ping_logs
    timestamp = datetime.now().strftime('%H:%M:%S')
    ping_logs.append(f"[{timestamp}] {msg}")
    if len(ping_logs) > 100:
        ping_logs.pop(0)

async def check_network_busy():
    def fetch_traffic():
        try:
            url = "http://192.168.1.1/api/monitoring/traffic-statistics"
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=3) as response:
                xml_data = response.read()
                root = ET.fromstring(xml_data)
                download_rate = int(root.findtext('CurrentDownloadRate', '0'))
                upload_rate = int(root.findtext('CurrentUploadRate', '0'))
                return download_rate, upload_rate
        except Exception as e:
            return 0, 0
            
    dl, ul = await asyncio.to_thread(fetch_traffic)
    
    # Thresholds: 1 MB/s download (1000000 bytes/s), 200 KB/s upload (200000 bytes/s)
    if dl > 1000000 or ul > 200000:
        return True, dl, ul
    return False, dl, ul

async def internet_monitor():
    global downtime_start, last_automation_time, automation_status
    while True:
        try:
            # Ping 8.8.8.8 with 1 packet, timeout 2 seconds
            process = await asyncio.create_subprocess_shell(
                "ping -c 1 -W 2 8.8.8.8",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await process.communicate()
            output = stdout.decode()
            
            is_down_or_high_latency = False
            if process.returncode != 0:
                is_down_or_high_latency = True
                add_ping_log(f"Ping failed (return code {process.returncode})")
            else:
                # Check latency
                for line in output.split('\n'):
                    if 'time=' in line:
                        try:
                            time_ms = float(line.split('time=')[1].split(' ')[0])
                            add_ping_log(f"Ping OK: {time_ms}ms")
                            if time_ms > 1500:  # 1500ms threshold
                                is_down_or_high_latency = True
                                add_ping_log(f"High latency detected: {time_ms}ms > 1500ms")
                        except Exception:
                            pass
            
            if is_down_or_high_latency:
                if downtime_start is None:
                    add_ping_log("Downtime/High latency condition started. Timer: 0s")
                    downtime_start = time.time()
                elif time.time() - downtime_start > 5:
                    if time.time() - last_automation_time > COOLDOWN_PERIOD:
                        if automation_status != "running":
                            is_busy, dl_rate, ul_rate = await check_network_busy()
                            if is_busy:
                                add_ping_log(f"High latency but network is busy (DL: {dl_rate/1000:.0f} KB/s, UL: {ul_rate/1000:.0f} KB/s). Skipping automation.")
                                downtime_start = time.time()
                            else:
                                add_ping_log(f"Condition met (5s) + Cooldown passed. Traffic low (DL: {dl_rate/1000:.0f} KB/s). Triggering automation!")
                                # Trigger automation
                                threading.Thread(target=run_automation_sync, args=("Automatic",)).start()
                                last_automation_time = time.time()
                                downtime_start = None
                        else:
                            last_automation_time = time.time()
                            downtime_start = None
                    else:
                        add_ping_log("Condition met (5s), but still in cooldown period.")
                else:
                    add_ping_log(f"Downtime persisting. Timer: {int(time.time() - downtime_start)}s")
            else:
                if downtime_start is not None:
                    add_ping_log("Connection restored. Timer reset.")
                downtime_start = None
                
        except Exception as e:
            add_ping_log(f"Error in internet monitor: {e}")
            print(f"Error in internet monitor: {e}")
        
        await asyncio.sleep(2)

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(internet_monitor())

@app.get("/", response_class=HTMLResponse)
async def read_root():
    return """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Router Automation</title>
        <style>
            :root {
                --primary: #4F46E5;
                --primary-hover: #4338CA;
                --bg: #0F172A;
                --surface: #1E293B;
                --surface-dark: #0B1120;
                --surface-light: #334155;
                --text: #F8FAFC;
                --text-muted: #94A3B8;
                --success: #10B981;
                --error: #EF4444;
                --info: #3B82F6;
                --border: #334155;
            }
            body {
                margin: 0;
                padding: 0;
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                background-color: var(--bg);
                color: var(--text);
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
            }
            .container {
                background: var(--surface);
                padding: 3rem;
                border-radius: 1.5rem;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                text-align: center;
                max-width: 650px;
                width: 90%;
            }
            h1 {
                font-size: 2rem;
                margin-bottom: 1rem;
                background: linear-gradient(to right, #60A5FA, #A78BFA);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
            }
            p {
                color: var(--text-muted);
                margin-bottom: 2rem;
                line-height: 1.6;
            }
            .btn {
                background: var(--primary);
                color: white;
                border: none;
                padding: 1rem 2rem;
                font-size: 1.125rem;
                font-weight: 600;
                border-radius: 9999px;
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.4);
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 0.75rem;
                width: 100%;
                margin-bottom: 1.5rem;
            }
            .btn:hover {
                background: var(--primary-hover);
                transform: translateY(-2px);
                box-shadow: 0 10px 15px -3px rgba(79, 70, 229, 0.5);
            }
            .btn:active {
                transform: translateY(0);
            }
            .btn:disabled {
                opacity: 0.7;
                cursor: not-allowed;
                transform: none;
            }
            .spinner {
                display: none;
                width: 1.5rem;
                height: 1.5rem;
                border: 3px solid rgba(255,255,255,0.3);
                border-radius: 50%;
                border-top-color: white;
                animation: spin 1s ease-in-out infinite;
            }
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
            
            /* Tabs */
            .tabs {
                display: flex;
                border-bottom: 1px solid var(--border);
                margin-bottom: 1.5rem;
            }
            .tab-btn {
                background: none;
                border: none;
                color: var(--text-muted);
                padding: 0.75rem 1.5rem;
                font-size: 1rem;
                font-weight: 500;
                cursor: pointer;
                border-bottom: 2px solid transparent;
                transition: all 0.2s ease;
            }
            .tab-btn:hover {
                color: var(--text);
            }
            .tab-btn.active {
                color: var(--primary);
                border-bottom-color: var(--primary);
            }
            .tab-content {
                display: none;
            }
            .tab-content.active {
                display: block;
                animation: fadeIn 0.3s ease-in;
            }

            .terminal {
                background-color: var(--surface-dark);
                color: #A78BFA;
                border-radius: 0.75rem;
                padding: 1.5rem;
                text-align: left;
                font-family: 'Courier New', Courier, monospace;
                font-size: 0.875rem;
                height: 250px;
                overflow-y: auto;
                box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.06);
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }
            .terminal span {
                display: block;
            }
            .status-badge {
                display: inline-block;
                padding: 0.25rem 0.75rem;
                border-radius: 9999px;
                font-size: 0.75rem;
                font-weight: 700;
                text-transform: uppercase;
                margin-bottom: 1rem;
            }
            .bg-idle { background-color: var(--surface-dark); color: var(--text-muted); }
            .bg-running { background-color: rgba(59, 130, 246, 0.2); color: var(--info); }
            .bg-success { background-color: rgba(16, 185, 129, 0.2); color: var(--success); }
            .bg-error { background-color: rgba(239, 68, 68, 0.2); color: var(--error); }
            
            /* History Table */
            .history-table {
                width: 100%;
                border-collapse: collapse;
                text-align: left;
                font-size: 0.875rem;
            }
            .history-table th, .history-table td {
                padding: 0.75rem 1rem;
                border-bottom: 1px solid var(--surface-light);
            }
            .history-table th {
                color: var(--text-muted);
                font-weight: 600;
            }
            .history-table tr:last-child td {
                border-bottom: none;
            }
            .history-container {
                max-height: 250px;
                overflow-y: auto;
                background-color: var(--surface-dark);
                border-radius: 0.75rem;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }
            .badge-sm {
                padding: 0.25rem 0.6rem;
                border-radius: 9999px;
                font-size: 0.7rem;
                font-weight: 600;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(5px); }
                to { opacity: 1; transform: translateY(0); }
            }
        </style>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    </head>
    <body>
        <div class="container">
            <h1>Router Automation</h1>
            <p>Monitor your connection and view historical runs. The system auto-recovers if your internet drops or lags.</p>
            
            <div id="statusBadge" class="status-badge bg-idle">Status: IDLE</div>

            <button class="btn" id="triggerBtn" onclick="triggerAutomation()">
                <div class="spinner" id="spinner"></div>
                <span id="btnText">Run Automation Now</span>
            </button>
            
            <div class="tabs">
                <button class="tab-btn active" onclick="switchTab('terminal-tab', this)">Live Terminal</button>
                <button class="tab-btn" onclick="switchTab('history-tab', this)">Run History</button>
                <button class="tab-btn" onclick="switchTab('ping-tab', this)">System Logs</button>
            </div>

            <div id="terminal-tab" class="tab-content active">
                <div class="terminal" id="terminal">
                    <span style="color: var(--text-muted);">> Ready. Awaiting trigger...</span>
                </div>
            </div>

            <div id="history-tab" class="tab-content">
                <div class="history-container">
                    <table class="history-table">
                        <thead>
                            <tr>
                                <th>Timestamp</th>
                                <th>Trigger Type</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody id="historyBody">
                            <tr><td colspan="3" style="text-align:center; color: var(--text-muted);">No runs yet</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div id="ping-tab" class="tab-content">
                <div class="terminal" id="pingTerminal">
                    <span style="color: var(--text-muted);">> Waiting for system logs...</span>
                </div>
            </div>
        </div>

        <script>
            let pollingInterval = null;
            let lastLogCount = 0;
            let pingPollingInterval = null;
            let lastPingLogCount = 0;

            function switchTab(tabId, btn) {
                document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
                document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
                
                document.getElementById(tabId).classList.add('active');
                btn.classList.add('active');
                
                if (tabId === 'history-tab') {
                    fetchHistory();
                } else if (tabId === 'ping-tab') {
                    fetchPingLogs();
                }
            }

            async function triggerAutomation() {
                const btn = document.getElementById('triggerBtn');
                const spinner = document.getElementById('spinner');
                const btnText = document.getElementById('btnText');
                const terminal = document.getElementById('terminal');
                
                btn.disabled = true;
                spinner.style.display = 'block';
                btnText.textContent = 'Running...';
                terminal.innerHTML = '';
                lastLogCount = 0;
                
                // Switch to terminal tab if not there
                switchTab('terminal-tab', document.querySelector('.tab-btn'));
                
                try {
                    await fetch('/api/run-automation', { method: 'POST' });
                    startPolling();
                } catch (error) {
                    addLogLine('Failed to trigger automation.', 'var(--error)');
                    resetBtn('error');
                }
            }

            function startPolling() {
                if (pollingInterval) clearInterval(pollingInterval);
                pollingInterval = setInterval(fetchStatus, 1000);
            }

            async function fetchStatus() {
                try {
                    const response = await fetch('/api/status');
                    const data = await response.json();
                    
                    updateTerminal(data.logs);
                    updateBadge(data.status);
                    
                    if (data.status === 'success' || data.status === 'error') {
                        clearInterval(pollingInterval);
                        pollingInterval = null;
                        resetBtn(data.status);
                        
                        // If history tab is open, refresh it when done
                        if (document.getElementById('history-tab').classList.contains('active')) {
                            fetchHistory();
                        }
                    } else {
                        const btn = document.getElementById('triggerBtn');
                        const spinner = document.getElementById('spinner');
                        const btnText = document.getElementById('btnText');
                        if (!btn.disabled && data.status === 'running') {
                            btn.disabled = true;
                            spinner.style.display = 'block';
                            btnText.textContent = 'Running...';
                            
                            // Also switch to terminal tab so user can watch it
                            if (!document.getElementById('terminal-tab').classList.contains('active')) {
                                switchTab('terminal-tab', document.querySelectorAll('.tab-btn')[0]);
                            }
                        }
                    }
                } catch (e) {
                    console.error("Polling error", e);
                }
            }

            async function fetchHistory() {
                try {
                    const response = await fetch('/api/history');
                    const history = await response.json();
                    
                    const tbody = document.getElementById('historyBody');
                    if (history.length === 0) {
                        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color: var(--text-muted);">No runs yet</td></tr>';
                        return;
                    }
                    
                    tbody.innerHTML = '';
                    history.forEach(run => {
                        const tr = document.createElement('tr');
                        
                        let bgClass = 'bg-running';
                        if (run.status === 'Success') { bgClass = 'bg-success'; }
                        if (run.status === 'Failed') { bgClass = 'bg-error'; }
                        
                        tr.innerHTML = `
                            <td>${run.timestamp}</td>
                            <td>${run.type}</td>
                            <td><span class="badge-sm ${bgClass}">${run.status}</span></td>
                        `;
                        tbody.appendChild(tr);
                    });
                } catch (e) {
                    console.error("History fetch error", e);
                }
            }

            function updateTerminal(logs) {
                const terminal = document.getElementById('terminal');
                
                if (logs.length < lastLogCount) {
                    terminal.innerHTML = '';
                    lastLogCount = 0;
                }
                
                if (logs.length === 0 && lastLogCount === 0) {
                    terminal.innerHTML = '<span style="color: var(--text-muted);">> Ready. Awaiting trigger...</span>';
                } else if (logs.length > lastLogCount) {
                    if (lastLogCount === 0) {
                        terminal.innerHTML = ''; 
                    }
                    
                    for (let i = lastLogCount; i < logs.length; i++) {
                        const span = document.createElement('span');
                        span.textContent = '> ' + logs[i];
                        terminal.appendChild(span);
                    }
                    
                    lastLogCount = logs.length;
                    terminal.scrollTop = terminal.scrollHeight;
                }
            }

            function updateBadge(status) {
                const badge = document.getElementById('statusBadge');
                badge.textContent = 'Status: ' + status.toUpperCase();
                badge.className = 'status-badge bg-' + status;
            }

            function resetBtn(status) {
                const btn = document.getElementById('triggerBtn');
                const spinner = document.getElementById('spinner');
                const btnText = document.getElementById('btnText');
                
                btn.disabled = false;
                spinner.style.display = 'none';
                btnText.textContent = status === 'success' ? 'Run Again' : 'Run Automation Now';
            }

            function addLogLine(text, color) {
                const terminal = document.getElementById('terminal');
                const span = document.createElement('span');
                span.textContent = '> ' + text;
                if (color) span.style.color = color;
                terminal.appendChild(span);
                terminal.scrollTop = terminal.scrollHeight;
            }

            async function fetchPingLogs() {
                try {
                    const response = await fetch('/api/ping-logs');
                    const data = await response.json();
                    const logs = data.logs || [];
                    
                    if (logs.length !== lastPingLogCount) {
                        const pt = document.getElementById('pingTerminal');
                        pt.innerHTML = '';
                        logs.forEach(l => {
                            const s = document.createElement('span');
                            s.textContent = '> ' + l;
                            pt.appendChild(s);
                        });
                        pt.scrollTop = pt.scrollHeight;
                        lastPingLogCount = logs.length;
                    }
                } catch (e) {
                    console.error('Ping logs fetch error', e);
                }
            }

            fetchPingLogs();
            pingPollingInterval = setInterval(fetchPingLogs, 1500);
            startPolling();
        </script>
    </body>
    </html>
    """

@app.post("/api/run-automation")
async def api_run_automation(background_tasks: BackgroundTasks):
    if automation_status != "running":
        background_tasks.add_task(run_automation_sync, "Manual")
        return {"status": "success", "message": "Automation triggered in background."}
    return {"status": "ignored", "message": "Already running."}

@app.get("/api/status")
async def get_status():
    return {
        "status": automation_status,
        "logs": catcher.logs
    }

@app.get("/api/ping-logs")
async def get_ping_logs():
    return {"logs": ping_logs}

@app.get("/api/history")
async def get_history():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('SELECT timestamp, trigger_type, status FROM run_history ORDER BY id DESC LIMIT 200')
    rows = c.fetchall()
    conn.close()
    
    history = []
    for row in rows:
        history.append({
            "timestamp": row[0],
            "type": row[1],
            "status": row[2]
        })
    return history
