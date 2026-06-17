export interface Document {
  id: string;
  filename: string;
  original_filename: string;
  file_size: number;
  page_count: number;
  upload_status: "pending" | "processing" | "completed" | "failed";
  created_at: string;
  updated_at: string;
}

export interface DocumentChunk {
  chunk_index: number;
  content: string;
  page_number: number;
}

export interface AnalysisResult {
  analysis_type: string;
  content: Record<string, unknown>;
  status: string;
}

export interface RiskItem {
  clause: string;
  risk_type: string;
  severity: "high" | "medium" | "low";
  score: number;
  explanation: string;
  recommendation: string;
  page_number?: number;
}

export interface FullAnalysis {
  id: string;
  document_id: string;
  analyses: AnalysisResult[];
  risk_score: number | null;
  risk_items: RiskItem[] | null;
  created_at: string;
}

export interface Citation {
  chunk_index: number;
  page_number: number | null;
  content: string;
  relevance_score: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations: Citation[];
  created_at: string;
}

export interface SearchResult {
  document_id: string;
  document_name: string;
  chunk_content: string;
  page_number: number | null;
  relevance_score: number;
  highlight?: string;
}

export interface DashboardStats {
  total_documents: number;
  total_analyses: number;
  total_queries: number;
  average_risk_score: number;
  risk_distribution: {
    high: number;
    medium: number;
    low: number;
  };
  recent_documents: {
    id: string;
    filename: string;
    status: string;
    pages: number;
    size: number;
    created_at: string;
  }[];
}
