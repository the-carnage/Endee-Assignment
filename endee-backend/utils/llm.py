import os
from functools import lru_cache

from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

# API key
api_key = os.environ.get("GOOGLE_API_KEY")
# Models
LLM_MODEL = os.environ.get("GEMINI_LLM_MODEL", "models/gemini-2.5-flash")
EMBEDDING_MODEL = os.environ.get("GEMINI_EMBEDDING_MODEL", "models/gemini-embedding-001")
TRANSCRIPTION_MODEL = os.environ.get("GEMINI_TRANSCRIPTION_MODEL", "")
DEFAULT_TRANSCRIPTION_MODELS = (
    TRANSCRIPTION_MODEL,
    "models/gemini-2.5-flash",
    LLM_MODEL,
    "models/gemini-2.0-flash",
    "models/gemini-2.0-flash-001",
    "models/gemini-flash-latest",
)

# Client
if api_key:
    genai.configure(api_key=api_key)
    llm = genai.GenerativeModel(LLM_MODEL)
else:
    llm = None
    print("WARNING: GOOGLE_API_KEY is not set. All AI features will not work.")


def is_ai_configured() -> bool:
    return bool(api_key and llm)


def _response_text(response) -> str:
    text = getattr(response, "text", "") or ""
    return text.strip()


@lru_cache(maxsize=1)
def _available_generate_content_models() -> set[str]:
    if not api_key:
        return set()

    try:
        return {
            model.name
            for model in genai.list_models()
            if "generateContent" in (getattr(model, "supported_generation_methods", []) or [])
        }
    except Exception as error:
        print(f"Error listing Gemini models: {error}")
        return set()


def _transcription_model_candidates() -> list[str]:
    available_models = _available_generate_content_models()
    candidates: list[str] = []

    for model_name in DEFAULT_TRANSCRIPTION_MODELS:
        if not model_name or model_name in candidates:
            continue
        if available_models and model_name not in available_models:
            continue
        candidates.append(model_name)

    if candidates:
        return candidates

    fallback_candidates: list[str] = []
    for model_name in DEFAULT_TRANSCRIPTION_MODELS:
        if model_name and model_name not in fallback_candidates:
            fallback_candidates.append(model_name)

    return fallback_candidates


def _is_retryable_model_error(error: Exception) -> bool:
    message = str(error).lower()
    return (
        "not found" in message
        or "not supported for generatecontent" in message
        or "unsupported" in message
    )


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
        return _response_text(response)
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
        rewritten = _response_text(response)
        return rewritten if rewritten else query
    except Exception:
        return query


def transcribe_audio(file_bytes: bytes, mime_type: str | None = None) -> str:
    if not api_key:
        raise RuntimeError("GOOGLE_API_KEY is not set. Voice transcription unavailable.")

    safe_mime_type = mime_type or "audio/webm"
    prompt = "Transcribe this audio exactly as spoken. Return only the spoken words, nothing else."
    last_error = None

    for model_name in _transcription_model_candidates():
        try:
            audio_model = genai.GenerativeModel(model_name)
            response = audio_model.generate_content([
                prompt,
                {"mime_type": safe_mime_type, "data": file_bytes},
            ])
            return _response_text(response)
        except Exception as error:
            last_error = error
            print(f"Transcription error with {model_name}: {error}")
            if not _is_retryable_model_error(error):
                break

    raise RuntimeError(f"Audio transcription failed: {last_error}")

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
        return _response_text(response)
    except Exception as e:
        print(f"Error answering query: {e}")
        return "I'm sorry, I encountered an error while processing your request."
