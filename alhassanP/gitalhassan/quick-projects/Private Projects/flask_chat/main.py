from flask import Flask, render_template, request, jsonify, redirect
from flask_socketio import SocketIO, emit
import sqlite3
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s %(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key'  # Required for SocketIO
socketio = SocketIO(app)

# Initialize database
def init_db():
    try:
        with sqlite3.connect("data.sqlite") as conn:
            conn.execute('''CREATE TABLE IF NOT EXISTS msg (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                message TEXT NOT NULL,
                username TEXT NOT NULL,
                timestamp DATETIME NOT NULL
            )''')
            conn.commit()
            logger.info("Database initialized successfully")
    except sqlite3.Error as e:
        logger.error(f"Database initialization failed: {e}")

init_db()

@app.route("/")
def home():
    try:
        return render_template("index.html")
    except Exception as e:
        logger.error(f"Error rendering index.html: {e}")
        return jsonify({'status': 'error', 'message': 'Failed to load home page'}), 500

@app.route("/chat_update", methods=['POST'])
def chat_update():
    try:
        with sqlite3.connect("data.sqlite") as conn:
            data_array = conn.execute("SELECT id, message, username, timestamp FROM msg ORDER BY timestamp DESC").fetchall()
            return render_template("chat.html", data_array=data_array)
    except sqlite3.Error as e:
        logger.error(f"Database error in chat_update: {e}")
        return jsonify({'status': 'error', 'message': 'Database error'}), 500
    except Exception as e:
        logger.error(f"Error in chat_update: {e}")
        return jsonify({'status': 'error', 'message': 'Server error'}), 500

@app.route('/send', methods=['POST'])
def send():
    try:
        msg = request.form.get('msg')
        username = request.form.get('username', 'Anonymous')
        if not msg or not username:
            return jsonify({'status': 'error', 'message': 'Message and username required'}), 400
        timestamp = datetime.utcnow().isoformat()
        with sqlite3.connect("data.sqlite") as conn:
            conn.execute("INSERT INTO msg (message, username, timestamp) VALUES (?, ?, ?)", (msg, username, timestamp))
            conn.commit()
        socketio.emit('new_message', {'message': msg, 'username': username, 'timestamp': timestamp})
        logger.info(f"Message sent by {username}: {msg}")
        return jsonify({'status': 'OK', 'message': msg})
    except sqlite3.Error as e:
        logger.error(f"Database error in send: {e}")
        return jsonify({'status': 'error', 'message': 'Database error'}), 500
    except Exception as e:
        logger.error(f"Error in send: {e}")
        return jsonify({'status': 'error', 'message': 'Server error'}), 500

@app.route('/delete/<int:msg_id>', methods=['POST'])
def delete(msg_id):
    try:
        with sqlite3.connect("data.sqlite") as conn:
            conn.execute("DELETE FROM msg WHERE id = ?", (msg_id,))
            conn.commit()
        socketio.emit('delete_message', {'msg_id': msg_id})
        logger.info(f"Message ID {msg_id} deleted")
        return jsonify({'status': 'OK'})
    except sqlite3.Error as e:
        logger.error(f"Database error in delete: {e}")
        return jsonify({'status': 'error', 'message': 'Database error'}), 500
    except Exception as e:
        logger.error(f"Error in delete: {e}")
        return jsonify({'status': 'error', 'message': 'Server error'}), 500

@app.route('/edit/<int:msg_id>', methods=['POST'])
def edit(msg_id):
    try:
        msg = request.form.get('msg')
        username = request.form.get('username', 'Anonymous')
        if not msg:
            return jsonify({'status': 'error', 'message': 'Message required'}), 400
        with sqlite3.connect("data.sqlite") as conn:
            conn.execute("UPDATE msg SET message = ?, username = ? WHERE id = ?", (msg, username, msg_id))
            conn.commit()
        socketio.emit('edit_message', {'msg_id': msg_id, 'message': msg, 'username': username})
        logger.info(f"Message ID {msg_id} edited by {username}")
        return jsonify({'status': 'OK', 'message': msg})
    except sqlite3.Error as e:
        logger.error(f"Database error in edit: {e}")
        return jsonify({'status': 'error', 'message': 'Database error'}), 500
    except Exception as e:
        logger.error(f"Error in edit: {e}")
        return jsonify({'status': 'error', 'message': 'Server error'}), 500

@socketio.on('connect')
def handle_connect():
    logger.info("Client connected to WebSocket")

if __name__ == "__main__":
    socketio.run(app, debug=True, host='0.0.0.0', port=5000, allow_unsafe_werkzeug=True)