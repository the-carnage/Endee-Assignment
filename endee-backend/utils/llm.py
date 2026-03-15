import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

GEMINI_API_KEY = os.environ.get("GOOGLE_API_KEY")

if GEMINI_API_KEY and GEMINI_API_KEY != "your_gemini_api_key_here":
    genai.configure(api_key=GEMINI_API_KEY)
else:
    print("WARNING: GOOGLE_API_KEY is not set or is invalid.")

GEMINI_MODEL = "gemini-flash"
GEMINI_EMBEDDING_MODEL = "models/gemini-embedding-001"

model = genai.GenerativeModel(GEMINI_MODEL)

def generate_embedding(text: str, task_type: str = "RETRIEVAL_DOCUMENT") -> list:
    if not GEMINI_API_KEY or GEMINI_API_KEY == "your_gemini_api_key_here":
        return []
    try:
        result = genai.embed_content(
            model=GEMINI_EMBEDDING_MODEL,
            content=text,
            task_type=task_type,
            output_dimensionality=768,
        )
        return result["embedding"]
    except Exception as e:
        print(f"Error generating embedding: {e}")
        return []

def generate_summary(text: str) -> str:
    if not GEMINI_API_KEY or GEMINI_API_KEY == "your_gemini_api_key_here":
        return "Backend API Key missing or invalid. Upload successful but summary unavailable."

    prompt_text = text[:15000] if len(text) > 15000 else text

    prompt = f"Summarise the following text in 2-3 sentences:\n\n{prompt_text}"

    try:
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        print(f"Error generating summary: {e}")
        return f"Error: {str(e)}"

def rewrite_query(query: str, history: list = None) -> str:
    if not history or not GEMINI_API_KEY or GEMINI_API_KEY == "your_gemini_api_key_here":
        return query

    lines = []
    for msg in history[-6:]:
        role = "User" if msg.get("role") == "user" else "Assistant"
        lines.append(f"{role}: {msg.get('text', '')}")
    history_text = "\n".join(lines)

    prompt = (
        f"Given this conversation:\n{history_text}\n\n"
        f"The user's latest message is: \"{query}\"\n\n"
        f"Rewrite it as a single standalone search query that captures the full intent, "
        f"resolving all pronouns and references from the conversation. "
        f"Return ONLY the rewritten query, nothing else."
    )

    try:
        response = model.generate_content(prompt)
        rewritten = response.text.strip()
        return rewritten if rewritten else query
    except Exception:
        return query

def answer_query(query: str, context: str, history: list = None) -> str:
    if not GEMINI_API_KEY or GEMINI_API_KEY == "your_gemini_api_key_here":
        return "I cannot answer right now because the backend API key is missing or invalid."

    history_block = ""
    if history:
        lines = []
        for msg in history[-6:]:
            role = "User" if msg.get("role") == "user" else "Assistant"
            lines.append(f"{role}: {msg.get('text', '')}")
        history_block = "Conversation so far:\n" + "\n".join(lines) + "\n\n"

    prompt = (
        f"{history_block}"
        f"Answer the question using only the context below. "
        f"If the answer is not in the context, say you don't have enough information.\n\n"
        f"Context:\n{context}\n\nQuestion: {query}"
    )

    try:
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        print(f"Error answering query: {e}")
        return "I'm sorry, I encountered an error while processing your request."
