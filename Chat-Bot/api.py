import google.generativeai as genai
class api:
    # text to send
    # API key
    api_key = 'AIzaSyDHue-USShZ-R-45asfNitt3D6569RayWQ'
    @classmethod
    def combine(cls):
        # Combine api_send and prompt_text into the prompt
        # combined_prompt = f"{api_send}\n{cls.prompt_text}"
        prompt_text = """Hi """
        # beautiful soup -> library 
    # Configure the Google Generative AI
        genai.configure(api_key=cls.api_key)
        model = genai.GenerativeModel("gemini-2.0-flash")

    # Generate content using the combined prompt
        while(True):
            # print("trigger") after
            prompt_text =  input("Enter reply ") 
            response = model.generate_content(prompt_text)
            print(response.text)


if __name__ == "__main__":
    api.combine()