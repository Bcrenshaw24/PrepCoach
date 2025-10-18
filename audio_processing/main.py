from transformers import Wav2Vec2ForSequenceClassification, Wav2Vec2FeatureExtractor
import torch
import librosa

# Load model and feature extractor
model = Wav2Vec2ForSequenceClassification.from_pretrained("Khoa/w2v-speech-emotion-recognition")
extractor = Wav2Vec2FeatureExtractor.from_pretrained("Khoa/w2v-speech-emotion-recognition")

# Load and preprocess audio
audio, sr = librosa.load("audio_processing/test_audio/test_1.wav", sr=16000)
inputs = extractor(audio, sampling_rate=16000, return_tensors="pt")

# Predict emotion
with torch.no_grad():
    logits = model(**inputs).logits
    predicted_class = torch.argmax(logits).item()

# Map to emotion label
labels = model.config.id2label
print("Predicted emotion:", labels[predicted_class])
