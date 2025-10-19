# Get words per min
# Follow word count
# Blank spaces
# Posteration
# set
# hashmaps
# Filler Words
import whisper

# Transcibes .wav to .txt
# Using OpenApis's whisper to transcribe
# Returns a String of words
def TranScribe(fileName: str): 
    model = whisper.load_model("base")
    
    result = model.transcribe(fileName)
    return result["text"].lower()
    print("Transcripted ")

