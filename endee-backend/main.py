import json
import uuid
import traceback
from typing import Any

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from utils.db import EndeeError, add_chunks_to_db, check_db_health, clear_db, query_db
from utils.extractors import extract_from_pdf, extract_from_image, chunk_text
from utils.llm import (
    answer_query,
    generate_summary,
    is_ai_configured,
    rewrite_query,
    transcribe_audio,
)

app = FastAPI(title="Voice RAG API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TextIngestRequest(BaseModel):
    text: str
    task_type: str = "RETRIEVAL_DOCUMENT"

class QueryRequest(BaseModel):
    text: str
    history: list[dict[str, Any]] = Field(default_factory=list)


def _normalize_history(history: list[Any] | None) -> list[dict[str, str]]:
    if not history:
        return []

    normalized = []
    for item in history[-6:]:
        if not isinstance(item, dict):
            continue

        role = item.get("role", "user")
        text = str(item.get("text", "")).strip()
        if text:
            normalized.append({"role": role, "text": text})

    return normalized


def _handle_service_error(action: str, error: Exception) -> None:
    if isinstance(error, EndeeError):
        raise HTTPException(status_code=503, detail=str(error)) from error

    raise HTTPException(status_code=500, detail=f"{action} failed. {error}") from error

@app.get("/")
def read_root():
    return {
        "name": "Endee Voice RAG API",
        "status": "ok",
        "docs": "/docs",
    }


@app.get("/health")
def health_check():
    endee_connected, endee_message = check_db_health()
    ai_configured = is_ai_configured()
    status = "ok" if endee_connected else "degraded"

    return {
        "status": status,
        "backend": {"status": "ok", "message": "API is reachable."},
        "endee": {
            "status": "ok" if endee_connected else "error",
            "connected": endee_connected,
            "message": endee_message,
        },
        "ai": {
            "status": "ok" if ai_configured else "warning",
            "configured": ai_configured,
            "message": (
                "Gemini is configured."
                if ai_configured
                else "GOOGLE_API_KEY is missing. Summaries, embeddings, and answers are unavailable."
            ),
        },
    }

@app.post("/ingest/text")
async def ingest_text(request: TextIngestRequest):
    text = request.text.strip()
    if len(text) < 30:
        raise HTTPException(status_code=400, detail="Text is too short.")

    source_id = str(uuid.uuid4())
    chunks = chunk_text(text)

    try:
        num_indexed = add_chunks_to_db(chunks, source_id, request.task_type)
        summary = generate_summary(text)
    except Exception as error:
        _handle_service_error("Text ingestion", error)

    return {
        "status": "success",
        "doc_id": source_id,
        "chunks_indexed": num_indexed,
        "summary": summary
    }

@app.post("/ingest/file")
async def ingest_file(file: UploadFile = File(...), task_type: str = Form(default="RETRIEVAL_DOCUMENT")):
    content = await file.read()
    filename = (file.filename or "upload").lower()

    extracted_text = ""
    if filename.endswith(".pdf"):
        extracted_text = extract_from_pdf(content)
    elif filename.endswith((".png", ".jpg", ".jpeg")):
        extracted_text = extract_from_image(content)
    else:
        raise HTTPException(status_code=400, detail="Unsupported file type. Please upload a PDF or image.")

    if not extracted_text.strip():
        raise HTTPException(status_code=400, detail="Could not extract any text from the file.")

    source_id = str(uuid.uuid4())
    chunks = chunk_text(extracted_text)

    try:
        num_indexed = add_chunks_to_db(chunks, source_id, task_type)
        summary = generate_summary(extracted_text)
    except Exception as error:
        _handle_service_error("File ingestion", error)

    return {
        "status": "success",
        "doc_id": source_id,
        "filename": file.filename,
        "chunks_indexed": num_indexed,
        "summary": summary
    }

@app.post("/query/text")
async def query_text(request: QueryRequest):
    query_text = request.text.strip()
    if not query_text:
        raise HTTPException(status_code=400, detail="Query cannot be empty.")

    history = _normalize_history(request.history)

    try:
        search_query = rewrite_query(query_text, history)
        context = query_db(search_query, n_results=3)
    except Exception as error:
        _handle_service_error("Query processing", error)

    if not context:
        return {"response": "I couldn't find any relevant information in the uploaded documents."}

    answer = answer_query(query_text, context, history)
    return {"response": answer}

@app.post("/clear")
async def clear_database():
    try:
        clear_db()
        return {"status": "success", "message": "Database cleared."}
    except Exception as error:
        _handle_service_error("Database reset", error)

@app.post("/query/voice")
async def query_voice(audio: UploadFile = File(...), history: str = Form(default="[]")):
    try:
        chat_history = json.loads(history)
    except (json.JSONDecodeError, TypeError):
        chat_history = []

    try:
        transcript = transcribe_audio(
            await audio.read(),
            mime_type=audio.content_type,
        )

        if not transcript:
            return {"transcript": "", "response": "Sorry, I couldn't hear any speech."}

        normalized_history = _normalize_history(chat_history)
        search_query = rewrite_query(transcript, normalized_history)
        context = query_db(search_query, n_results=3)
        if not context:
            answer = "I couldn't find any relevant information in the uploaded documents."
        else:
            answer = answer_query(transcript, context, normalized_history)

        return {"transcript": transcript, "response": answer}

    except Exception as error:
        traceback.print_exc()
        _handle_service_error("Voice query", error)
