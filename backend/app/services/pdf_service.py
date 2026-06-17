import fitz  # PyMuPDF
import hashlib
import os
from typing import List, Tuple
from app.core.config import settings


class PDFService:
    def __init__(self):
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    def extract_text(self, file_path: str) -> Tuple[str, int]:
        """Extract full text from PDF and return (text, page_count)."""
        doc = fitz.open(file_path)
        full_text = ""
        for page in doc:
            full_text += page.get_text() + "\n\n"
        page_count = len(doc)
        doc.close()
        return full_text.strip(), page_count

    def extract_pages(self, file_path: str) -> List[dict]:
        """Extract text per page with metadata."""
        doc = fitz.open(file_path)
        pages = []
        for i, page in enumerate(doc):
            pages.append({
                "page_number": i + 1,
                "text": page.get_text().strip(),
                "width": page.rect.width,
                "height": page.rect.height,
            })
        doc.close()
        return pages

    def chunk_text(self, text: str, chunk_size: int = 1500, overlap: int = 200) -> List[dict]:
        """Split text into overlapping chunks for embedding."""
        chunks = []
        words = text.split()
        if not words:
            return chunks

        current_pos = 0
        chunk_index = 0

        while current_pos < len(words):
            end_pos = min(current_pos + chunk_size, len(words))
            chunk_words = words[current_pos:end_pos]
            chunk_text = " ".join(chunk_words)

            chunks.append({
                "chunk_index": chunk_index,
                "content": chunk_text,
                "word_count": len(chunk_words),
            })

            chunk_index += 1
            current_pos += chunk_size - overlap

            if end_pos >= len(words):
                break

        return chunks

    def chunk_pages(self, pages: List[dict], chunk_size: int = 1500, overlap: int = 200) -> List[dict]:
        """Chunk text while preserving page number references."""
        chunks = []
        chunk_index = 0
        buffer = ""
        buffer_page = 1

        for page in pages:
            text = page["text"]
            page_num = page["page_number"]

            if not text.strip():
                continue

            buffer += " " + text
            words = buffer.split()

            while len(words) >= chunk_size:
                chunk_words = words[:chunk_size]
                chunks.append({
                    "chunk_index": chunk_index,
                    "content": " ".join(chunk_words),
                    "page_number": buffer_page,
                    "word_count": len(chunk_words),
                })
                chunk_index += 1
                words = words[chunk_size - overlap:]
                buffer_page = page_num

            buffer = " ".join(words)
            if not buffer.strip():
                buffer_page = page_num + 1

        if buffer.strip():
            chunks.append({
                "chunk_index": chunk_index,
                "content": buffer.strip(),
                "page_number": buffer_page,
                "word_count": len(buffer.split()),
            })

        return chunks

    @staticmethod
    def compute_hash(file_path: str) -> str:
        sha256 = hashlib.sha256()
        with open(file_path, "rb") as f:
            for block in iter(lambda: f.read(4096), b""):
                sha256.update(block)
        return sha256.hexdigest()

    @staticmethod
    def get_file_size(file_path: str) -> int:
        return os.path.getsize(file_path)


pdf_service = PDFService()
