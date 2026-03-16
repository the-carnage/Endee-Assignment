import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

# API key
api_key = os.environ.get("GOOGLE_API_KEY")
# Models
LLM_MODEL       = "models/gemini-2.0-flash"
EMBEDDING_MODEL = "models/gemini-embedding-001"

# Client
if api_key:
    genai.configure(api_key=api_key)
    llm = genai.GenerativeModel(LLM_MODEL)
else:
    llm = None
    print("WARNING: GOOGLE_API_KEY is not set. All AI features will not work.")


def generate_embedding(text: str, task_type: str = "RETRIEVAL_DOCUMENT") -> list:
    if not api_key:
        return []
    try:
        result = genai.embed_content(
            model=EMBEDDING_MODEL,
            content=text,
            task_type=task_type
        )
        return result["embedding"]
    except Exception as e:
        print(f"Error generating embedding: {e}")
        return []

def generate_summary(text: str) -> str:
    if not llm:
        return "Backend API Key missing. Upload successful but summary unavailable."

    prompt_text = text[:15000] if len(text) > 15000 else text
    try:
        response = llm.generate_content(f"Summarise the following text in 2-3 sentences:\n\n{prompt_text}")
        return response.text.strip()
    except Exception as e:
        print(f"Error generating summary: {e}")
        return f"Error: {str(e)}"

def rewrite_query(query: str, history: list = None) -> str:
    if not history or not llm:
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
        response = llm.generate_content(prompt)
        rewritten = response.text.strip()
        return rewritten if rewritten else query
    except Exception:
        return query

def transcribe_audio(file_path: str) -> str:
    if not llm:
        raise RuntimeError("GOOGLE_API_KEY is not set. Voice transcription unavailable.")
    audio_file = genai.upload_file(file_path)
    response = llm.generate_content(["Transcribe this audio exactly as spoken. Return only the spoken words, nothing else.", audio_file])
    return response.text.strip()

def answer_query(query: str, context: str, history: list = None) -> str:
    if not llm:
        return "I cannot answer right now because the backend API key is missing."

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
        response = llm.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        print(f"Error answering query: {e}")
        return "I'm sorry, I encountered an error while processing your request."
