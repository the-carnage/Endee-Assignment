import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

# Initialize Gemini
GEMINI_API_KEY = os.environ.get("GOOGLE_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
else:
    print("WARNING: GOOGLE_API_KEY is not set in the environment or .env file.")

# We use gemini-1.5-flash for fast text reasoning
model = genai.GenerativeModel('gemini-1.5-flash')

def generate_summary(text: str) -> str:
    """Generates a brief auto-summary of the ingested document."""
    if not GEMINI_API_KEY:
        return "Backend API Key missing. Upload successful but summary unavailable."
        
    # Truncate text if it's wildly long to avoid token limits just for a summary
    prompt_text = text[:15000] if len(text) > 15000 else text
    
    prompt = f"""
    Please provide a very brief (2-3 sentences) summary of the following text.
    Focus on the main topic and purpose of the document.
    
    Text:
    {prompt_text}
    """
    
    try:
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        print(f"Error generating summary: {e}")
        return "Document indexed successfully."

def answer_query(query: str, context: str) -> str:
    """Answers a user query based solely on the provided context retrieved from the db."""
    if not GEMINI_API_KEY:
        return "I cannot answer right now because the backend API key is missing."
        
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
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        print(f"Error answering query: {e}")
        return "I'm sorry, I encountered an error while processing your request."
