FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Optional runtime package for image OCR via pytesseract.
RUN apt-get update && apt-get install -y --no-install-recommends tesseract-ocr \
    && rm -rf /var/lib/apt/lists/*

COPY . .

RUN python -m pip install --upgrade pip \
    && (python -m pip install -r requirements.txt \
    || python -m pip install -r Requirements.txt \
    || python -m pip install -r endee-backend/requirements.txt \
    || python -m pip install -r endee-backend/Requirements.txt)

CMD ["sh", "-c", "cd /app/endee-backend 2>/dev/null || true; python -m uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
