import http.client
from dotenv import load_dotenv
import os
import json
import base64

load_dotenv()
api_key = os.getenv("COMPILER")
def compile(code):
    test_cases = [{"stdin": "[3,2,4]", "expected_output": "[1,2]\n" }, 
                  {"stdin": "[2,7,11,15]", "expected_output": "[0,1]"}, 
                  {"stdin": "[3,3]", "expected_output": "[0,1]"}]
    conn = http.client.HTTPSConnection("judge0-ce.p.rapidapi.com")
    source_code = f'''
    {code}
    '''
    payload = json.dumps({
        "language_id": 71,
        "source_code": source_code
    })

    headers = {
        'x-rapidapi-key': api_key,
        'x-rapidapi-host': "judge0-ce.p.rapidapi.com",
        'Content-Type': "application/json"
    }

    conn.request("POST", "/submissions?base64_encoded=false&wait=true&fields=*", payload, headers)
    res = conn.getresponse()
    data = res.read()

    # Parse and print response
    response = json.loads(data.decode("utf-8"))
    print("stdout:", response.get("stdout", ""))
    print("stderr:", response.get("stderr", ""))
    
