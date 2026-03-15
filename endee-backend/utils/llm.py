import os
from dotenv import load_dotenv
import google.generativeai as genai
from openai import OpenAI

load_dotenv()

GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
GEMINI_API_KEY = os.environ.get("GOOGLE_API_KEY")

if GEMINI_API_KEY and GEMINI_API_KEY != "your_gemini_api_key_here":
    genai.configure(api_key=GEMINI_API_KEY)
else:
    print("WARNING: GOOGLE_API_KEY is not set. Embeddings will not work.")

if GROQ_API_KEY and GROQ_API_KEY != "your_groq_api_key_here":
    groq_client = OpenAI(
        api_key=GROQ_API_KEY,
        base_url="https://api.groq.com/openai/v1"
    )
else:
    groq_client = None
    print("WARNING: GROQ_API_KEY is not set. LLM queries will not work.")

GROQ_MODEL = "openai/gpt-oss-120b"
GEMINI_EMBEDDING_MODEL = "models/gemini-embedding-001"

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
    if not groq_client:
        return "Backend API Key missing or invalid. Upload successful but summary unavailable."

    prompt_text = text[:15000] if len(text) > 15000 else text
    prompt = f"Summarise the following text in 2-3 sentences:\n\n{prompt_text}"

    try:
        response = groq_client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"Error generating summary: {e}")
        return f"Error: {str(e)}"

def rewrite_query(query: str, history: list = None) -> str:
    if not history or not groq_client:
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
        response = groq_client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.5,
        )
        rewritten = response.choices[0].message.content.strip()
        return rewritten if rewritten else query
    except Exception:
        return query

def answer_query(query: str, context: str, history: list = None) -> str:
    if not groq_client:
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
        response = groq_client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"Error answering query: {e}")
        return "I'm sorry, I encountered an error while processing your request."
