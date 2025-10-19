
#Test Cases
import Transcription
import TranscriptionApp
FileName = "tes1.wav"
TransFile = Transcription.TranScribe(FileName)
print("Transcribed sentence:"+ TransFile)
print("--------------")
print("Word Count: "+str(TranscriptionApp.countWords(TransFile)))
print("--------------")
print("Count Average: "+str(TranscriptionApp.countAverage(TransFile)))
print("--------------")
print("Count Filler: "+str(TranscriptionApp.countFiller(TransFile)))
print("--------------")