# FAISS Research Copilot

A polished voice-and-text RAG workspace built on top of a FAISS-based vector database workflow. The app lets a reviewer upload a PDF, image, or pasted text, index it into FAISS, and ask grounded follow-up questions through typed prompts or voice input.

## Problem Statement

The goal of this project is to turn raw documents into a practical retrieval workflow that feels closer to a production AI tool than a demo:

- make the indexing and question-answering path obvious
- keep answers grounded in the active source
- expose backend, FAISS, and model readiness in the UI
- support both text and voice queries without fragile UX

## What This Build Focuses On

- Single active knowledge base: each new upload replaces the previous document, which keeps retrieval focused and predictable.
- Clear system health: the frontend reads a dedicated `/health` endpoint so backend, FAISS, and Gemini issues are visible before a user hits an error.
- Safer backend behavior: ingest only clears the FAISS index once embeddings are actually ready, which avoids wiping the last working source on a failed upload.
- Better UX: no blocking `alert()` flow, cleaner reset behavior, text and voice query support in one place, and a layout that works on both desktop and mobile.

## Architecture

```text
React (Vite)
  -> source upload / query UI
  -> calls FastAPI endpoints

FastAPI
  -> extracts text from PDF/image/plain text
  -> creates Gemini embeddings
  -> stores chunks in FAISS
  -> rewrites queries and generates final answers

FAISS
  -> stores chunk embeddings
  -> returns nearest-neighbor matches for retrieval
```

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19 + Vite |
| Backend | FastAPI |
| Embeddings | Gemini `gemini-embedding-001` |
| Answer generation | Gemini `gemini-2.0-flash` |
| Voice transcription | Gemini audio input |
| Vector database | FAISS |

## Project Structure

```text
Endee-Assignment/
├── endee/                  # Existing Endee source tree kept as-is
├── backend/                # FastAPI API and tests
├── frontend/               # React app
└── README.md
```

## Local Setup

### 1. Start the vector store locally from source

No Docker is required for this project.

Apple Silicon:

```bash
cd endee
cmake -S . -B build-neon -DUSE_NEON=ON
cmake --build build-neon -j4
./run.sh binary_file=./build-neon/ndd-neon-darwin
```

Intel / AMD:

```bash
cd endee
cmake -S . -B build-avx2 -DUSE_AVX2=ON
cmake --build build-avx2 -j4
./run.sh binary_file=./build-avx2/ndd-avx2
```

The current local vector store service listens on `http://localhost:8080`.

### 2. Start the backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r Requirements.txt
cp .env.example .env
uvicorn main:app --reload --port 8000
```

### 3. Start the frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:5173`.

## Railway Backend Deploy

1. Create a Railway service from this repo and set the service root directory to `backend`.
2. Use the included `nixpacks.toml` (or set Build Command manually) so Railway installs backend dependencies.
3. Start command:

```bash
python -m uvicorn main:app --host 0.0.0.0 --port $PORT
```

4. Add environment variables in Railway:

```env
GOOGLE_API_KEY=your_gemini_api_key
GEMINI_TRANSCRIPTION_MODEL=models/gemini-2.5-flash
ENDEE_BASE_URL=<public_or_private_reachable_endee_url>
ENDEE_AUTH_TOKEN=
```

5. Set health check path to `/health`.

Important: `ENDEE_BASE_URL` cannot be `http://localhost:8080` when backend runs on Railway.

## Environment Variables

### `backend/.env`

```env
GOOGLE_API_KEY=your_gemini_api_key
ENDEE_BASE_URL=http://localhost:8080
# Leave blank unless vector-store auth is enabled.
ENDEE_AUTH_TOKEN=
```

### `frontend/.env`

```env
VITE_API_URL=http://127.0.0.1:8010
```

## API Endpoints

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Backend, FAISS, and Gemini readiness |
| `POST` | `/ingest/text` | Index pasted text |
| `POST` | `/ingest/file` | Index a PDF or image |
| `POST` | `/query/text` | Ask a text question |
| `POST` | `/query/voice` | Ask a voice question |
| `POST` | `/clear` | Clear the active FAISS index |

## How Retrieval Works

1. The uploaded source is converted into plain text.
2. The text is chunked into retrieval-sized segments.
3. Gemini embeddings are generated per chunk.
4. Chunks are inserted into FAISS under a single collection.
5. A user question is optionally rewritten into a better retrieval query.
6. FAISS returns the most relevant chunks.
7. Gemini answers using only the retrieved context.

## Verification

Backend tests:

```bash
cd backend
./venv/bin/python -m unittest discover -s tests -v
```

Frontend quality checks:

```bash
cd frontend
npm run lint
npm run build
```

Runtime health check:

```bash
curl http://localhost:8000/health
```

## Notes

- The UI intentionally shows only one active indexed source at a time because the current backend clears and replaces the FAISS collection on each ingest.
- If port `8010` is already in use on your machine, start the backend on another port and update `VITE_API_URL` in `frontend/.env`.
- OCR support for images depends on `pytesseract` and a local Tesseract installation being available.
