from fastapi import FastAPI, UploadFile, File
from pydantic import BaseModel
from typing import Optional, Any
from compiler import compile

app = FastAPI() 

class APIResponse(BaseModel): 
    wordsPerMinute: str 
    clarity: str
    pacing: str
    filler: str
    tone: str

class CodeResponse(BaseModel): 
    response: Optional[str]
    error: Optional[str] 

class CodeRequest(BaseModel): 
    code: str 




@app.post("/submit")
async def upload_audio(file: UploadFile = File(...)):
    audio = await file.read()

@app.post("/run") 
async def echo(req: CodeRequest): 
    code = req.code 
    compile(code)
    



    


    