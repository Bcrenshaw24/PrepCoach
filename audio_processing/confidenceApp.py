from fastapi import FastAPI, UploadFile, File
import torch
import librosa
from transformers import Wav2Vec2ForSequenceClassification, Wav2Vec2FeatureExtractor
import confidence

app = FastAPI() 
model = Wav2Vec2ForSequenceClassification.from_pretrained("Khoa/w2v-speech-emotion-recognition")
extractor = Wav2Vec2FeatureExtractor.from_pretrained("Khoa/w2v-speech-emotion-recognition")


@app.post("/")
async def upload_audio(file: UploadFile = File(...)):
    audio = await file.read()
    emotion = confidence(model, extractor, audio)
    return {"message": emotion}
