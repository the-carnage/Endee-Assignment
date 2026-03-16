# Endee Voice RAG

A voice and text-based Retrieval-Augmented Generation (RAG) app. Upload a document, then ask questions about it using your voice or by typing — powered by Google Gemini and the Endee vector database.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite |
| Backend | FastAPI (Python) |
| LLM + Embeddings | Google Gemini (`gemini-2.0-flash`, `gemini-embedding-001`) |
| Voice Transcription | Google Gemini (audio upload) |
| Vector Database | [Endee](https://endee.io) (`endeeio/endee-server`) |

## Project Structure

```
Endee-Assignment/
├── endee-frontend/        # React app (Vite)
│   ├── src/
│   └── .env               # VITE_API_URL (not committed)
├── endee-backend/         # FastAPI backend
│   ├── main.py
│   ├── utils/
│   │   ├── llm.py         # Gemini LLM + embeddings + transcription
│   │   ├── db.py          # Endee vector DB client
│   │   └── extractors.py  # PDF / image text extraction
│   └── .env               # API keys (not committed)
└── endee/                 # Endee DB docker-compose
```

## Ports

| Service | Port |
|---------|------|
| Frontend (dev) | `5173` |
| Backend (FastAPI) | `8000` |
| Endee Vector DB | `8080` |

## Prerequisites

- Python 3.10+
- Node.js 18+
- Docker (for Endee vector DB)
- Google API key (Gemini)

## Setup

### 1. Start Endee Vector DB

```bash
cd endee
docker compose up -d
```

### 2. Backend

```bash
cd endee-backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env and fill in your GOOGLE_API_KEY

uvicorn main:app --reload --port 8000
```

### 3. Frontend

```bash
cd endee-frontend
npm install

cp .env.example .env
# .env already set to http://localhost:8000

npm run dev
```

Open `http://localhost:5173`

## Environment Variables

### `endee-backend/.env`

```
GOOGLE_API_KEY=your_google_api_key_here
ENDEE_BASE_URL=http://localhost:8080
ENDEE_AUTH_TOKEN=
```

### `endee-frontend/.env`

```
VITE_API_URL=http://localhost:8000
```

## How It Works

1. **Upload** a PDF, image, or paste text
2. Text is chunked, embedded via Gemini, and stored in Endee
3. **Ask** a question by voice or text
4. Voice is transcribed by Gemini, query is embedded and searched in Endee
5. Top matching chunks are passed to Gemini to generate an answer
