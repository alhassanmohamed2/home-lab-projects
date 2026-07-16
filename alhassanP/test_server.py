from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
import uvicorn
import os

app = FastAPI()

# Mount a "static" folder to serve images
# Ensure your images are inside ./static/
if not os.path.exists("static"):
    os.makedirs("static")

# Move or copy alhassan1.png and alhassan2.png into ./static/
app.mount("/static", StaticFiles(directory="static"), name="static")

# Sample images URL
IMAGE1 = "/static/alhassan1.png"
IMAGE3 = "/static/alhassan2.png"
IMAGE2 = "https://images.pexels.com/photos/247599/pexels-photo-247599.jpeg"

@app.get("/", response_class=HTMLResponse)
async def read_root():
    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>My Beautiful Page</title>
        <style>
            body {{
                font-family: Arial, sans-serif;
                background: linear-gradient(to right, #74ebd5, #ACB6E5);
                color: #333;
                text-align: center;
                padding: 50px;
            }}
            h1 {{
                color: #fff;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
            }}
            p {{
                font-size: 1.2em;
                margin-bottom: 30px;
            }}
            .images {{
                display: flex;
                justify-content: center;
                gap: 20px;
		flex-wrap: wrap;
            }}
            img {{
                border-radius: 10px;
                box-shadow: 0px 4px 15px rgba(0,0,0,0.3);
            }}
            a.button {{
                display: inline-block;
                padding: 10px 20px;
                background-color: #ff7e5f;
                color: #fff;
                text-decoration: none;
                border-radius: 5px;
                font-weight: bold;
                transition: 0.3s;
            }}
            a.button:hover {{
                background-color: #feb47b;
            }}
        </style>
    </head>
    <body>
        <h1>Welcome to Alhassan Personal Server!</h1>
        <p>This is a sample page for testing Alhassan Server</p>
        <div class="images">
            <img src="{IMAGE1}" width=200 height=200 alt="Image 1">
            <img src="{IMAGE2}" width=200 height=200 alt="Image 2">
            <img src="{IMAGE3}" width=200 height=200 alt="Image 3">
        </div>
        <p><a href="#" class="button">Click Me!</a></p>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8085)
