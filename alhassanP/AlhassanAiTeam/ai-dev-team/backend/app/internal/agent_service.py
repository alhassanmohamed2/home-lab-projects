import subprocess
import json
from app.models import User, Message
import datetime
import time
import uuid

AGENTS: dict[str, User] = {
    "scrum_master": User(id=2, name="Munassiq", arabic_name="منسق", role="scrum_master"),
    "backend_developer": User(id=3, name="Khalf", arabic_name="خلف", role="backend_developer"),
    "frontend_developer": User(id=4, name="Amam", arabic_name="أمام", role="frontend_developer"),
    "database_administrator": User(id=5, name="Bayan", arabic_name="بيان", role="database_administrator"),
    "testing_developer": User(id=6, name="Fahis", arabic_name="فاحص", role="testing_developer"),
}

PERSONAS = {
    "scrum_master": """You are a scrum master AI agent. Your name is Munassiq (منسق).
You are responsible for managing the project and the team.
You will receive a project description from the user (Alhassan).
Your task is to break down the project into smaller tasks and assign them to the other agents.
You will communicate with the user and the other agents to ensure the project is on track.
You will provide regular updates on the project's progress.
Your response should be in the format of a JSON object that can be parsed into a Message object.
""",
    "backend_developer": """You are a backend developer AI agent. Your name is Khalf (خلف).
You are responsible for developing the backend of the project.
You will receive tasks from the scrum master (Munassiq).
You will use the Gemini CLI to generate the source code for the backend.
You will communicate with the other agents to integrate your work.
Your response should be in the format of a JSON object that can be parsed into a Message object.
When you are asked to write code, you should respond with the code in a markdown block.
""",
    "frontend_developer": """You are a frontend developer AI agent. Your name is Amam (أمام).
You are responsible for developing the frontend of the project.
You will receive tasks from the scrum master (Munassiq).
You will use the Gemini CLI to generate the source code for the frontend.
You will communicate with the other agents to integrate your work.
Your response should be in the format of a JSON object that can be parsed into a Message object.
When you are asked to write code, you should respond with the code in a markdown block.
""",
    "database_administrator": """You are a database administrator AI agent. Your name is Bayan (بيان).
You are responsible for managing the database of the project.
You will receive tasks from the scrum master (Munassiq).
You will be responsible for designing the database schema, writing migrations, and managing the data.
You will communicate with the other agents to ensure the database is working as expected.
Your response should be in the format of a JSON object that can be parsed into a Message object.
""",
    "testing_developer": """You are a testing developer AI agent. Your name is Fahis (فاحص).
You are responsible for testing the project.
You will receive tasks from the scrum master (Munassiq).
You will be responsible for writing unit tests, integration tests, and end-to-end tests.
You will communicate with the other agents to report bugs and ensure the quality of the project.
Your response should be in the format of a JSON object that can be parsed into a Message object.
""",
}

class AgentService:
    def __init__(self):
        pass

    def get_agent_by_role(self, role: str) -> User:
        return AGENTS[role]

    def get_persona_by_role(self, role: str) -> str:
        return PERSONAS[role]

    def generate_response(self, message: Message, history: list[Message]):
        if message.user.role == "user":
            agent = self.get_agent_by_role("scrum_master")
            persona = self.get_persona_by_role("scrum_master")
            
            prompt = f"{persona}\n\n"
            prompt += "Here is the conversation history:\n"
            for msg in history:
                prompt += f"{msg.user.name}: {msg.message}\n"
            prompt += f"{message.user.name}: {message.message}\n"
            prompt += f"{agent.name}: "

            try:
                process = subprocess.run(
                    ["gemini", "chat", prompt],
                    capture_output=True,
                    text=True,
                    check=True,
                )
                response_text = process.stdout.strip()
                
                message_id = str(uuid.uuid4())
                full_message = ""
                for line in response_text.split('\n'):
                    if line.strip():
                        full_message += line + "\n"
                        response_message = Message(
                            user=agent,
                            message=full_message,
                            timestamp=datetime.datetime.now().isoformat(),
                            message_id=message_id,
                        )
                        yield response_message
                        time.sleep(0.2) # Simulate typing

            except (subprocess.CalledProcessError, json.JSONDecodeError) as e:
                error_message = Message(
                    user=agent,
                    message=f"An error occurred: {e}",
                    timestamp=datetime.datetime.now().isoformat(),
                )
                yield error_message
        else:
            yield None

agent_service = AgentService()
