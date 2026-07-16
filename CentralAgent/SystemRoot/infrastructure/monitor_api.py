from fastapi import FastAPI, HTTPException
import docker
import psutil
import requests
import os

app = FastAPI()

# Connect to Docker Socket (requires mount)
try:
    client = docker.from_env()
except Exception as e:
    print(f"Warning: Docker not available: {e}")
    client = None

JENKINS_URL = os.getenv("JENKINS_URL", "http://jenkins:8080")
JENKINS_USER = os.getenv("JENKINS_USER", "admin")
JENKINS_TOKEN = os.getenv("JENKINS_TOKEN", "password")

@app.get("/")
def health_check():
    return {"status": "Agent API Operational"}

@app.get("/system/status")
def get_system_status():
    """Returns CPU, Memory, and Disk usage."""
    return {
        "cpu_percent": psutil.cpu_percent(),
        "memory_percent": psutil.virtual_memory().percent,
        "disk_percent": psutil.disk_usage('/').percent
    }

@app.get("/docker/containers")
def get_docker_containers():
    """Returns list of running containers."""
    if not client:
        raise HTTPException(status_code=503, detail="Docker unavailable")
    
    containers = []
    for container in client.containers.list():
        containers.append({
            "name": container.name,
            "status": container.status,
            "image": container.image.tags[0] if container.image.tags else "none"
        })
    return {"count": len(containers), "containers": containers}

@app.get("/jenkins/jobs")
def get_jenkins_jobs():
    """Proxies request to Jenkins to get job status."""
    try:
        # Basic auth wrapper
        auth = (JENKINS_USER, JENKINS_TOKEN) if JENKINS_TOKEN else None
        resp = requests.get(f"{JENKINS_URL}/api/json?tree=jobs[name,color]", auth=auth)
        return resp.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
