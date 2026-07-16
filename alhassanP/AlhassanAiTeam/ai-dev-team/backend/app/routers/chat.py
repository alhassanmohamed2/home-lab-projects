import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.models import Message
from app.internal.agent_service import agent_service
import datetime

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []
        self.history: list[Message] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        # Send history to the new client
        for msg in self.history:
            await websocket.send_text(msg.json())

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: Message):
        self.history.append(message)
        for connection in self.active_connections:
            await connection.send_text(message.json())
    
    async def stream_broadcast(self, generator):
        for message in generator:
            if message:
                self.history.append(message)
                for connection in self.active_connections:
                    await connection.send_text(message.json())


manager = ConnectionManager()

@router.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            message = Message.parse_raw(data)
            
            # Add the user's message to the history and broadcast it
            await manager.broadcast(message)
            
            # Get the agent's response
            agent_response_generator = agent_service.generate_response(message, manager.history)
            await manager.stream_broadcast(agent_response_generator)

    except WebSocketDisconnect:
        manager.disconnect(websocket)
