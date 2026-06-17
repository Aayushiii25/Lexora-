import uuid
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models import Document, ChatMessage
from app.schemas import ChatRequest, ChatResponse, ChatHistoryResponse
from app.services.chat_service import chat_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
async def chat_with_document(
    request: ChatRequest,
    db: AsyncSession = Depends(get_db),
):
    """Chat with a document using RAG."""
    # Verify document exists
    doc_result = await db.execute(
        select(Document).where(Document.id == request.document_id)
    )
    doc = doc_result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Get chat history
    history_result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.document_id == request.document_id)
        .order_by(ChatMessage.created_at.desc())
        .limit(10)
    )
    history = history_result.scalars().all()
    chat_history = [
        {"role": msg.role, "content": msg.content}
        for msg in reversed(list(history))
    ]

    # Save user message
    user_msg = ChatMessage(
        document_id=request.document_id,
        role="user",
        content=request.message,
    )
    db.add(user_msg)

    # Get response
    response = chat_service.chat(
        query=request.message,
        document_id=str(request.document_id),
        chat_history=chat_history,
    )

    # Save assistant message
    assistant_msg = ChatMessage(
        document_id=request.document_id,
        role="assistant",
        content=response["content"],
        citations=response["citations"],
    )
    db.add(assistant_msg)
    await db.flush()

    return ChatResponse(
        id=assistant_msg.id,
        role="assistant",
        content=response["content"],
        citations=response["citations"],
        created_at=assistant_msg.created_at,
    )


@router.get("/{document_id}/history", response_model=ChatHistoryResponse)
async def get_chat_history(
    document_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get chat history for a document."""
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.document_id == uuid.UUID(document_id))
        .order_by(ChatMessage.created_at.asc())
    )
    messages = result.scalars().all()

    return ChatHistoryResponse(
        messages=[
            ChatResponse(
                id=msg.id,
                role=msg.role,
                content=msg.content,
                citations=msg.citations or [],
                created_at=msg.created_at,
            )
            for msg in messages
        ],
        document_id=uuid.UUID(document_id),
    )


@router.delete("/{document_id}/history")
async def clear_chat_history(
    document_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Clear chat history for a document."""
    result = await db.execute(
        select(ChatMessage).where(ChatMessage.document_id == uuid.UUID(document_id))
    )
    messages = result.scalars().all()
    for msg in messages:
        await db.delete(msg)

    return {"status": "cleared", "document_id": document_id}
