import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models import Document
from app.schemas import SearchRequest, SearchResponse, SearchResult
from app.services.search_service import search_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/search", tags=["search"])


@router.post("", response_model=SearchResponse)
async def search_documents(
    request: SearchRequest,
    db: AsyncSession = Depends(get_db),
):
    """Search across documents."""
    doc_ids = [str(d) for d in request.document_ids] if request.document_ids else None

    if request.search_type == "keyword":
        results = await search_service.keyword_search(
            db=db,
            query=request.query,
            document_ids=doc_ids,
            limit=request.limit,
        )
    else:
        results = search_service.semantic_search(
            query=request.query,
            document_ids=doc_ids,
            limit=request.limit,
        )

    # Enrich with document names
    search_results = []
    doc_cache = {}

    for r in results:
        doc_id = r["document_id"]
        if doc_id not in doc_cache:
            doc_result = await db.execute(
                select(Document).where(Document.id == doc_id)
            )
            doc = doc_result.scalar_one_or_none()
            doc_cache[doc_id] = doc.original_filename if doc else "Unknown"

        search_results.append(SearchResult(
            document_id=doc_id,
            document_name=doc_cache[doc_id],
            chunk_content=r["chunk_content"],
            page_number=r.get("page_number"),
            relevance_score=r["relevance_score"],
        ))

    return SearchResponse(
        results=search_results,
        total=len(search_results),
        query=request.query,
    )
