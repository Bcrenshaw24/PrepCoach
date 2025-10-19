from fastapi import FastAPI, UploadFile, File
from pydantic import BaseModel
from typing import Optional, Any
import requests
from moviepy import VideoFileClip
import tempfile
from llm import llm_response
from formula import confidence_score

def convert_uploaded_mp4_to_wav(mp4_file_path: str, wav_output_path: str):
    video = VideoFileClip(mp4_file_path)
    video.audio.write_audiofile(wav_output_path)

app = FastAPI()
codes = [] 

class APIResponse(BaseModel): 
    wordsPerMinute: str 
    clarity: str
    pacing: str
    filler: str
    tone: str


@app.post("/submit")
async def upload_audio(file: UploadFile = File(...)):
    video = await file.read()
    audio = convert_uploaded_mp4_to_wav(video)
    chunks = requests.get("https://api.example.com")
    trans = requests.get()
    conf = confidence_score(140, 4, chunks)
    response = llm(confidence, trans.get(0))
   





def convert_mp4_bytes_to_wav_bytes(mp4_bytes):
    with tempfile.NamedTemporaryFile(suffix=".mp4") as temp_mp4:
        temp_mp4.write(mp4_bytes)
        temp_mp4.flush()

        video = VideoFileClip(temp_mp4.name)
        with tempfile.NamedTemporaryFile(suffix=".wav") as temp_wav:
            video.audio.write_audiofile(temp_wav.name)
            temp_wav.seek(0)
            return temp_wav.read()
    