from fastapi import FastAPI, UploadFile, File, HTTPException
from transformers import AutoModelForCausalLM, AutoProcessor
from PIL import Image
import io
import torch

app = FastAPI(title="LightOnOCR Service")

# Global variables for model
model = None
processor = None

MODEL_ID = "lightonai/LightOnOCR-2-1B"

@app.on_event("startup")
async def load_model():
    global model, processor
    print(f"Loading model: {MODEL_ID}...")
    try:
        processor = AutoProcessor.from_pretrained(MODEL_ID, trust_remote_code=True)
        model = AutoModelForCausalLM.from_pretrained(
            MODEL_ID,
            trust_remote_code=True,
            device_map="auto", # Effectively uses CPU if no GPU
            torch_dtype=torch.float32 # Use float32 for CPU compatibility
        )
        print("Model loaded successfully!")
    except Exception as e:
        print(f"Failed to load model: {str(e)}")
        raise e

@app.post("/ocr")
async def perform_ocr(file: UploadFile = File(...)):
    if not model or not processor:
        raise HTTPException(status_code=503, detail="Model not initialized")
    
    try:
        # Read image file
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        
        # Prepare input
        # Note: Chat template usage might vary, but standard generation for VLMs usually follows this
        # Using a simple prompt for OCR if the model expects one, or just the image.
        # Checking documentation dynamic behavior via creating a generic user prompt.
        
        # Based on standard usage for recent VLMs (like Qwen-VL which this might be based on):
        text_prompt = "Convert the text in this image to markdown."
        
        inputs = processor(images=image, text=text_prompt, return_tensors="pt")
        
        # Generate
        generated_ids = model.generate(**inputs, max_new_tokens=512)
        generated_text = processor.batch_decode(generated_ids, skip_special_tokens=True)[0]
        
        return {"text": generated_text}
        
    except Exception as e:
        print(f"Error processing image: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
def health_check():
    if model:
        return {"status": "ready"}
    return {"status": "loading"}
