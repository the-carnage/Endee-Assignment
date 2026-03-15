import os
import uuid
import tempfile
import traceback
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from utils.db import add_chunks_to_db, query_db
from utils.extractors import extract_from_pdf, extract_from_image, chunk_text
from utils.llm import generate_summary, answer_query

try:
    import whisper
    whisper_model = whisper.load_model("base")
    HAS_WHISPER = True
except ImportError:
    HAS_WHISPER = False
    print("WARNING: whisper not found. Voice queries will not work.")

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

class QueryRequest(BaseModel):
    text: str

@app.get("/")
def read_root():
    return {"status": "Backend is running."}

@app.post("/ingest/text")
async def ingest_text(request: TextIngestRequest):
    if not request.text or len(request.text) < 10:
        raise HTTPException(status_code=400, detail="Text is too short.")

    source_id = str(uuid.uuid4())
    chunks = chunk_text(request.text)
    num_indexed = add_chunks_to_db(chunks, source_id)
    summary = generate_summary(request.text)

    return {
        "status": "success",
        "doc_id": source_id,
        "chunks_indexed": num_indexed,
        "summary": summary
    }

@app.post("/ingest/file")
async def ingest_file(file: UploadFile = File(...)):
    content = await file.read()
    filename = file.filename.lower()

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
    num_indexed = add_chunks_to_db(chunks, source_id)
    summary = generate_summary(extracted_text)

    return {
        "status": "success",
        "doc_id": source_id,
        "filename": file.filename,
        "chunks_indexed": num_indexed,
        "summary": summary
    }

@app.post("/query/text")
async def query_text(request: QueryRequest):
    if not request.text:
        raise HTTPException(status_code=400, detail="Query cannot be empty.")

    context = query_db(request.text, n_results=3)
    if not context:
        return {"response": "I couldn't find any relevant information in the uploaded documents."}

    answer = answer_query(request.text, context)
    return {"response": answer}

@app.post("/clear")
async def clear_database():
    try:
        from utils.db import collection
        existing_data = collection.get()
        if existing_data and existing_data["ids"]:
            collection.delete(ids=existing_data["ids"])
        return {"status": "success", "message": "Database cleared."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/query/voice")
async def query_voice(audio: UploadFile = File(...)):
    if not HAS_WHISPER:
        raise HTTPException(status_code=501, detail="Whisper is not installed on the server.")

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp:
            tmp.write(await audio.read())
            tmp_path = tmp.name

        result = whisper_model.transcribe(tmp_path)
        transcript = result["text"].strip()
        os.remove(tmp_path)

        if not transcript:
            return {"transcript": "", "response": "Sorry, I couldn't hear any speech."}

        context = query_db(transcript, n_results=3)
        if not context:
            answer = "I couldn't find any relevant information in the uploaded documents."
        else:
            answer = answer_query(transcript, context)

        return {"transcript": transcript, "response": answer}

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
