from fastapi import FastAPI, UploadFile, File
import torch
import librosa
import asyncio
from transformers import Wav2Vec2ForSequenceClassification, Wav2Vec2FeatureExtractor
from pydub import AudioSegment
from confidence import emotion
from io import BytesIO

app = FastAPI() 
model = Wav2Vec2ForSequenceClassification.from_pretrained("Khoa/w2v-speech-emotion-recognition")
extractor = Wav2Vec2FeatureExtractor.from_pretrained("Khoa/w2v-speech-emotion-recognition")

@app.post("/")
async def upload_audio(file: UploadFile = File(...)):
    audio = await file.read()
    confidence = await interval_emotions(audio)
    return {"message": confidence}

# --- Split audio into intervals and analyze ---
async def interval_emotions(file_bytes: bytes, segment_seconds: int = 30):
    audio = AudioSegment.from_file(BytesIO(file_bytes), format="wav")
    results = []

    # Convert segment length to milliseconds
    segment_length_ms = segment_seconds * 1000

    # Split audio into segments
    segments = [audio[i:i + segment_length_ms] for i in range(0, len(audio), segment_length_ms)]

    # Process each segment
    for segment in segments:
        buf = BytesIO()
        segment.export(buf, format="wav")
        buf.seek(0)
        emo = await asyncio.to_thread(emotion, model, extractor, buf)
        results.append(int(emo))

    return results