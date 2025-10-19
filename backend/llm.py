from kronoslabs import KronosLabs
from dotenv import load_dotenv
import os

load_dotenv()

def llm_response(score, filler):
    api_key = os.getenv("KRONOS")
    client = KronosLabs(api_key=api_key)



    # Streaming chat completion with hermes model
    response = client.chat.completions.create(
        prompt=f"Respond giving feedback on a users confidence given theis confidence score and the most used filler word {filler}, give the user helpful feed back on technical interviews",
        model="hermes",
        temperature=0.5,
        is_stream=False
    )

    return response.choices[0].message.content