from kronoslabs import KronosLabs
from dotenv import load_dotenv
import os

load_dotenv()

def llm_response(score, filler):
    api_key = os.getenv("KRONOS")
    client = KronosLabs(api_key=api_key)



    # Streaming chat completion with hermes model
    response = client.chat.completions.create(
        prompt=f"Respond to a user given this confidence score {score} and the most used filler word {filler}, give the user helpful feed back on technical interviews and how to improve",
        model="hermes",
        temperature=0.5,
        is_stream=False
    )

    return response.choices[0].message.content