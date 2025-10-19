from kronoslabs import KronosLabs
from dotenv import load_dotenv
import os

load_dotenv()
api_key = os.getenv("KRONOS")
client = KronosLabs(api_key=api_key)



# Streaming chat completion with hermes model
stream = client.chat.completions.create(
    prompt="Hows your day",
    model="hermes",
    temperature=0.7,
    is_stream=True
)

for chunk in stream:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="")