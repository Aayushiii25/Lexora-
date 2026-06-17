import axios from "axios";

// Create an Axios instance with base URL
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  headers: {
    "Content-Type": "application/json",
  },
});

// Helper for realistic network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function uploadDocument(file: File) {
  await delay(1500);
  return { id: "doc_" + Math.random().toString(36).substring(2, 11), filename: file.name };
}

export async function getDocuments() {
  await delay(500);
  return {
    documents: [
      {
        id: "doc_1",
        original_filename: "MSA_Acme_Global_Corp_Final.pdf",
        upload_status: "completed",
        page_count: 42,
        file_size: 1048576,
        created_at: "2023-10-24T10:30:00Z"
      },
      {
        id: "doc_2",
        original_filename: "NDA_Stark_Industries_v3.pdf",
        upload_status: "completed",
        page_count: 8,
        file_size: 256000,
        created_at: "2023-10-25T14:15:00Z"
      },
      {
        id: "doc_3",
        original_filename: "Employment_Agreement_Director_Sales.pdf",
        upload_status: "completed",
        page_count: 14,
        file_size: 512000,
        created_at: "2023-10-26T09:00:00Z"
      },
      {
        id: "doc_4",
        original_filename: "Commercial_Lease_SF_Office.pdf",
        upload_status: "completed",
        page_count: 56,
        file_size: 2048000,
        created_at: "2023-10-26T11:45:00Z"
      }
    ]
  };
}

export async function deleteDocument(id: string) {
  await delay(500);
  return { success: true };
}

export async function getAnalysis(documentId: string) {
  await delay(800);
  return {
    analyses: [
      {
        analysis_type: "executive_summary",
        status: "completed",
        content: {
          summary: "This Master Services Agreement outlines the terms under which Acme Global Corp will provide cloud infrastructure services to the Client. Key terms include a 3-year commitment, $500k annual contract value, and stringent SLA requirements with penalty clauses for downtime exceeding 99.9% uptime."
        }
      },
      {
        analysis_type: "key_clauses",
        status: "completed",
        content: {
          liability: "Cap is set to 12 months of fees paid. Exception for gross negligence.",
          governing_law: "State of Delaware",
          termination: "Requires 90 days written notice. Early termination incurs a 50% penalty of remaining contract value."
        }
      },
      {
        analysis_type: "risk_analysis",
        status: "completed",
        content: {
          overall_risk_score: 72,
          risk_level: "High",
          risk_summary: "The agreement contains significant exposure in the indemnification and liability caps. The early termination penalty is unusually high compared to industry standards.",
          risks: [
            {
              clause: "Indemnification Section 8.2",
              risk_type: "Liability",
              severity: "high",
              score: 8.5,
              explanation: "The indemnification clause is uncapped and covers indirect damages, exposing the company to significant financial risk in the event of a breach.",
              recommendation: "Negotiate to cap indemnification at the total contract value and specifically exclude consequential/indirect damages.",
              page_number: 14
            },
            {
              clause: "Termination for Convenience 12.1",
              risk_type: "Financial",
              severity: "medium",
              score: 6.0,
              explanation: "Early termination requires payment of 50% of the remaining contract value, which limits flexibility.",
              recommendation: "Attempt to reduce the penalty to 25% or negotiate a sliding scale based on the year of termination.",
              page_number: 22
            },
            {
              clause: "Data Privacy 4.3",
              risk_type: "Compliance",
              severity: "low",
              score: 3.5,
              explanation: "Standard GDPR compliance language is present, but fails to explicitly mention recent CCPA amendments.",
              recommendation: "Add an addendum explicitly covering California Consumer Privacy Act compliance.",
              page_number: 9
            }
          ]
        }
      }
    ]
  };
}

export async function analyzeDocument(documentId: string) {
  await delay(1000);
  return { success: true };
}

export async function sendChatMessage(documentId: string, message: string) {
  await delay(1200);
  return {
    id: "msg_" + Math.random(),
    role: "assistant",
    content: "Under Section 12.1 (Termination), either party may terminate the agreement for convenience by providing a written notice of ninety (90) days. However, as per Section 12.3, if the Client terminates before the end of the initial 3-year term, they are subject to an early termination penalty equal to fifty percent (50%) of the remaining contract value.",
    citations: [
      {
        chunk_index: 45,
        content: "12.1 Termination for Convenience. Either Party may terminate this Agreement at any time, for any reason or no reason, by providing the other Party with at least ninety (90) days prior written notice.",
        page_number: 22,
        relevance_score: 0.94
      },
      {
        chunk_index: 47,
        content: "12.3 Early Termination Penalty. In the event Client terminates this Agreement pursuant to Section 12.1 prior to the expiration of the Initial Term, Client shall pay Provider an amount equal to fifty percent (50%) of the fees that would have been payable for the remainder of the Initial Term.",
        page_number: 22,
        relevance_score: 0.89
      }
    ],
    created_at: new Date().toISOString()
  };
}

export async function getChatHistory(documentId: string) {
  await delay(400);
  return {
    messages: [
      {
        id: "msg_user_1",
        role: "user",
        content: "What are the termination conditions and penalties?",
        created_at: new Date(Date.now() - 60000).toISOString()
      },
      {
        id: "msg_ast_1",
        role: "assistant",
        content: "Under Section 12.1 (Termination), either party may terminate the agreement for convenience by providing a written notice of ninety (90) days. However, as per Section 12.3, if the Client terminates before the end of the initial 3-year term, they are subject to an early termination penalty equal to fifty percent (50%) of the remaining contract value.",
        citations: [
          {
            chunk_index: 45,
            content: "12.1 Termination for Convenience. Either Party may terminate this Agreement at any time, for any reason or no reason, by providing the other Party with at least ninety (90) days prior written notice.",
            page_number: 22,
            relevance_score: 0.94
          },
          {
            chunk_index: 47,
            content: "12.3 Early Termination Penalty. In the event Client terminates this Agreement pursuant to Section 12.1 prior to the expiration of the Initial Term, Client shall pay Provider an amount equal to fifty percent (50%) of the fees that would have been payable for the remainder of the Initial Term.",
            page_number: 22,
            relevance_score: 0.89
          }
        ],
        created_at: new Date(Date.now() - 58000).toISOString()
      }
    ]
  };
}

export async function searchDocuments(query: string, searchType: string) {
  await delay(1000);
  return {
    query,
    total: 3,
    results: [
      {
        document_id: "doc_1",
        document_name: "MSA_Acme_Global_Corp_Final.pdf",
        chunk_index: 12,
        chunk_content: "Confidential Information shall not include information that (i) is or becomes generally available to the public other than as a result of a disclosure by the Receiving Party; (ii) was available to the Receiving Party on a non-confidential basis prior to its disclosure by the Disclosing Party...",
        relevance_score: 0.88,
        page_number: 5
      },
      {
        document_id: "doc_2",
        document_name: "NDA_Stark_Industries_v3.pdf",
        chunk_index: 4,
        chunk_content: "The obligations of confidentiality under this Agreement shall survive for a period of five (5) years following the termination or expiration of this Agreement, except for trade secrets, which shall be held in confidence indefinitely.",
        relevance_score: 0.82,
        page_number: 2
      },
      {
        document_id: "doc_3",
        document_name: "Employment_Agreement_Director_Sales.pdf",
        chunk_index: 18,
        chunk_content: "Employee agrees that during the term of employment and for a period of twelve (12) months thereafter, Employee will not directly or indirectly solicit or attempt to solicit any customer or client of the Company.",
        relevance_score: 0.76,
        page_number: 8
      }
    ]
  };
}

export async function getDashboardStats() {
  await delay(600);
  return {
    total_documents: 1482,
    total_analyses: 856,
    total_queries: 4230,
    average_risk_score: 68,
    risk_distribution: {
      high: 142,
      medium: 538,
      low: 802
    },
    recent_documents: [
      {
        id: "doc_1",
        filename: "MSA_Acme_Global_Corp_Final.pdf",
        status: "completed",
        pages: 42,
        size: 1048576,
        created_at: new Date().toISOString()
      },
      {
        id: "doc_2",
        filename: "NDA_Stark_Industries_v3.pdf",
        status: "completed",
        pages: 8,
        size: 256000,
        created_at: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: "doc_3",
        filename: "Employment_Agreement_Director_Sales.pdf",
        status: "processing",
        pages: 14,
        size: 512000,
        created_at: new Date(Date.now() - 7200000).toISOString()
      },
      {
        id: "doc_4",
        filename: "Commercial_Lease_SF_Office.pdf",
        status: "failed",
        pages: 56,
        size: 2048000,
        created_at: new Date(Date.now() - 86400000).toISOString()
      }
    ]
  };
}

export async function compareDocuments(docAId: string, docBId: string) {
  await delay(1200);
  return {
    alignment_score: 42,
    doc_a_name: "Vendor_Agreement_v1.pdf",
    doc_b_name: "Vendor_Agreement_v2_Redlined.pdf",
    summary: "Significant divergence found in liability caps and payment terms. Version 2 shifts more risk to the vendor.",
    conflicts: [
      {
        clause_topic: "Liability Cap",
        doc_a_text: "Liability is capped at 12 months of trailing revenue.",
        doc_b_text: "Liability is capped at the greater of $1,000,000 or 24 months of trailing revenue.",
        severity: "high",
        explanation: "Doc B significantly increases the financial exposure for the vendor."
      },
      {
        clause_topic: "Payment Terms",
        doc_a_text: "Invoices shall be paid within Net 30 days.",
        doc_b_text: "Invoices shall be paid within Net 60 days.",
        severity: "medium",
        explanation: "Doc B extends the payment window, impacting cash flow."
      }
    ],
    missing_in_a: [
      {
        clause_topic: "Audit Rights",
        doc_b_text: "Client retains the right to audit Vendor's security practices annually.",
        importance: "high"
      }
    ],
    divergent_terms: [
      {
        clause_topic: "Governing Law",
        doc_a_term: "State of California",
        doc_b_term: "State of New York",
        risk_note: "Change in jurisdiction alters litigation strategy."
      }
    ]
  };
}

export async function extractObligations(documentId: string) {
  await delay(1000);
  return {
    total_obligations: 5,
    by_party: { "Acme Corp": 3, "Stark Industries": 2 },
    by_type: { "Payment": 1, "Delivery": 2, "Reporting": 2 },
    obligations: [
      {
        id: "OBL-001",
        party: "Acme Corp",
        description: "Deliver cloud infrastructure deployment plan.",
        type: "Delivery",
        trigger: "Contract execution",
        deadline: "Within 15 days",
        frequency: "Once",
        priority: "critical",
        status: "pending",
        page_number: 4
      },
      {
        id: "OBL-002",
        party: "Stark Industries",
        description: "Pay initial setup fee of $50,000.",
        type: "Payment",
        trigger: "Approval of deployment plan",
        deadline: "Net 30",
        frequency: "Once",
        priority: "high",
        status: "pending",
        page_number: 8
      },
      {
        id: "OBL-003",
        party: "Acme Corp",
        description: "Provide monthly uptime and SLA performance reports.",
        type: "Reporting",
        trigger: "End of month",
        deadline: "5th business day",
        frequency: "Monthly",
        priority: "medium",
        status: "pending",
        page_number: 12
      }
    ]
  };
}

export async function extractKnowledgeGraph(documentId: string) {
  await delay(1500);
  return {
    entities: [
      { id: "e1", name: "Acme Global Corp", type: "organization" },
      { id: "e2", name: "Stark Industries", type: "organization" },
      { id: "e3", name: "Master Services Agreement", type: "document" },
      { id: "e4", name: "Cloud Infrastructure", type: "legal_concept" },
      { id: "e5", name: "Tony Stark", type: "person" },
      { id: "e6", name: "New York", type: "location" }
    ],
    relationships: [
      { source: "e1", target: "e3", type: "party_to", label: "Party To" },
      { source: "e2", target: "e3", type: "party_to", label: "Party To" },
      { source: "e3", target: "e4", type: "governs", label: "Governs" },
      { source: "e5", target: "e2", type: "represents", label: "CEO" },
      { source: "e3", target: "e6", type: "jurisdiction", label: "Jurisdiction" }
    ]
  };
}

export async function healthCheck() {
  await delay(200);
  return { status: "healthy", version: "1.0.0" };
}
