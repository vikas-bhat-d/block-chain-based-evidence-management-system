import requests
import time
import google.generativeai as genai

url = "http://127.0.0.1:8000/process_prompt/"

api_key = 'AIzaSyDHue-USShZ-R-45asfNitt3D6569RayWQ'

genai.configure(api_key=api_key)

model = genai.GenerativeModel("gemini-2.0-flash")



while True:
    prompt = input("Enter Prompt: ")
    response = model.generate_content(prompt=prompt)
    result = send_prompt(response)
    print(result)
    time.sleep(5)  # Wait for 5 seconds before sending the next prompt
