import pytest
from fastapi.testclient import TestClient
import Transcription
import TranscriptionApp
import confidence
import confidenceApp
from transformers import Wav2Vec2ForSequenceClassification, Wav2Vec2FeatureExtractor

FILLER_SET = {"um", "uh", "like", "you know", "actually", 
              "basically", "literally", "so", "well", "right", 
              "kind of", "sort of"}

------------------- FIXTURES -------------------
@pytest.fixture(scope="module")
def transcript():
    """Fixture that returns the transcribed text from an audio file."""
    audio_file = "Test.wav"
    result = Transcription.TranScribe(audio_file)
    assert isinstance(result, str)
    assert len(result) > 0
    return result.lower()

@pytest.fixture(scope="module")
def test_client():
    return TestClient(confidence.app)

@pytest.fixture(scope="module")
def model_and_extractor():
    model = Wav2Vec2ForSequenceClassification.from_pretrained(
        "Khoa/w2v-speech-emotion-recognition"
    )
    extractor = Wav2Vec2FeatureExtractor.from_pretrained(
        "Khoa/w2v-speech-emotion-recognition"
    )
    return model, extractor

------------------- TESTS -------------------
def test_transcription_output(transcript):
    assert isinstance(transcript, str)
    assert transcript == transcript.lower()

def test_count_words(transcript):
    count = TranscriptionApp.countWords(transcript)
    assert isinstance(count, int)
    assert count > 0

def test_averagevpm(transcript):
    average = TranscriptionApp.countAverage(transcript)
    assert isinstance(average, float)
    assert average > 0

def test_filler_detection(transcript):
    fillers = TranscriptionApp.countFiller(transcript)
    assert isinstance(fillers, list)
    for f in fillers:
        assert f in FILLER_SET

def test_filler_example():
    example_transcript = "Um I was like going to the store and uh then I left"
    fillers = TranscriptionApp.countFiller(example_transcript)
    assert isinstance(fillers, list)
    for f in fillers:
        assert f in FILLER_SET
    assert len(fillers) > 0
