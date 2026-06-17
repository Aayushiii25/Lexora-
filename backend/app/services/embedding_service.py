import chromadb
from chromadb.config import Settings as ChromaSettings
from openai import OpenAI
from typing import List, Optional
from app.core.config import settings
import logging
import os

logger = logging.getLogger(__name__)


class EmbeddingService:
    def __init__(self):
        self._client = None
        self._collection = None
        self._openai = None

    @property
    def openai_client(self):
        if self._openai is None:
            self._openai = OpenAI(api_key=settings.OPENAI_API_KEY)
        return self._openai

    @property
    def chroma_client(self):
        if self._client is None:
            os.makedirs(settings.CHROMA_PERSIST_DIR, exist_ok=True)
            self._client = chromadb.PersistentClient(path=settings.CHROMA_PERSIST_DIR)
        return self._client

    @property
    def collection(self):
        if self._collection is None:
            self._collection = self.chroma_client.get_or_create_collection(
                name=settings.CHROMA_COLLECTION_NAME,
                metadata={"hnsw:space": "cosine"},
            )
        return self._collection

    def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings using OpenAI."""
        if not settings.OPENAI_API_KEY:
            logger.warning("No OpenAI API key, returning mock embeddings")
            return [[0.0] * 1536 for _ in texts]

        batch_size = 100
        all_embeddings = []

        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            response = self.openai_client.embeddings.create(
                model=settings.OPENAI_EMBEDDING_MODEL,
                input=batch,
            )
            all_embeddings.extend([item.embedding for item in response.data])

        return all_embeddings

    def store_embeddings(
        self,
        document_id: str,
        chunks: List[dict],
        embeddings: List[List[float]],
    ) -> List[str]:
        """Store embeddings in ChromaDB."""
        ids = [f"{document_id}_chunk_{chunk['chunk_index']}" for chunk in chunks]
        documents = [chunk["content"] for chunk in chunks]
        metadatas = [
            {
                "document_id": document_id,
                "chunk_index": chunk["chunk_index"],
                "page_number": chunk.get("page_number", 0),
                "word_count": chunk.get("word_count", 0),
            }
            for chunk in chunks
        ]

        self.collection.add(
            ids=ids,
            embeddings=embeddings,
            documents=documents,
            metadatas=metadatas,
        )

        return ids

    def search(
        self,
        query: str,
        document_ids: Optional[List[str]] = None,
        n_results: int = 10,
    ) -> dict:
        """Search for similar chunks."""
        query_embedding = self.generate_embeddings([query])[0]

        where_filter = None
        if document_ids:
            if len(document_ids) == 1:
                where_filter = {"document_id": document_ids[0]}
            else:
                where_filter = {"document_id": {"$in": document_ids}}

        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=n_results,
            where=where_filter,
            include=["documents", "metadatas", "distances"],
        )

        return results

    def delete_document_embeddings(self, document_id: str):
        """Remove all embeddings for a document."""
        try:
            self.collection.delete(where={"document_id": document_id})
        except Exception as e:
            logger.error(f"Error deleting embeddings for {document_id}: {e}")


embedding_service = EmbeddingService()
