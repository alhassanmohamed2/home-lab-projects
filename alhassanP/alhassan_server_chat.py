import socket
import threading

# ===== CONFIG =====
HOST = ""  # Listen on all interfaces
PORT = 5555  # Pick any free port
PEER_IP = "192.168.1.126"  # Replace with the other computer's IP
PEER_PORT = 5555
# ==================

def listen():
    """Function to receive messages"""
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.bind((HOST, PORT))
    s.listen()
    print(f"Listening on port {PORT}...")
    while True:
        conn, addr = s.accept()
        data = conn.recv(1024)
        if data:
            print(f"\n[{addr[0]}] {data.decode()}\n> ", end="")
        conn.close()

def send():
    """Function to send messages"""
    while True:
        msg = input("> ")
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.connect((PEER_IP, PEER_PORT))
            s.send(msg.encode())
            s.close()
        except Exception as e:
            print(f"Could not send: {e}")

# ===== Run both threads =====
t1 = threading.Thread(target=listen, daemon=True)
t2 = threading.Thread(target=send, daemon=False)

t1.start()
t2.start()

