import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import init_db
from app.api.routes import documents, analysis, chat, search, auth
from app.api.routes import compare

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting LEXORA API...")
    await init_db()
    logger.info("Database initialized")
    yield
    logger.info("Shutting down LEXORA API...")


app = FastAPI(
    title="LEXORA API",
    description="Legal Document Analysis Platform API",
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(documents.router)
app.include_router(analysis.router)
app.include_router(chat.router)
app.include_router(search.router)
app.include_router(auth.router)
app.include_router(compare.router)


@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
    }


@app.get("/api/stats")
async def get_stats():
    """Dashboard stats endpoint."""
    from sqlalchemy import select, func
    from app.core.database import async_session
    from app.models import Document, Analysis, ChatMessage

    async with async_session() as db:
        doc_count = (await db.execute(select(func.count(Document.id)))).scalar() or 0
        analysis_count = (await db.execute(select(func.count(Analysis.id)))).scalar() or 0
        chat_count = (await db.execute(select(func.count(ChatMessage.id)))).scalar() or 0

        recent_docs = await db.execute(
            select(Document).order_by(Document.created_at.desc()).limit(5)
        )
        recent = recent_docs.scalars().all()

        # Get risk scores from analyses
        risk_result = await db.execute(
            select(Analysis).where(Analysis.analysis_type == "risk_analysis").order_by(Analysis.created_at.desc()).limit(10)
        )
        risk_analyses = risk_result.scalars().all()

        avg_risk = 0
        risk_distribution = {"high": 0, "medium": 0, "low": 0}
        if risk_analyses:
            scores = []
            for ra in risk_analyses:
                if isinstance(ra.results, dict):
                    score = ra.results.get("overall_risk_score", 0)
                    scores.append(score)
                    level = ra.results.get("risk_level", "low")
                    risk_distribution[level] = risk_distribution.get(level, 0) + 1
            if scores:
                avg_risk = sum(scores) / len(scores)

    return {
        "total_documents": doc_count,
        "total_analyses": analysis_count,
        "total_queries": chat_count,
        "average_risk_score": round(avg_risk, 1),
        "risk_distribution": risk_distribution,
        "recent_documents": [
            {
                "id": str(d.id),
                "filename": d.original_filename,
                "status": d.upload_status,
                "pages": d.page_count,
                "size": d.file_size,
                "created_at": d.created_at.isoformat() if d.created_at else None,
            }
            for d in recent
        ],
    }
