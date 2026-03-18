FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Optional runtime package for image OCR via pytesseract.
RUN apt-get update && apt-get install -y --no-install-recommends tesseract-ocr \
    && rm -rf /var/lib/apt/lists/*

# Accept either `requirements.txt` or `Requirements.txt`.
COPY [Rr]equirements.txt ./Requirements.txt
RUN python -m pip install --upgrade pip \
    && python -m pip install -r Requirements.txt

COPY . .

CMD ["sh", "-c", "python -m uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
