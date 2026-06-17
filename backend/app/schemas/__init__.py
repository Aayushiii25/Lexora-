from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime
from uuid import UUID


# Document schemas
class DocumentBase(BaseModel):
    filename: str


class DocumentCreate(DocumentBase):
    pass


class DocumentResponse(BaseModel):
    id: UUID
    filename: str
    original_filename: str
    file_size: int
    page_count: int
    upload_status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DocumentListResponse(BaseModel):
    documents: List[DocumentResponse]
    total: int


# Analysis schemas
class AnalysisRequest(BaseModel):
    document_id: UUID
    analysis_types: List[str] = Field(
        default=[
            "executive_summary",
            "key_clauses",
            "obligations",
            "important_dates",
            "payment_terms",
            "termination_conditions",
            "confidentiality",
            "liability",
            "missing_clauses",
            "improvements",
        ]
    )


class RiskItem(BaseModel):
    clause: str
    risk_type: str
    severity: str  # high, medium, low
    score: float
    explanation: str
    recommendation: str
    page_number: Optional[int] = None


class AnalysisResult(BaseModel):
    analysis_type: str
    content: Any
    status: str


class FullAnalysisResponse(BaseModel):
    id: UUID
    document_id: UUID
    analyses: List[AnalysisResult]
    risk_score: Optional[float] = None
    risk_items: Optional[List[RiskItem]] = None
    created_at: datetime

    class Config:
        from_attributes = True


# Chat schemas
class ChatRequest(BaseModel):
    document_id: UUID
    message: str


class Citation(BaseModel):
    chunk_index: int
    page_number: Optional[int] = None
    content: str
    relevance_score: float


class ChatResponse(BaseModel):
    id: UUID
    role: str
    content: str
    citations: List[Citation] = []
    created_at: datetime

    class Config:
        from_attributes = True


class ChatHistoryResponse(BaseModel):
    messages: List[ChatResponse]
    document_id: UUID


# Search schemas
class SearchRequest(BaseModel):
    query: str
    search_type: str = "semantic"  # semantic, keyword, clause
    document_ids: Optional[List[UUID]] = None
    limit: int = 20


class SearchResult(BaseModel):
    document_id: UUID
    document_name: str
    chunk_content: str
    page_number: Optional[int] = None
    relevance_score: float
    highlight: Optional[str] = None


class SearchResponse(BaseModel):
    results: List[SearchResult]
    total: int
    query: str


# Auth schemas
class UserCreate(BaseModel):
    email: str
    password: str
    full_name: Optional[str] = None


class UserResponse(BaseModel):
    id: UUID
    email: str
    full_name: Optional[str] = None
    is_active: int
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginRequest(BaseModel):
    email: str
    password: str
