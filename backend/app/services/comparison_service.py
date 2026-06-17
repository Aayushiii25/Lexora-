import json
import logging
from typing import List
from openai import OpenAI
from app.core.config import settings

logger = logging.getLogger(__name__)

COMPARISON_PROMPT = """You are a legal document comparison engine. Compare these two document excerpts and identify:

1. **Conflicting Clauses**: Clauses that contradict each other between the documents.
2. **Missing Clauses**: Clauses present in one document but absent in the other.
3. **Divergent Terms**: Similar clauses with materially different terms (amounts, dates, obligations).
4. **Alignment Score**: A 0-100 score indicating how aligned the documents are.

For each finding, specify which document(s) it relates to and the exact clause text.

Return as JSON:
{
    "alignment_score": N,
    "conflicts": [
        {"clause_topic": "...", "doc_a_text": "...", "doc_b_text": "...", "severity": "high|medium|low", "explanation": "..."}
    ],
    "missing_in_a": [
        {"clause_topic": "...", "doc_b_text": "...", "importance": "critical|important|minor"}
    ],
    "missing_in_b": [
        {"clause_topic": "...", "doc_a_text": "...", "importance": "critical|important|minor"}
    ],
    "divergent_terms": [
        {"clause_topic": "...", "doc_a_term": "...", "doc_b_term": "...", "risk_note": "..."}
    ],
    "summary": "..."
}"""

OBLIGATION_PROMPT = """Extract all obligations, duties, and commitments from this legal document.
For each obligation:
- Identify the obligated party
- Describe the obligation precisely
- Determine the trigger condition (when it becomes active)
- Identify deadline or frequency
- Determine consequence of non-compliance
- Classify the obligation type: financial, operational, reporting, compliance, confidentiality, delivery, other
- Assign a priority: critical, high, medium, low

Return as JSON:
{
    "obligations": [
        {
            "id": "OBL-001",
            "party": "...",
            "description": "...",
            "type": "financial|operational|reporting|compliance|confidentiality|delivery|other",
            "trigger": "...",
            "deadline": "...",
            "frequency": "one-time|recurring|conditional",
            "consequence": "...",
            "priority": "critical|high|medium|low",
            "status": "active",
            "clause_reference": "...",
            "page_number": N
        }
    ],
    "total_obligations": N,
    "by_party": {"party_name": N},
    "by_type": {"type": N},
    "by_priority": {"priority": N}
}"""

KNOWLEDGE_GRAPH_PROMPT = """Analyze this legal document and extract a knowledge graph of entities and relationships.

Extract:
1. **Entities**: All parties, organizations, people, locations, dates, monetary amounts, legal concepts, and document references mentioned.
2. **Relationships**: How entities relate to each other (e.g., "Party A" --[pays]--> "Party B", "Agreement" --[expires on]--> "Date").

For each entity, classify its type: party, organization, person, date, amount, legal_concept, document, location, obligation, clause.
For each relationship, classify: contractual, financial, temporal, hierarchical, conditional, reference.

Return as JSON:
{
    "entities": [
        {"id": "E1", "name": "...", "type": "party|organization|person|date|amount|legal_concept|document|location|obligation|clause", "properties": {}}
    ],
    "relationships": [
        {"source": "E1", "target": "E2", "type": "contractual|financial|temporal|hierarchical|conditional|reference", "label": "...", "properties": {}}
    ],
    "summary": "..."
}"""


class ComparisonService:
    def __init__(self):
        self._client = None

    @property
    def client(self):
        if self._client is None:
            self._client = OpenAI(api_key=settings.OPENAI_API_KEY)
        return self._client

    def _call_openai(self, system_prompt: str, user_content: str) -> dict:
        if not settings.OPENAI_API_KEY:
            return {"error": "OpenAI API key not configured", "mock": True}

        try:
            response = self.client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt + "\n\nRespond ONLY with valid JSON."},
                    {"role": "user", "content": user_content},
                ],
                temperature=0.1,
                max_tokens=4096,
                response_format={"type": "json_object"},
            )
            return json.loads(response.choices[0].message.content)
        except Exception as e:
            logger.error(f"OpenAI API error: {e}")
            return {"error": str(e)}

    def compare_documents(self, doc_a_text: str, doc_b_text: str, doc_a_name: str, doc_b_name: str) -> dict:
        """Compare two legal documents for conflicts, missing clauses, and divergent terms."""
        max_chars = 50000
        text_a = doc_a_text[:max_chars] if len(doc_a_text) > max_chars else doc_a_text
        text_b = doc_b_text[:max_chars] if len(doc_b_text) > max_chars else doc_b_text

        user_content = f"""Document A ({doc_a_name}):
{text_a}

---

Document B ({doc_b_name}):
{text_b}"""

        result = self._call_openai(COMPARISON_PROMPT, user_content)
        result["doc_a_name"] = doc_a_name
        result["doc_b_name"] = doc_b_name
        return result

    def extract_obligations(self, document_text: str) -> dict:
        """Extract and classify all obligations from a document."""
        max_chars = 100000
        if len(document_text) > max_chars:
            document_text = document_text[:max_chars] + "\n\n[Document truncated...]"

        return self._call_openai(OBLIGATION_PROMPT, f"Document content:\n\n{document_text}")

    def extract_knowledge_graph(self, document_text: str) -> dict:
        """Extract entities and relationships for a knowledge graph."""
        max_chars = 100000
        if len(document_text) > max_chars:
            document_text = document_text[:max_chars] + "\n\n[Document truncated...]"

        return self._call_openai(KNOWLEDGE_GRAPH_PROMPT, f"Document content:\n\n{document_text}")


comparison_service = ComparisonService()
