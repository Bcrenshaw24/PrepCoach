import Transcription
from fastapi import FastAPI 
import Transcription
from collections import Counter

app=FastAPI()

@app.post("/")

#Counts words in files
def countWords(TransFile):
    words=TransFile.split()
    return len(words)

#words per minute
def countAverage(TransFile):
    return countWords(TransFile)/60

#counts filler words
def countFiller(TransFile):
    words=TransFile.split()
    filler_set = set([
    "um", "uh", "like", "you know", "actually", 
    "basically", "literally", "so", "well", "right", 
    "kind of", "sort of"])
    detected = [w for w in words if w in filler_set]
    return detected
    
#most used filler
def countMostFiller(detectedList):
    if 