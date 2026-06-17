import uuid
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models import Document, DocumentChunk, Analysis
from app.schemas import AnalysisRequest, FullAnalysisResponse, AnalysisResult
from app.services.analysis_service import analysis_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/analysis", tags=["analysis"])


@router.post("/{document_id}")
async def analyze_document(
    document_id: str,
    request: AnalysisRequest = None,
    db: AsyncSession = Depends(get_db),
):
    """Run analysis on a document."""
    doc_result = await db.execute(
        select(Document).where(Document.id == uuid.UUID(document_id))
    )
    doc = doc_result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if doc.upload_status != "completed":
        raise HTTPException(status_code=400, detail="Document processing not complete")

    # Get document text from chunks
    chunks_result = await db.execute(
        select(DocumentChunk)
        .where(DocumentChunk.document_id == doc.id)
        .order_by(DocumentChunk.chunk_index)
    )
    chunks = chunks_result.scalars().all()
    document_text = "\n\n".join([c.content for c in chunks])

    if not document_text.strip():
        raise HTTPException(status_code=400, detail="No text content found in document")

    # Determine analysis types
    analysis_types = request.analysis_types if request else [
        "executive_summary", "key_clauses", "obligations",
        "important_dates", "payment_terms", "termination_conditions",
        "confidentiality", "liability", "missing_clauses", "improvements",
    ]

    # Run analysis
    results = analysis_service.run_full_analysis(document_text, analysis_types)

    # Store results
    analyses = []
    for atype, result in results.items():
        analysis = Analysis(
            document_id=doc.id,
            analysis_type=atype,
            results=result,
            status="completed" if "error" not in result else "failed",
        )
        db.add(analysis)
        analyses.append(analysis)

    await db.flush()

    # Build response
    analysis_results = []
    risk_score = None
    risk_items = None

    for a in analyses:
        analysis_results.append(AnalysisResult(
            analysis_type=a.analysis_type,
            content=a.results,
            status=a.status,
        ))
        if a.analysis_type == "risk_analysis" and isinstance(a.results, dict):
            risk_score = a.results.get("overall_risk_score")
            risk_items = a.results.get("risks", [])

    return {
        "id": str(analyses[0].id) if analyses else None,
        "document_id": document_id,
        "analyses": analysis_results,
        "risk_score": risk_score,
        "risk_items": risk_items,
        "created_at": analyses[0].created_at if analyses else None,
    }


@router.get("/{document_id}")
async def get_analysis(
    document_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get analysis results for a document."""
    result = await db.execute(
        select(Analysis)
        .where(Analysis.document_id == uuid.UUID(document_id))
        .order_by(Analysis.created_at.desc())
    )
    analyses = result.scalars().all()

    if not analyses:
        raise HTTPException(status_code=404, detail="No analysis found for this document")

    analysis_results = []
    risk_score = None
    risk_items = None

    for a in analyses:
        analysis_results.append({
            "analysis_type": a.analysis_type,
            "content": a.results,
            "status": a.status,
        })
        if a.analysis_type == "risk_analysis" and isinstance(a.results, dict):
            risk_score = a.results.get("overall_risk_score")
            risk_items = a.results.get("risks", [])

    return {
        "document_id": document_id,
        "analyses": analysis_results,
        "risk_score": risk_score,
        "risk_items": risk_items,
        "created_at": analyses[0].created_at,
    }
