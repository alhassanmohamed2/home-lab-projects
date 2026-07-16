import os
import subprocess
import tempfile
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Allow CORS for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/play")
async def play_audio(file: UploadFile = File(...)):
    # Save the file for debugging
    temp_path = "/tmp/latest.webm"
    with open(temp_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
        print(f"Saved audio chunk: {len(content)} bytes")

    # Play the saved file
    try:
        process = subprocess.Popen(
            ["ffplay", "-nodisp", "-autoexit", temp_path],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )
        process.wait()
        return {"status": "success"}
    except Exception as e:
        print(f"Error playing audio: {e}")
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
