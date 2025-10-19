from fastapi import FastAPI, UploadFile, File
import torch
import librosa
from transformers import Wav2Vec2ForSequenceClassification, Wav2Vec2FeatureExtractor
from confidence import emotion, chunk_wav_fixed

#app = FastAPI() 
model = Wav2Vec2ForSequenceClassification.from_pretrained("Khoa/w2v-speech-emotion-recognition")
extractor = Wav2Vec2FeatureExtractor.from_pretrained("Khoa/w2v-speech-emotion-recognition")


emotions = [] 
chunks = chunk_wav_fixed("/talking-people-6368.wav")
for i in chunks: 
    emotions.append(emotion(model,extractor, i))
    print(emotions[0])