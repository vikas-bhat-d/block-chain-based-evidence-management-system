from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai
import logging
from fastapi.responses import JSONResponse

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=['http://127.0.0.1:5500', "*"],
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

@app.get("/hello", response_class=JSONResponse)
async def read_root(response: Response):
    logger.debug("GET request received at /")
    response.headers["Custom-Header"] = "HelloHeader"
    return {"message": "Hello, World!"}

@app.post("/process_prompt/")
async def process_prompt(prompt: GeminiPrompt, response: Response):
    print("test")
    try:
        # response = model.generate_content(prompt=prompt.prompt)
        response.headers["Custom-Header"] = "PromptHeader"
        return {"response": "test"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health_check")
async def health_check(response: Response):
    response.headers["Custom-Header"] = "HealthHeader"
    return {"Status": "ok"}