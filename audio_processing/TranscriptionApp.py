#Returns String counts
#Returns avg
#Returns Amount
#Returns Filler Words 
import Transcription
FileName = "audio_processing/output.wav"
testString = Transcription.TranScribe(FileName)
print(testString)

from fastapi import FastAPI 
import Transcription

app=FastAPI()

@app.get("/")


FileName = "output.wav"
testString = Transcription.TranScribe("apple")