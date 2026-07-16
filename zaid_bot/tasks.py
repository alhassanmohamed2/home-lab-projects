from celery import Celery
import os

# Get Redis URL from environment or use default
REDIS_URL = os.getenv('CELERY_BROKER_URL', 'redis://redis:6379/0')

app = Celery('tasks', broker=REDIS_URL, backend=REDIS_URL)

@app.task
def add(x, y):
    return x + y

@app.task
def test_task(message):
    return f"Celery received: {message}"
