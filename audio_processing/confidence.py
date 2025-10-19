import pydantic 
import torch
import librosa
from pydub import AudioSegment
import math
from transformers import Wav2Vec2ForSequenceClassification, Wav2Vec2FeatureExtractor

def emotion(model, extractor, audio):
    # Load and preprocess audio
    audio, sr = librosa.load(audio, sr=16000)
    inputs = extractor(audio, sampling_rate=16000, return_tensors="pt")

    # Predict emotion
    with torch.no_grad():
        logits = model(**inputs).logits
        predicted_class = torch.argmax(logits).item()

    # Map to emotion label
    labels = model.config.id2label

    pretty_labels = { 
        "LABEL_0": "2", 
        "LABEL_1": "5", 
        "LABEL_2": "3",
        "LABEL_3": "1",
        "LABEL_4": "6", 
        "LABEL_5": "4"
    }
    return pretty_labels[labels[predicted_class]]


