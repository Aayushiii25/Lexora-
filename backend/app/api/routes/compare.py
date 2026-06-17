import uuid
import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models import Document, DocumentChunk, Analysis
from app.services.comparison_service import comparison_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/compare", tags=["comparison"])


class CompareRequest(BaseModel):
    document_a_id: str
    document_b_id: str


class ObligationRequest(BaseModel):
    document_id: str


class KnowledgeGraphRequest(BaseModel):
    document_id: str


async def _get_document_text(doc_id: str, db: AsyncSession) -> tuple[str, str]:
    """Helper to get document text and name."""
    result = await db.execute(
        select(Document).where(Document.id == uuid.UUID(doc_id))
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail=f"Document {doc_id} not found")

    chunks_result = await db.execute(
        select(DocumentChunk)
        .where(DocumentChunk.document_id == doc.id)
        .order_by(DocumentChunk.chunk_index)
    )
    chunks = chunks_result.scalars().all()
    text = "\n\n".join([c.content for c in chunks])
    return text, doc.original_filename


@router.post("/documents")
async def compare_documents(
    request: CompareRequest,
    db: AsyncSession = Depends(get_db),
):
    """Compare two documents for conflicts, gaps, and divergent terms."""
    text_a, name_a = await _get_document_text(request.document_a_id, db)
    text_b, name_b = await _get_document_text(request.document_b_id, db)

    if not text_a.strip() or not text_b.strip():
        raise HTTPException(status_code=400, detail="One or both documents have no text content")

    result = comparison_service.compare_documents(text_a, text_b, name_a, name_b)

    # Store comparison as analysis
    analysis = Analysis(
        document_id=uuid.UUID(request.document_a_id),
        analysis_type="document_comparison",
        results={
            **result,
            "compared_with": request.document_b_id,
        },
        status="completed" if "error" not in result else "failed",
    )
    db.add(analysis)
    await db.flush()

    return result


@router.post("/obligations")
async def extract_obligations(
    request: ObligationRequest,
    db: AsyncSession = Depends(get_db),
):
    """Extract and classify all obligations from a document."""
    text, name = await _get_document_text(request.document_id, db)

    if not text.strip():
        raise HTTPException(status_code=400, detail="Document has no text content")

    result = comparison_service.extract_obligations(text)

    # Store as analysis
    analysis = Analysis(
        document_id=uuid.UUID(request.document_id),
        analysis_type="obligation_tracking",
        results=result,
        status="completed" if "error" not in result else "failed",
    )
    db.add(analysis)
    await db.flush()

    return result


@router.post("/knowledge-graph")
async def extract_knowledge_graph(
    request: KnowledgeGraphRequest,
    db: AsyncSession = Depends(get_db),
):
    """Extract entities and relationships for knowledge graph visualization."""
    text, name = await _get_document_text(request.document_id, db)

    if not text.strip():
        raise HTTPException(status_code=400, detail="Document has no text content")

    result = comparison_service.extract_knowledge_graph(text)

    # Store as analysis
    analysis = Analysis(
        document_id=uuid.UUID(request.document_id),
        analysis_type="knowledge_graph",
        results=result,
        status="completed" if "error" not in result else "failed",
    )
    db.add(analysis)
    await db.flush()

    return result
