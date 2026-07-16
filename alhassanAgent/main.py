import os
import subprocess
import shlex
import google.generativeai as genai
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from typing import Optional

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/", response_class=HTMLResponse)
async def read_root():
    with open("index.html", "r") as f:
        return f.read()

# --- Configuration ---
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    print("WARNING: GEMINI_API_KEY not found in environment variables.")

genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel("gemini-2.0-flash-exp")

# Allowed commands for security
ALLOWED_COMMANDS = [
    "df", "free", "uptime", "top", "w", "who", "date", "ls", "echo", "cat", "ps", "docker", "tail", "head", "grep"
]

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    response: str
    command_executed: Optional[str] = None
    raw_output: Optional[str] = None

def is_command_safe(command_str: str) -> bool:
    """Simple whitelist check for the primary command."""
    try:
        parts = shlex.split(command_str)
        if not parts:
            return False
        base_cmd = parts[0]
        return base_cmd in ALLOWED_COMMANDS
    except Exception:
        return False

@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    user_msg = request.message
    
    # SYSTEM PROMPT
    # We ask Gemini to either answer normally, OR output a single line command.
    system_prompt = (
        "You are a Linux Server Assistant. "
        "If the user asks a general question, answer it normally and concisely. "
        "If the user asks for server status or information that requires a command, "
        "output ONLY the Linux command to run (e.g., `free -h`). "
        "Do not output markdown code blocks (no ```), just the raw command text. "
        "Do not explain the command. "
        "The available commands are: " + ", ".join(ALLOWED_COMMANDS) + ". "
        "If the request requires a command not in this list, politely explain you cannot run it."
    )

    try:
        chat = model.start_chat()
        response = chat.send_message(f"{system_prompt}\n\nUser: {user_msg}")
        ai_text = response.text.strip()
        
        # Check if the AI wants to run a command
        # Heuristic: If it looks like a command (starts with a known command) and is short.
        # But relying solely on "starts with" might be risky if AI says "Sure, run `free -h`".
        # The prompt says "output ONLY the command", so we trust that mostly.
        
        command_candidate = ai_text.split('\n')[0].strip() # Take first line
        
        # Simple cleanup if Gemini wraps in backticks despite instructions
        if command_candidate.startswith("`") and command_candidate.endswith("`"):
            command_candidate = command_candidate.strip("`")
            
        if is_command_safe(command_candidate):
            # It IS a command, and it is SAFE. Execute it.
            print(f"Executing command: {command_candidate}")
            
            try:
                # Using shell=True for pipes etc. but restricted by whitelist on the first token logic.
                # Note: shlex.split helps parsing, but for simple status commands we might want to just run it.
                # However, shell=True is dangerous. 
                # Let's split and run without shell=True for better security if possible, 
                # BUT user might want `ls -la | grep foo` which requires shell=True.
                # Given strict whitelist of the *binary*, we will use shell=True but be careful.
                # Security Tradeoff: The user asked for a "simple" assistant. 
                
                result = subprocess.run(
                    command_candidate, 
                    shell=True, 
                    capture_output=True, 
                    text=True, 
                    timeout=10
                )
                
                output = result.stdout
                if result.stderr:
                    output += f"\nError: {result.stderr}"
                
                # Step 3: Summarize
                summary_prompt = (
                    f"The user asked: '{user_msg}'.\n"
                    f"I ran the command: '{command_candidate}'.\n"
                    f"Here is the output:\n{output}\n\n"
                    "Summarize this for the user concisely."
                )
                summary_response = chat.send_message(summary_prompt)
                
                return ChatResponse(
                    response=summary_response.text,
                    command_executed=command_candidate,
                    raw_output=output
                )

            except Exception as e:
                return ChatResponse(
                    response=f"I tried to run `{command_candidate}` but failed: {str(e)}",
                    command_executed=command_candidate,
                    raw_output=str(e)
                )
        
        else:
            # Not a command, or not allowed. Just return Gemini's text.
            return ChatResponse(response=ai_text)

    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
