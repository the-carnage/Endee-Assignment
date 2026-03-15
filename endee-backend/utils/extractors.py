import io
from pypdf import PdfReader
from PIL import Image
import pytesseract

def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> list[str]:
    """
    Splits a large text into smaller overlapping chunks.
    This simple implementation splits by words for better readability.
    """
    words = text.split()
    if not words:
        return []
        
    chunks = []
    i = 0
    while i < len(words):
        chunk_words = words[i:i + chunk_size]
        chunk = " ".join(chunk_words)
        chunks.append(chunk)
        i += chunk_size - overlap
        
    return chunks

def extract_from_pdf(file_bytes: bytes) -> str:
    """Extracts text from a PDF file."""
    try:
        pdf = PdfReader(io.BytesIO(file_bytes))
        text = ""
        for page in pdf.pages:
            extracted = page.extract_text()
            if extracted:
                text += extracted + "\n"
        return text.strip()
    except Exception as e:
        print(f"Failed to extract PDF: {e}")
        return ""

def extract_from_image(file_bytes: bytes) -> str:
    """Extracts text from an image using Tesseract OCR."""
    try:
        image = Image.open(io.BytesIO(file_bytes))
        text = pytesseract.image_to_string(image)
        return text.strip()
    except Exception as e:
        print(f"Failed to extract Image text: {e}")
        return ""
