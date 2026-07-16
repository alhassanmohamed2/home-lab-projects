import os
import shutil
import uvicorn
import secrets
import tempfile
from fastapi import FastAPI, UploadFile, File, HTTPException, Form, Depends, status, BackgroundTasks
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from pydantic import BaseModel
from typing import List, Optional
from pathlib import Path

app = FastAPI()

# --- SECURITY CONFIGURATION ---
security = HTTPBasic()
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "YOUR_ADMIN_PASSWORD"

def get_current_username(credentials: HTTPBasicCredentials = Depends(security)):
    current_username_bytes = credentials.username.encode("utf8")
    correct_username_bytes = ADMIN_USERNAME.encode("utf8")
    is_correct_username = secrets.compare_digest(current_username_bytes, correct_username_bytes)
    
    current_password_bytes = credentials.password.encode("utf8")
    correct_password_bytes = ADMIN_PASSWORD.encode("utf8")
    is_correct_password = secrets.compare_digest(current_password_bytes, correct_password_bytes)
    
    if not (is_correct_username and is_correct_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials.username

# CONFIGURATION
# CONFIGURATION
# Use DATA_DIR env var if set, otherwise ./data
DATA_DIR_PATH = os.getenv("DATA_DIR", "./data")
BASE_DIR = Path(DATA_DIR_PATH).resolve()
if not BASE_DIR.exists():
    BASE_DIR.mkdir(parents=True, exist_ok=True)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ActionRequest(BaseModel):
    action: str 
    source_path: str
    dest_path: Optional[str] = None

def get_safe_path(path_str: str) -> Path:
    clean_path = path_str.lstrip("/")
    full_path = (BASE_DIR / clean_path).resolve()
    if not str(full_path).startswith(str(BASE_DIR.resolve())):
        raise HTTPException(status_code=403, detail="Access denied")
    return full_path

@app.post("/api/login", dependencies=[Depends(get_current_username)])
def login():
    return {"status": "authenticated"}

@app.get("/api/files", dependencies=[Depends(get_current_username)])
def list_files(path: str = ""):
    try:
        target_path = get_safe_path(path)
        if not target_path.exists():
             raise HTTPException(status_code=404, detail="Directory not found")
        items = []
        with os.scandir(target_path) as entries:
            sorted_entries = sorted(entries, key=lambda e: (not e.is_dir(), e.name.lower()))
            for entry in sorted_entries:
                try:
                    stat = entry.stat()
                    
                    # Calculate relative path from BASE_DIR to serve as the API identifier
                    rel_path = os.path.relpath(entry.path, BASE_DIR)
                    # Handle the case where rel_path is "." (root)
                    if rel_path == ".":
                         final_path = ""
                    else:
                         final_path = "/" + rel_path

                    items.append({
                        "name": entry.name,
                        "is_dir": entry.is_dir(),
                        "size": stat.st_size if not entry.is_dir() else 0,
                        "path": final_path
                    })
                except PermissionError:
                    continue 
        return items
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/download", dependencies=[Depends(get_current_username)])
def download_file(path: str, background_tasks: BackgroundTasks):
    """
    Downloads a file or Zips a directory and downloads it.
    """
    file_path = get_safe_path(path)
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Path not found")

    # CASE 1: It's a directory -> Zip it
    if file_path.is_dir():
        try:
            # Create a unique temp name for the zip file
            temp_dir = tempfile.gettempdir()
            base_name = os.path.join(temp_dir, f"{file_path.name}_{secrets.token_hex(4)}")
            
            # shutil.make_archive automatically adds .zip extension
            archive_path = shutil.make_archive(base_name, 'zip', file_path)
            
            # Schedule the deletion of the temp zip file after response is sent
            background_tasks.add_task(os.remove, archive_path)
            
            return FileResponse(
                path=archive_path, 
                filename=f"{file_path.name}.zip", 
                media_type='application/zip'
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to zip folder: {str(e)}")

    # CASE 2: It's a regular file
    return FileResponse(path=file_path, filename=file_path.name, media_type='application/octet-stream')

@app.post("/api/upload", dependencies=[Depends(get_current_username)])
def upload_file(path: str = Form(...), file: UploadFile = File(...)):
    try:
        target_dir = get_safe_path(path)
        if not target_dir.is_dir():
            raise HTTPException(status_code=400, detail="Invalid directory")
        file_location = target_dir / file.filename
        with open(file_location, "wb+") as file_object:
            shutil.copyfileobj(file.file, file_object)
        return {"info": "saved"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/action", dependencies=[Depends(get_current_username)])
def file_action(req: ActionRequest):
    try:
        src = get_safe_path(req.source_path)
        if req.action == "delete":
            if src.is_dir(): shutil.rmtree(src)
            else: os.remove(src)
            return {"status": "deleted"}
        
        if req.action == "create_folder":
            new_folder_path = src / req.dest_path
            os.makedirs(new_folder_path, exist_ok=True)
            return {"status": "created"}

        if not req.dest_path: raise HTTPException(status_code=400, detail="Dest required")
        dest_dir = get_safe_path(req.dest_path)
        final_dest = dest_dir / src.name

        if req.action == "move": shutil.move(str(src), str(final_dest))
        elif req.action == "copy":
            if src.is_dir(): shutil.copytree(str(src), str(final_dest))
            else: shutil.copy2(str(src), str(final_dest))
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- SERVE FRONTEND ---
app.mount("/assets", StaticFiles(directory="static/assets"), name="assets")

@app.get("/")
async def read_index():
    return FileResponse("static/index.html")

@app.exception_handler(404)
async def not_found_handler(request, exc):
    if os.path.exists("static/index.html"):
        return FileResponse("static/index.html")
    return JSONResponse(status_code=404, content={"message": "Frontend not found"})

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8059)