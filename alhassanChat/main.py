from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
import requests

app = FastAPI()

# --- CONFIGURATION ---
# Changed to a base URL so we can access both /api/chat and /api/tags
OLLAMA_BASE_URL = "http://192.168.1.100:11434"

# --- FANCY UI (HTML + CSS + VANILLA JS ONLY) ---
HTML_CONTENT = r"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Local AI Studio</title>
    
    <style>
        :root {
            --bg-color: #1e1e2e;
            --chat-bg: #181825;
            --user-msg: #89b4fa;
            --bot-msg: #313244;
            --text-color: #cdd6f4;
            --border-color: #45475a;
            --code-bg: #11111b;
        }

        body {
            font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: var(--bg-color);
            color: var(--text-color);
            margin: 0;
            display: flex;
            justify-content: center;
            height: 100vh;
        }

        .container {
            width: 100%;
            max-width: 800px;
            display: flex;
            flex-direction: column;
            height: 100vh;
            background: var(--chat-bg);
            box-shadow: 0 0 20px rgba(0,0,0,0.5);
        }

        .header {
            padding: 15px 20px;
            text-align: center;
            border-bottom: 1px solid var(--border-color);
            font-size: 1.2rem;
            font-weight: bold;
            background: var(--code-bg);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 15px;
        }

        /* Styling for the Model Dropdown */
        select {
            background: var(--bg-color);
            color: var(--text-color);
            border: 1px solid var(--border-color);
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 1rem;
            font-family: inherit;
            cursor: pointer;
            outline: none;
            transition: border-color 0.2s;
        }

        select:focus {
            border-color: var(--user-msg);
        }

        #chatbox {
            flex: 1;
            padding: 20px;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 15px;
        }

        .msg-wrapper {
            display: flex;
            flex-direction: column;
            max-width: 85%;
        }

        .msg-wrapper.user { align-self: flex-end; }
        .msg-wrapper.bot { align-self: flex-start; }

        .msg-label {
            font-size: 0.8rem;
            margin-bottom: 4px;
            color: #a6adc8;
            padding: 0 5px;
        }

        .msg {
            padding: 12px 18px;
            border-radius: 8px;
            line-height: 1.6;
            word-wrap: break-word;
        }

        .user .msg {
            background-color: var(--user-msg);
            color: #11111b;
            border-bottom-right-radius: 0;
        }

        .bot .msg {
            background-color: var(--bot-msg);
            border-bottom-left-radius: 0;
        }

        .code-container {
            background: var(--code-bg);
            border: 1px solid var(--border-color);
            border-radius: 6px;
            margin: 10px 0;
            overflow: hidden;
        }

        .code-lang {
            background: rgba(255, 255, 255, 0.05);
            color: #a6adc8;
            padding: 5px 10px;
            font-size: 0.8rem;
            font-family: monospace;
            border-bottom: 1px solid var(--border-color);
        }

        .code-container pre {
            margin: 0;
            padding: 15px;
            overflow-x: auto;
        }

        .code-container code {
            font-family: Consolas, Monaco, monospace;
            color: #cdd6f4;
            font-size: 0.95rem;
        }

        .inline-code {
            background: var(--code-bg);
            padding: 2px 6px;
            border-radius: 4px;
            font-family: Consolas, Monaco, monospace;
            color: #f38ba8;
            font-size: 0.9em;
        }

        .input-area {
            padding: 20px;
            background: var(--code-bg);
            border-top: 1px solid var(--border-color);
            display: flex;
            gap: 10px;
        }

        textarea {
            flex: 1;
            padding: 12px;
            border: 1px solid var(--border-color);
            border-radius: 6px;
            background: var(--bg-color);
            color: var(--text-color);
            resize: none;
            height: 24px;
            font-family: inherit;
        }
        
        textarea:focus { outline: 1px solid var(--user-msg); }

        button {
            padding: 0 24px;
            background: var(--user-msg);
            color: #11111b;
            border: none;
            border-radius: 6px;
            font-weight: bold;
            cursor: pointer;
            transition: opacity 0.2s;
        }

        button:hover { opacity: 0.8; }
        button:disabled { opacity: 0.5; cursor: not-allowed; }

        .typing-indicator { font-style: italic; color: #a6adc8; font-size: 0.9rem; display: none; padding: 0 20px; }
    </style>
</head>
<body>

    <div class="container">
        <div class="header">
            🤖 
            <select id="modelSelect">
                <option value="">Loading models...</option>
            </select>
            Studio
        </div>
        <div id="chatbox"></div>
        <div class="typing-indicator" id="typing">Thinking...</div>
        <div class="input-area">
            <textarea id="msgInput" placeholder="Type a message... (Shift+Enter for new line)" onkeydown="handleKeyDown(event)"></textarea>
            <button id="sendBtn" onclick="sendMessage()">Send</button>
        </div>
    </div>

    <script>
        let conversationHistory = [];

        // Fetch available models when the page loads
        async function loadModels() {
            const select = document.getElementById('modelSelect');
            try {
                const response = await fetch('/models');
                const data = await response.json();
                
                select.innerHTML = ''; // Clear loading text
                
                if (data.models && data.models.length > 0) {
                    data.models.forEach(model => {
                        const option = document.createElement('option');
                        option.value = model;
                        option.textContent = model;
                        
                        // Default to qwen2.5:3b if it exists
                        if (model === 'qwen2.5:3b') option.selected = true;
                        
                        select.appendChild(option);
                    });
                } else {
                    select.innerHTML = '<option value="">No models found</option>';
                    select.disabled = true;
                }
            } catch (error) {
                select.innerHTML = '<option value="">Error connecting to server</option>';
                select.disabled = true;
                console.error("Failed to fetch models:", error);
            }
        }

        // Call loadModels immediately when script runs
        loadModels();

        // Custom Offline Markdown Parser
        function parseMarkdown(text) {
            if (!text) return "";
            let safeText = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            const codeBlocks = [];
            safeText = safeText.replace(/^```([\w-]*)\n([\s\S]*?)^```/gm, function(match, lang, code) {
                const index = codeBlocks.length;
                const langHeader = lang ? `<div class="code-lang">${lang}</div>` : '';
                codeBlocks.push(`<div class="code-container">${langHeader}<pre><code>${code}</code></pre></div>`);
                return `___CODEBLOCK_${index}___`;
            });
            const inlineCodes = [];
            safeText = safeText.replace(/`([^`]+)`/g, function(match, code) {
                const index = inlineCodes.length;
                inlineCodes.push(`<span class="inline-code">${code}</span>`);
                return `___INLINECODE_${index}___`;
            });
            safeText = safeText.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
            safeText = safeText.replace(/\*([^*]+)\*/g, '<em>$1</em>');
            safeText = safeText.replace(/\n/g, '<br>');
            inlineCodes.forEach((block, i) => {
                safeText = safeText.replace(`___INLINECODE_${i}___`, () => block);
            });
            codeBlocks.forEach((block, i) => {
                safeText = safeText.replace(`___CODEBLOCK_${i}___`, () => block);
            });
            return safeText;
        }

        async function sendMessage() {
            const input = document.getElementById('msgInput');
            const chatbox = document.getElementById('chatbox');
            const typing = document.getElementById('typing');
            const btn = document.getElementById('sendBtn');
            const modelSelect = document.getElementById('modelSelect');
            
            const text = input.value.trim();
            const selectedModel = modelSelect.value;
            
            if (!text || !selectedModel) return;
            
            conversationHistory.push({ role: "user", content: text });
            
            const safeUserText = text.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
            appendHTMLMessage("You", safeUserText, "user");
            
            input.value = '';
            typing.style.display = 'block';
            btn.disabled = true;
            modelSelect.disabled = true; // Disable model change during generation
            chatbox.scrollTop = chatbox.scrollHeight;

            try {
                const response = await fetch('/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    // Send both the selected model AND the message history
                    body: JSON.stringify({ 
                        model: selectedModel,
                        messages: conversationHistory 
                    })
                });
                
                const data = await response.json();
                const reply = data.reply;

                conversationHistory.push({ role: "assistant", content: reply });
                
                const htmlReply = parseMarkdown(reply);
                // Dynamically show the name of the model that replied
                appendHTMLMessage(selectedModel.split(':')[0], htmlReply, "bot");

            } catch (error) {
                appendHTMLMessage("System", "<span style='color:#f38ba8;'>Connection Error to Backend.</span>", "bot");
            } finally {
                typing.style.display = 'none';
                btn.disabled = false;
                modelSelect.disabled = false;
                chatbox.scrollTop = chatbox.scrollHeight;
                input.focus();
            }
        }

        function appendHTMLMessage(sender, htmlContent, type) {
            const chatbox = document.getElementById('chatbox');
            const wrapper = document.createElement('div');
            wrapper.className = `msg-wrapper ${type}`;
            
            wrapper.innerHTML = `
                <div class="msg-label">${sender}</div>
                <div class="msg">${htmlContent}</div>
            `;
            chatbox.appendChild(wrapper);
        }

        function handleKeyDown(event) {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                sendMessage();
            }
        }
    </script>
</body>
</html>
"""

@app.get("/", response_class=HTMLResponse)
def serve_ui():
    return HTML_CONTENT

# --- NEW ROUTE: FETCH MODELS ---
@app.get("/models")
def get_models():
    """Fetches the list of installed models from Ollama."""
    try:
        url = f"{OLLAMA_BASE_URL}/api/tags"
        response = requests.get(url, timeout=5)
        response.raise_for_status()
        data = response.json()
        
        # Extract just the 'name' attribute from the models list
        model_names = [m["name"] for m in data.get("models", [])]
        return {"models": model_names}
    except requests.exceptions.RequestException as e:
        print(f"Error fetching models: {e}")
        return {"models": []}

# --- UPDATED CLASSES: ACCEPT 'MODEL' FROM FRONTEND ---
class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    model: str # The backend now expects the frontend to tell it which model to use
    messages: list[Message]

@app.post("/chat")
def chat_with_model(req: ChatRequest):
    messages_list = [{"role": msg.role, "content": msg.content} for msg in req.messages]
    
    payload = {
        "model": req.model, # Use the model requested by the frontend dropdown
        "messages": messages_list,
        "stream": False 
    }
    
    try:
        url = f"{OLLAMA_BASE_URL}/api/chat"
        response = requests.post(url, json=payload)
        response.raise_for_status() 
        data = response.json()
        
        reply = data.get("message", {}).get("content", "Error: No content returned")
        return {"reply": reply}
        
    except requests.exceptions.RequestException as e:
        return {"reply": f"Connection Error: {str(e)}"}