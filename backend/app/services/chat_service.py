import json
import logging
from typing import List, Optional
from openai import OpenAI
from app.core.config import settings
from app.services.embedding_service import embedding_service

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a legal document analysis assistant integrated into a professional legal platform.
Your role is to answer questions about legal documents accurately, citing specific sections.

Guidelines:
- Be precise and factual
- Always reference specific clauses, sections, or page numbers when available
- If information is not in the provided context, say so clearly
- Use professional legal terminology
- Do not speculate beyond what the document states
- Structure your responses clearly with bullet points when appropriate

When citing, reference the source chunk and page number."""


class ChatService:
    def __init__(self):
        self._client = None

    @property
    def client(self):
        if self._client is None:
            self._client = OpenAI(api_key=settings.OPENAI_API_KEY)
        return self._client

    def get_relevant_context(
        self, query: str, document_id: str, n_results: int = 5
    ) -> List[dict]:
        """Retrieve relevant chunks from ChromaDB for RAG."""
        results = embedding_service.search(
            query=query,
            document_ids=[document_id],
            n_results=n_results,
        )

        contexts = []
        if results and results.get("documents") and results["documents"][0]:
            for i, doc in enumerate(results["documents"][0]):
                metadata = results["metadatas"][0][i] if results.get("metadatas") else {}
                distance = results["distances"][0][i] if results.get("distances") else 0
                contexts.append({
                    "content": doc,
                    "chunk_index": metadata.get("chunk_index", i),
                    "page_number": metadata.get("page_number", 0),
                    "relevance_score": round(1 - distance, 4),
                })

        return contexts

    def chat(
        self,
        query: str,
        document_id: str,
        chat_history: Optional[List[dict]] = None,
    ) -> dict:
        """Process a chat query using RAG."""
        if not settings.OPENAI_API_KEY:
            return {
                "content": "The analysis engine is not configured. Please set up your API credentials in Settings.",
                "citations": [],
            }

        # Retrieve relevant context
        contexts = self.get_relevant_context(query, document_id)

        # Build context string
        context_str = ""
        for ctx in contexts:
            context_str += f"\n[Chunk {ctx['chunk_index']}, Page {ctx['page_number']}]:\n{ctx['content']}\n"

        # Build messages
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]

        if chat_history:
            for msg in chat_history[-6:]:  # Last 6 messages for context
                messages.append({"role": msg["role"], "content": msg["content"]})

        user_message = f"""Based on the following document excerpts, answer the user's question.

Document Context:
{context_str}

User Question: {query}

Provide a thorough answer with specific references to the document sections. Cite chunk numbers and page numbers where applicable."""

        messages.append({"role": "user", "content": user_message})

        try:
            response = self.client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=messages,
                temperature=0.2,
                max_tokens=2048,
            )

            citations = [
                {
                    "chunk_index": ctx["chunk_index"],
                    "page_number": ctx["page_number"],
                    "content": ctx["content"][:200] + "..." if len(ctx["content"]) > 200 else ctx["content"],
                    "relevance_score": ctx["relevance_score"],
                }
                for ctx in contexts
                if ctx["relevance_score"] > 0.3
            ]

            return {
                "content": response.choices[0].message.content,
                "citations": citations,
            }

        except Exception as e:
            logger.error(f"Chat error: {e}")
            return {
                "content": f"An error occurred while processing your query. Please try again.",
                "citations": [],
            }


chat_service = ChatService()
