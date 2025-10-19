from fastapi import FastAPI, UploadFile, File
import Transcription
from collections import Counter

app=FastAPI()

@app.post("/")
async def transcribe(file: UploadFile = File(...)):
    audio =  await file.read()

    #turns audio into string
    transcription = transcribe(audio)

    #gets metrics based on string
    average = countAverage(transcription)
    filler_words = countFiller(transcription)
    most_filler = countMostFiller(transcription)

    result = {
        "average": average,
        "filler_words": filler_words,
        "most_filler": most_filler
    }
    return {"message": result}


# Counts words in files
def countWords(TransFile):
    words=TransFile.split()
    return len(words)

# Words per minute
def countAverage(TransFile):
    return countWords(TransFile)/60

# Counts filler words
def countFiller(TransFile):
    words=TransFile.split()

    # Common filler phrases to check
    filler_set = set([
    "um", "uh", "like", "you know", "actually", 
    "basically", "literally", "so", "well", "right", 
    "kind of", "sort of"])
    
    detected = [w for w in words if w in filler_set]
    return len(detected)
    
# Most used filler word
def countMostFiller(detectedList):
    if len(detectedList)>0:
        filler_counts = Counter(detectedList)
        mostFiller, count = filler_counts.most_common(1)[0]
        topCount = mostFiller[0][1]  # highest frequency
        topFillers = [word for word, count in mostFiller if count == topCount]
    return topFillers