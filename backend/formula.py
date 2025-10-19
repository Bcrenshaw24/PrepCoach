import math

# Emotion weights
EMOTION_WEIGHT = {
    "LABEL_4": 6,  # Happiness
    "LABEL_1": 5,  # Anger
    "LABEL_5": 4,  # Neutral
    "LABEL_2": 3,  # Disgust
    "LABEL_0": 2,  # Sadness
    "LABEL_3": 1   # Fear
}

def wpm_score(wpm):
    return 6 * math.exp(-((wpm - 130) ** 2) / (2 * 40 ** 2))

def filler_score(fillers):
    return max(0, 6 - 0.5 * fillers)

def emotion_score(chunks):
    total = 0
    for c in chunks:
        total += c
    return total / len(chunks)

def confidence_score(wpm, fillers, emotion_chunks):
    w = wpm_score(wpm)
    f = filler_score(fillers)
    e = emotion_score(emotion_chunks)
    total = 0.4 * w + 0.4 * e + 0.2 * f
    return (total / 6) * 100
