from fastapi import FastAPI
from database import engine, Base
import models


from routers import auth, video

# Create tables on startup
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="ALTupe API")

app.include_router(auth.router)
app.include_router(video.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to ALTupe API"}
