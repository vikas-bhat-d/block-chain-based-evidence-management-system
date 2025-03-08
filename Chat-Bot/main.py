from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai
import logging
from fastapi.responses import JSONResponse
logging.basicConfig(level=logging.DEBUG)  # Set logging level to DEBUG
logger = logging.getLogger(__name__)  # Create a logger instance

app = FastAPI()

# Allow CORS for all origins (for development purposes)
app.add_middleware(
    CORSMiddleware,
    allow_origins=['http://127.0.0.1:5500',"*"],  # Allow all origins for debugging purposes
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print(app)
logger.debug("GET request received at /") 


# Initialize Gemini AI model
api_key = 'AIzaSyDHue-USShZ-R-45asfNitt3D6569RayWQ'
genai.configure(api_key=api_key)
model = genai.GenerativeModel("gemini-2.0-flash")

class GeminiPrompt(BaseModel):
    prompt: str

@app.get("/hello",response_class=JSONResponse)
async def read_root():
    logger.debug("GET request received at /") 
    return {"message": "Hello, World!"}

@app.post("/process_prompt/")
async def process_prompt(prompt: GeminiPrompt):
    print("test")
    try:
        # response = model.generate_content(prompt=prompt.prompt)
        return {"response": "test"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.get("/health_check")
async def health_check():
    return {"Status":"ok"}
