import os
import uuid
import tempfile
import traceback
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from utils.db import add_chunks_to_db, query_db
from utils.extractors import extract_from_pdf, extract_from_image, chunk_text
from utils.llm import generate_summary, answer_query

# NOTE: If using local whisper, ensure 'openai-whisper' and 'ffmpeg' are installed.
# To keep this demo lightweight, we can try to import it, but wrap it in try/except.
try:
    import whisper
    # Load base model. It will download the first time.
    whisper_model = whisper.load_model("base")
    HAS_WHISPER = True
except ImportError:
    HAS_WHISPER = False
    print("WARNING: whisper library not found. Audio transcription will not work.")

app = FastAPI(title="Voice RAG API")

# Allow requests from our React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to the frontend URL
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
    """Ingests raw text directly from the frontend."""
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
    """Ingests a PDF or Image file."""
    content = await file.read()
    filename = file.filename.lower()
    
    extracted_text = ""
    if filename.endswith(".pdf"):
        extracted_text = extract_from_pdf(content)
    elif filename.endswith((".png", ".jpg", ".jpeg")):
        extracted_text = extract_from_image(content)
    else:
        raise HTTPException(status_code=400, detail="Unsupported file type. Please upload a PDF or Image.")
        
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
    """Answers a text query based on the stored database context."""
    if not request.text:
        raise HTTPException(status_code=400, detail="Query cannot be empty.")
        
    context = query_db(request.text, n_results=3)
    
    if not context:
        return {"response": "I couldn't find any relevant information in the uploaded documents."}
        
    answer = answer_query(request.text, context)
    return {"response": answer}

@app.post("/clear")
async def clear_database():
    """Clears all documents from the vector database."""
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
    """Transcribes audio, queries the database, and returns the LLM answer."""
    if not HAS_WHISPER:
        raise HTTPException(status_code=501, detail="Whisper is not installed on the server.")
        
    # Save the uploaded audio to a temporary file for Whisper to read
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_audio:
            content = await audio.read()
            temp_audio.write(content)
            temp_audio_path = temp_audio.name
            
        # 1. Transcribe the audio
        transcription_result = whisper_model.transcribe(temp_audio_path)
        transcript = transcription_result["text"].strip()
        
        # Clean up temp file
        os.remove(temp_audio_path)
        
        if not transcript:
            return {"transcript": "", "response": "Sorry, I couldn't hear any speech."}
            
        # 2. Retrieve context
        context = query_db(transcript, n_results=3)
        
        # 3. Generate answer
        if not context:
            answer = "I couldn't find any relevant information in the uploaded documents."
        else:
            answer = answer_query(transcript, context)
            
        return {
            "transcript": transcript,
            "response": answer
        }
        
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
