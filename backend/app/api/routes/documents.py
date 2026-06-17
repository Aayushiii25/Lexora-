import os
import uuid
import logging
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from app.core.database import get_db
from app.core.config import settings
from app.models import Document, DocumentChunk
from app.schemas import DocumentResponse, DocumentListResponse
from app.services.pdf_service import pdf_service
from app.services.embedding_service import embedding_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/documents", tags=["documents"])


@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """Upload a PDF document for processing."""
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    content = await file.read()
    file_size = len(content)

    if file_size > settings.MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"File exceeds {settings.MAX_FILE_SIZE_MB}MB limit")

    # Save file
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    file_id = str(uuid.uuid4())
    safe_filename = f"{file_id}.pdf"
    file_path = os.path.join(settings.UPLOAD_DIR, safe_filename)

    with open(file_path, "wb") as f:
        f.write(content)

    # Create document record
    doc = Document(
        id=uuid.UUID(file_id),
        filename=safe_filename,
        original_filename=file.filename,
        file_size=file_size,
        upload_status="processing",
        content_hash=pdf_service.compute_hash(file_path),
        file_path=file_path,
    )
    db.add(doc)
    await db.flush()

    try:
        # Extract text
        pages = pdf_service.extract_pages(file_path)
        doc.page_count = len(pages)

        # Chunk text
        chunks = pdf_service.chunk_pages(pages)

        # Store chunks in PostgreSQL
        db_chunks = []
        for chunk in chunks:
            db_chunk = DocumentChunk(
                document_id=doc.id,
                chunk_index=chunk["chunk_index"],
                content=chunk["content"],
                page_number=chunk.get("page_number", 0),
            )
            db_chunks.append(db_chunk)
        db.add_all(db_chunks)

        # Generate embeddings and store in ChromaDB
        texts = [chunk["content"] for chunk in chunks]
        embeddings = embedding_service.generate_embeddings(texts)
        embedding_ids = embedding_service.store_embeddings(file_id, chunks, embeddings)

        # Update chunk embedding IDs
        for i, db_chunk in enumerate(db_chunks):
            db_chunk.embedding_id = embedding_ids[i]

        doc.upload_status = "completed"

    except Exception as e:
        logger.error(f"Error processing document: {e}")
        doc.upload_status = "failed"
        raise HTTPException(status_code=500, detail=f"Document processing failed: {str(e)}")

    await db.flush()
    return doc


@router.get("", response_model=DocumentListResponse)
async def list_documents(
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    """List all documents."""
    count_result = await db.execute(select(func.count(Document.id)))
    total = count_result.scalar()

    result = await db.execute(
        select(Document).order_by(Document.created_at.desc()).offset(skip).limit(limit)
    )
    documents = result.scalars().all()

    return DocumentListResponse(documents=documents, total=total)


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get document details."""
    result = await db.execute(
        select(Document).where(Document.id == uuid.UUID(document_id))
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@router.delete("/{document_id}")
async def delete_document(
    document_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Delete a document and its associated data."""
    result = await db.execute(
        select(Document).where(Document.id == uuid.UUID(document_id))
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Delete file
    if doc.file_path and os.path.exists(doc.file_path):
        os.remove(doc.file_path)

    # Delete ChromaDB embeddings
    embedding_service.delete_document_embeddings(document_id)

    # Delete from DB (cascades to chunks, analyses, chat messages)
    await db.delete(doc)

    return {"status": "deleted", "document_id": document_id}


@router.get("/{document_id}/text")
async def get_document_text(
    document_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get the extracted text of a document."""
    result = await db.execute(
        select(Document).where(Document.id == uuid.UUID(document_id))
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Get chunks ordered by index
    chunks_result = await db.execute(
        select(DocumentChunk)
        .where(DocumentChunk.document_id == doc.id)
        .order_by(DocumentChunk.chunk_index)
    )
    chunks = chunks_result.scalars().all()

    return {
        "document_id": document_id,
        "filename": doc.original_filename,
        "page_count": doc.page_count,
        "chunks": [
            {
                "chunk_index": c.chunk_index,
                "content": c.content,
                "page_number": c.page_number,
            }
            for c in chunks
        ],
    }
