import os
from dotenv import load_dotenv
from google import genai

load_dotenv()

GEMINI_API_KEY = os.environ.get("GOOGLE_API_KEY")

try:
    if GEMINI_API_KEY and GEMINI_API_KEY != "your_gemini_api_key_here":
        client = genai.Client(api_key=GEMINI_API_KEY)
    else:
        client = None
        print("WARNING: GOOGLE_API_KEY is not set or is invalid.")
except Exception as e:
    client = None
    print(f"WARNING: Failed to initialize Gemini Client: {e}")

MODEL_NAME = 'gemini-1.5-flash'

def generate_summary(text: str) -> str:
    """Generates a brief auto-summary of the ingested document."""
    if not client:
        return "Backend API Key missing or invalid. Upload successful but summary unavailable."
        
    prompt_text = text[:15000] if len(text) > 15000 else text
    
    prompt = f"""
    Please provide a very brief (2-3 sentences) summary of the following text.
    Focus on the main topic and purpose of the document.
    
    Text:
    {prompt_text}
    """
    
    try:
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=prompt,
        )
        return response.text.strip()
    except Exception as e:
        print(f"Error generating summary: {e}")
        return f"Error: {str(e)}"

def answer_query(query: str, context: str) -> str:
    """Answers a user query based solely on the provided context retrieved from the db."""
    if not client:
        return "I cannot answer right now because the backend API key is missing or invalid."
        
    prompt = f"""
    You are a helpful Voice RAG Assistant. 
    Answer the user's question using ONLY the provided context. 
    If the answer is not contained within the context, say "I don't have enough information from the uploaded documents to answer that." 
    Keep your answers conversational, concise, and easy to listen to, as they may be read aloud by text-to-speech.

    Context:
    {context}
    
    User Query:
    {query}
    """
    
    try:
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=prompt,
        )
        return response.text.strip()
    except Exception as e:
        print(f"Error answering query: {e}")
        return "I'm sorry, I encountered an error while processing your request."
