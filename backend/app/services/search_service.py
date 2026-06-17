import logging
from typing import List, Optional
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.embedding_service import embedding_service

logger = logging.getLogger(__name__)


class SearchService:
    def semantic_search(
        self,
        query: str,
        document_ids: Optional[List[str]] = None,
        limit: int = 20,
    ) -> List[dict]:
        """Perform semantic search using ChromaDB."""
        results = embedding_service.search(
            query=query,
            document_ids=document_ids,
            n_results=limit,
        )

        search_results = []
        if results and results.get("documents") and results["documents"][0]:
            for i, doc in enumerate(results["documents"][0]):
                metadata = results["metadatas"][0][i] if results.get("metadatas") else {}
                distance = results["distances"][0][i] if results.get("distances") else 0
                search_results.append({
                    "document_id": metadata.get("document_id", ""),
                    "chunk_content": doc,
                    "page_number": metadata.get("page_number", 0),
                    "relevance_score": round(1 - distance, 4),
                    "chunk_index": metadata.get("chunk_index", 0),
                })

        return search_results

    async def keyword_search(
        self,
        db: AsyncSession,
        query: str,
        document_ids: Optional[List[str]] = None,
        limit: int = 20,
    ) -> List[dict]:
        """Perform keyword search using PostgreSQL full-text search."""
        sql = """
            SELECT dc.document_id::text, dc.content, dc.page_number, dc.chunk_index,
                   ts_rank(to_tsvector('english', dc.content), plainto_tsquery('english', :query)) as rank
            FROM document_chunks dc
            WHERE to_tsvector('english', dc.content) @@ plainto_tsquery('english', :query)
        """
        params = {"query": query, "limit": limit}

        if document_ids:
            placeholders = ", ".join([f":doc_{i}" for i in range(len(document_ids))])
            sql += f" AND dc.document_id::text IN ({placeholders})"
            for i, doc_id in enumerate(document_ids):
                params[f"doc_{i}"] = doc_id

        sql += " ORDER BY rank DESC LIMIT :limit"

        try:
            result = await db.execute(text(sql), params)
            rows = result.fetchall()

            return [
                {
                    "document_id": row[0],
                    "chunk_content": row[1],
                    "page_number": row[2],
                    "chunk_index": row[3],
                    "relevance_score": float(row[4]),
                }
                for row in rows
            ]
        except Exception as e:
            logger.error(f"Keyword search error: {e}")
            return []


search_service = SearchService()
