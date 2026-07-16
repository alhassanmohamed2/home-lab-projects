from pydantic import BaseModel
from typing import Optional

class User(BaseModel):
    id: int
    name: str
    arabic_name: str
    role: str

class Message(BaseModel):
    user: User
    message: str
    timestamp: str
    message_id: Optional[str] = None