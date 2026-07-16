from sqlalchemy.orm import Session
import models
import schemas
import auth

def get_user(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()


def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = auth.get_password_hash(user.password)
    db_user = models.User(
        email=user.email,
        username=user.username,
        hashed_password=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def get_videos(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Video).offset(skip).limit(limit).all()

def create_video(db: Session, video: schemas.VideoCreate, user_id: int, file_path: str, thumbnail_path: str = None):
    db_video = models.Video(
        **video.dict(),
        file_path=file_path,
        thumbnail_path=thumbnail_path,
        user_id=user_id
    )
    db.add(db_video)
    db.commit()
    db.refresh(db_video)
    return db_video

def get_video(db: Session, video_id: int):
    return db.query(models.Video).filter(models.Video.id == video_id).first()

def increment_views(db: Session, video_id: int):
    video = db.query(models.Video).filter(models.Video.id == video_id).first()
    if video:
        video.views += 1
        db.commit()
        db.refresh(video)
    return video

def create_like(db: Session, like: schemas.LikeCreate, user_id: int, video_id: int):
    # Check if exists
    existing_like = db.query(models.Like).filter(
        models.Like.user_id == user_id,
        models.Like.video_id == video_id
    ).first()
    
    if existing_like:
        if existing_like.is_like == like.is_like:
            # Toggle off if same
            db.delete(existing_like)
            db.commit()
            return None
        else:
            # Change status
            existing_like.is_like = like.is_like
            db.commit()
            db.refresh(existing_like)
            return existing_like
    
    db_like = models.Like(**like.dict(), user_id=user_id, video_id=video_id)
    db.add(db_like)
    db.commit()
    db.refresh(db_like)
    return db_like

def get_likes_by_video(db: Session, video_id: int):
    return db.query(models.Like).filter(models.Like.video_id == video_id).all()

def create_comment(db: Session, comment: schemas.CommentCreate, user_id: int, video_id: int):
    db_comment = models.Comment(**comment.dict(), user_id=user_id, video_id=video_id)
    db.add(db_comment)
    db.commit()
    db.refresh(db_comment)
    return db_comment

def get_comments_by_video(db: Session, video_id: int, skip: int = 0, limit: int = 100):
    return db.query(models.Comment).filter(models.Comment.video_id == video_id)\
        .order_by(models.Comment.created_at.desc()).offset(skip).limit(limit).all()
