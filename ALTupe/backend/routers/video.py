from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Header, Request, status
from fastapi.responses import StreamingResponse, Response
from sqlalchemy.orm import Session
from typing import List
import shutil
import os
import uuid
import crud, schemas, database, models
from routers import auth

router = APIRouter(
    prefix="/videos",
    tags=["videos"]
)

HDD_STORAGE_PATH = os.getenv("HDD_STORAGE_PATH", "/tmp/altupe_videos")
os.makedirs(HDD_STORAGE_PATH, exist_ok=True)

@router.post("/upload", response_model=schemas.Video)
def upload_video(
    title: str = Form(...),
    description: str = Form(None),
    file: UploadFile = File(...),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    # Generate unique filename
    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(HDD_STORAGE_PATH, unique_filename)

    # Save file to HDD
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not save video file: {e}")

    # Create video entry in DB
    video_create = schemas.VideoCreate(title=title, description=description)
    return crud.create_video(db=db, video=video_create, user_id=current_user.id, file_path=unique_filename)

@router.get("/", response_model=List[schemas.Video])
def read_videos(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db)):
    videos = crud.get_videos(db, skip=skip, limit=limit)
    return videos

@router.get("/{video_id}", response_model=schemas.Video)
def read_video(video_id: int, db: Session = Depends(database.get_db)):
    video_item = crud.get_video(db, video_id=video_id)
    if video_item is None:
        raise HTTPException(status_code=404, detail="Video not found")
    return video_item

@router.get("/stream/{video_file}")
def stream_video(video_file: str, request: Request, range: str = Header(None)):
    file_path = os.path.join(HDD_STORAGE_PATH, video_file)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Video not found")
    
    file_size = os.path.getsize(file_path)
    chunk_size = 1024 * 1024  # 1MB chunks

    start = 0
    end = file_size - 1

    if range:
        try:
            start_str, end_str = range.replace("bytes=", "").split("-")
            start = int(start_str)
            if end_str:
                end = int(end_str)
        except ValueError:
            pass  # Invalid range, default to full file (or could 416)
    
    # Ensure end is within bounds
    if start >= file_size or start < 0:
         # satisfiable range? strictly speaking 416, but let's be safe
         start = 0
         end = file_size - 1
    
    if end >= file_size:
        end = file_size - 1

    content_length = (end - start) + 1

    def iterfile():
        with open(file_path, "rb") as video:
            video.seek(start)
            bytes_remaining = content_length
            while bytes_remaining > 0:
                chunk = video.read(min(chunk_size, bytes_remaining))
                if not chunk:
                    break
                yield chunk
                bytes_remaining -= len(chunk)

    headers = {
        "Content-Range": f"bytes {start}-{end}/{file_size}",
        "Accept-Ranges": "bytes",
        "Content-Length": str(content_length),
        "Content-Type": "video/mp4",
    }

    return StreamingResponse(
        iterfile(),
        status_code=status.HTTP_206_PARTIAL_CONTENT,
        headers=headers,
        media_type="video/mp4"
    )

@router.post("/{video_id}/view")
def view_video(video_id: int, db: Session = Depends(database.get_db)):
    video = crud.increment_views(db, video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    return {"views": video.views}

@router.post("/{video_id}/like")
def like_video(
    video_id: int, 
    like: schemas.LikeCreate, 
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    return crud.create_like(db, like, current_user.id, video_id)

@router.get("/{video_id}/likes")
def get_video_likes(video_id: int, db: Session = Depends(database.get_db)):
    likes = crud.get_likes_by_video(db, video_id)
    return {
        "likes": len([l for l in likes if l.is_like]),
        "dislikes": len([l for l in likes if not l.is_like])
    }

@router.post("/{video_id}/comments", response_model=schemas.Comment)
def create_comment(
    video_id: int,
    comment: schemas.CommentCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    return crud.create_comment(db, comment, current_user.id, video_id)

@router.get("/{video_id}/comments", response_model=List[schemas.Comment])
def read_comments(
    video_id: int, 
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(database.get_db)
):
    return crud.get_comments_by_video(db, video_id, skip, limit)
