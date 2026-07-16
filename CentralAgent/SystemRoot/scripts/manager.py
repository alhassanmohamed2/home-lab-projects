import os
import shutil
import subprocess
import json
import argparse
from pathlib import Path

# Configuration - Modify these or use command line args
CENTRAL_ROOT = Path("/home/alhassan/CentralAgent/SystemRoot")
PROJECTS_DIR = CENTRAL_ROOT / "projects"
PROJECT_CONFIG_FILE = CENTRAL_ROOT / "project_config.json"

def get_projects(projects_dir):
    """Scans the projects directory for subdirectories containing Dockerfiles."""
    projects = []
    if not projects_dir.exists():
        return projects
        
    for item in projects_dir.iterdir():
        if item.is_dir() and (item / "Dockerfile").exists():
            projects.append(item.name)
        elif item.is_dir() and (item / "docker-compose.yml").exists(): # Also check for compose
             projects.append(item.name)
    return projects

def update_project_config(projects):
    """Updates the JSON config file for Jenkins to read."""
    config = {"projects": projects}
    with open(PROJECT_CONFIG_FILE, 'w') as f:
        json.dump(config, f, indent=4)
    print(f"Updated {PROJECT_CONFIG_FILE} with {len(projects)} projects.")

def run_git_command(command, cwd=CENTRAL_ROOT):
    """Runs a git command in the central root."""
    try:
        subprocess.run(command, cwd=cwd, check=True, shell=True)
    except subprocess.CalledProcessError as e:
        print(f"Error running git command: {e}")

def initialize_git(repo_url=None):
    """Initializes git repo if not exists."""
    if not (CENTRAL_ROOT / ".git").exists():
        print("Initializing Git repository...")
        run_git_command("git init")
        run_git_command("git branch -M main")
        if repo_url:
            run_git_command(f"git remote add origin {repo_url}")
    
    # Create .gitignore
    gitignore_path = CENTRAL_ROOT / ".gitignore"
    if not gitignore_path.exists():
        with open(gitignore_path, "w") as f:
            f.write("infrastructure/jenkins_home/\n__pycache__/\n*.log\n")

def commit_and_push(message="Auto-update projects"):
    """Adds, commits, and pushes changes."""
    run_git_command("git add .")
    # Only commit if there are changes
    try:
        subprocess.run("git diff --staged --quiet", cwd=CENTRAL_ROOT, shell=True, check=True)
        print("No changes to commit.")
    except subprocess.CalledProcessError:
        run_git_command(f'git commit -m "{message}"')
        run_git_command("git push -u origin main")

def import_projects(source_dir):
    """Copies projects from source_dir to the central projects dir."""
    source_path = Path(source_dir)
    if not source_path.exists():
        print(f"Source directory {source_path} does not exist.")
        return

    for item in source_path.iterdir():
        if item.is_dir():
            target_path = PROJECTS_DIR / item.name
            if not target_path.exists():
                print(f"Importing {item.name}...")
                shutil.copytree(item, target_path)
            else:
                print(f"Project {item.name} already exists. Skipping.")

def main():
    parser = argparse.ArgumentParser(description="Central Agent Project Manager")
    parser.add_argument("--import-dir", help="Directory to import projects from")
    parser.add_argument("--repo-url", help="GitHub Repository URL")
    parser.add_argument("--push", action="store_true", help="Push changes to remote")
    
    args = parser.parse_args()

    # Ensure directories exist
    PROJECTS_DIR.mkdir(parents=True, exist_ok=True)

    if args.repo_url:
        initialize_git(args.repo_url)
    elif not (CENTRAL_ROOT / ".git").exists():
        # Init without remote if not provided yet
        initialize_git()

    if args.import_dir:
        import_projects(args.import_dir)

    # Scan and Update Config
    current_projects = get_projects(PROJECTS_DIR)
    update_project_config(current_projects)

    if args.push:
        commit_and_push()

if __name__ == "__main__":
    main()
