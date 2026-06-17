import json
import logging
from typing import Optional, List
from openai import OpenAI
from app.core.config import settings

logger = logging.getLogger(__name__)


ANALYSIS_PROMPTS = {
    "executive_summary": """Analyze this legal document and provide a comprehensive executive summary.
Include: document type, parties involved, key purpose, effective dates, and critical terms.
Return as JSON: {"summary": "...", "document_type": "...", "parties": [...], "effective_date": "...", "key_points": [...]}""",

    "key_clauses": """Extract all key clauses from this legal document.
For each clause, provide the clause name, content summary, page reference, and significance.
Return as JSON: {"clauses": [{"name": "...", "summary": "...", "significance": "high|medium|low", "page": N}]}""",

    "obligations": """Identify all obligations and responsibilities for each party in this document.
Return as JSON: {"obligations": [{"party": "...", "obligation": "...", "deadline": "...", "consequence": "...", "page": N}]}""",

    "important_dates": """Extract all important dates, deadlines, and time-sensitive provisions.
Return as JSON: {"dates": [{"date": "...", "description": "...", "type": "deadline|effective|expiry|renewal", "page": N}]}""",

    "payment_terms": """Analyze all payment-related terms, fees, penalties, and financial obligations.
Return as JSON: {"payment_terms": [{"description": "...", "amount": "...", "frequency": "...", "conditions": "...", "page": N}]}""",

    "termination_conditions": """Identify all termination conditions, exit clauses, and early termination provisions.
Return as JSON: {"conditions": [{"type": "...", "description": "...", "notice_period": "...", "consequences": "...", "page": N}]}""",

    "confidentiality": """Analyze all confidentiality, NDA, and information protection clauses.
Return as JSON: {"clauses": [{"scope": "...", "duration": "...", "exceptions": [...], "remedies": "...", "page": N}]}""",

    "liability": """Analyze all liability, indemnification, and limitation of liability clauses.
Return as JSON: {"clauses": [{"type": "...", "cap": "...", "exclusions": [...], "indemnification": "...", "page": N}]}""",

    "missing_clauses": """Analyze this legal document and identify any standard clauses that are missing or inadequately addressed.
Consider standard clauses like: force majeure, dispute resolution, governing law, assignment, amendments, severability, entire agreement, warranties, insurance, data protection.
Return as JSON: {"missing": [{"clause": "...", "importance": "critical|important|recommended", "explanation": "..."}]}""",

    "improvements": """Suggest specific improvements and modifications to strengthen this legal document.
Return as JSON: {"improvements": [{"area": "...", "current_state": "...", "recommendation": "...", "priority": "high|medium|low", "rationale": "..."}]}""",
}

RISK_ANALYSIS_PROMPT = """Perform a comprehensive risk analysis of this legal document.

Evaluate risks across these categories:
1. Liability Exposure - unlimited liability, broad indemnification
2. Payment Risks - unclear terms, penalties, hidden fees
3. Termination Risks - unfavorable exit terms, auto-renewal traps
4. Non-Compete Risks - overly broad restrictions
5. Compliance Risks - regulatory concerns, data protection
6. Intellectual Property Risks - unclear IP ownership
7. Force Majeure Gaps - missing or weak force majeure clauses

For each risk found, provide:
- clause: the specific clause text or reference
- risk_type: category of risk
- severity: "high", "medium", or "low"
- score: numerical score 1-10 (10 = highest risk)
- explanation: why this is a risk
- recommendation: how to mitigate

Also provide an overall risk_score (1-100) for the entire document.

Return as JSON:
{
    "overall_risk_score": N,
    "risk_level": "high|medium|low",
    "total_risks": N,
    "risks": [
        {
            "clause": "...",
            "risk_type": "...",
            "severity": "...",
            "score": N,
            "explanation": "...",
            "recommendation": "...",
            "page_number": N
        }
    ],
    "risk_summary": "..."
}"""


class AnalysisService:
    def __init__(self):
        self._client = None

    @property
    def client(self):
        if self._client is None:
            self._client = OpenAI(api_key=settings.OPENAI_API_KEY)
        return self._client

    def _call_openai(self, system_prompt: str, document_text: str) -> dict:
        """Call OpenAI API with structured output."""
        if not settings.OPENAI_API_KEY:
            return {"error": "OpenAI API key not configured", "mock": True}

        # Truncate very long documents to fit context window
        max_chars = 100000
        if len(document_text) > max_chars:
            document_text = document_text[:max_chars] + "\n\n[Document truncated due to length...]"

        try:
            response = self.client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt + "\n\nRespond ONLY with valid JSON."},
                    {"role": "user", "content": f"Document content:\n\n{document_text}"},
                ],
                temperature=0.1,
                max_tokens=4096,
                response_format={"type": "json_object"},
            )
            result = json.loads(response.choices[0].message.content)
            return result
        except json.JSONDecodeError as e:
            logger.error(f"JSON parse error: {e}")
            return {"error": "Failed to parse analysis results"}
        except Exception as e:
            logger.error(f"OpenAI API error: {e}")
            return {"error": str(e)}

    def analyze(self, document_text: str, analysis_type: str) -> dict:
        """Run a specific analysis type on document text."""
        prompt = ANALYSIS_PROMPTS.get(analysis_type)
        if not prompt:
            return {"error": f"Unknown analysis type: {analysis_type}"}
        return self._call_openai(prompt, document_text)

    def analyze_risks(self, document_text: str) -> dict:
        """Run comprehensive risk analysis."""
        return self._call_openai(RISK_ANALYSIS_PROMPT, document_text)

    def run_full_analysis(self, document_text: str, analysis_types: Optional[List[str]] = None) -> dict:
        """Run all requested analysis types."""
        if analysis_types is None:
            analysis_types = list(ANALYSIS_PROMPTS.keys())

        results = {}
        for atype in analysis_types:
            results[atype] = self.analyze(document_text, atype)

        # Always include risk analysis
        results["risk_analysis"] = self.analyze_risks(document_text)

        return results


analysis_service = AnalysisService()
