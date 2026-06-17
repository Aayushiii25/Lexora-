"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getDocuments, compareDocuments } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GitCompareArrows, FileText, Loader2, AlertTriangle, Minus, Plus } from "lucide-react";

interface ComparisonResult {
  alignment_score?: number;
  doc_a_name?: string;
  doc_b_name?: string;
  summary?: string;
  conflicts?: Array<{
    clause_topic: string;
    doc_a_text: string;
    doc_b_text: string;
    severity: string;
    explanation: string;
  }>;
  missing_in_a?: Array<{
    clause_topic: string;
    doc_b_text: string;
    importance: string;
  }>;
  missing_in_b?: Array<{
    clause_topic: string;
    doc_a_text: string;
    importance: string;
  }>;
  divergent_terms?: Array<{
    clause_topic: string;
    doc_a_term: string;
    doc_b_term: string;
    risk_note: string;
  }>;
}

export default function ComparePage() {
  const [docAId, setDocAId] = useState("");
  const [docBId, setDocBId] = useState("");
  const [result, setResult] = useState<ComparisonResult | null>(null);

  const { data: docsData } = useQuery({
    queryKey: ["documents"],
    queryFn: getDocuments,
  });

  const compareMutation = useMutation({
    mutationFn: () => compareDocuments(docAId, docBId),
    onSuccess: (data) => {
      setResult(data as ComparisonResult);
      toast.success("Comparison complete");
    },
    onError: (e: Error) => {
      toast.error(`Comparison failed: ${e.message}`);
    },
  });

  const documents = docsData?.documents || [];

  const importanceColor = (imp: string) => {
    if (imp === "critical") return "destructive";
    if (imp === "important" || imp === "high") return "secondary";
    return "default";
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          DOCUMENT COMPARISON
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Cross-document analysis: conflict detection, missing clause identification, and term divergence
        </p>
      </div>

      {/* Document Selectors */}
      <div className="grid grid-cols-2 gap-4">
        <div className="panel p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Document A
          </div>
          <Select value={docAId} onValueChange={(val) => setDocAId(val || "")}>
            <SelectTrigger>
              <SelectValue placeholder="Select first document" />
            </SelectTrigger>
            <SelectContent>
              {documents.map((doc) => (
                <SelectItem key={doc.id} value={doc.id} disabled={doc.id === docBId}>
                  <span className="flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5" />
                    {doc.original_filename}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="panel p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Document B
          </div>
          <Select value={docBId} onValueChange={(val) => setDocBId(val || "")}>
            <SelectTrigger>
              <SelectValue placeholder="Select second document" />
            </SelectTrigger>
            <SelectContent>
              {documents.map((doc) => (
                <SelectItem key={doc.id} value={doc.id} disabled={doc.id === docAId}>
                  <span className="flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5" />
                    {doc.original_filename}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button
        onClick={() => compareMutation.mutate()}
        disabled={!docAId || !docBId || compareMutation.isPending}
        size="sm"
        className="gap-2"
      >
        {compareMutation.isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <GitCompareArrows className="h-3.5 w-3.5" />
        )}
        {compareMutation.isPending ? "Comparing..." : "Run Comparison"}
      </Button>

      {compareMutation.isPending && (
        <div className="panel p-12 text-center">
          <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto mb-3" />
          <div className="text-sm text-muted-foreground">
            Analyzing documents for conflicts, gaps, and divergent terms...
          </div>
        </div>
      )}

      {result && (
        <ScrollArea className="h-[calc(100vh-340px)]">
          <div className="space-y-6">
            {/* Alignment Score */}
            <div className="grid grid-cols-3 gap-4">
              <div className="panel p-4">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Alignment Score
                </div>
                <div className={`text-3xl font-bold font-mono ${
                  (result.alignment_score || 0) >= 70 ? "risk-low" :
                  (result.alignment_score || 0) >= 40 ? "risk-medium" : "risk-high"
                }`}>
                  {result.alignment_score || 0}%
                </div>
              </div>
              <div className="panel p-4">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Conflicts Found
                </div>
                <div className="text-3xl font-bold font-mono risk-high">
                  {result.conflicts?.length || 0}
                </div>
              </div>
              <div className="panel p-4">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Divergent Terms
                </div>
                <div className="text-3xl font-bold font-mono risk-medium">
                  {result.divergent_terms?.length || 0}
                </div>
              </div>
            </div>

            {/* Summary */}
            {result.summary && (
              <div className="panel p-4">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Comparison Summary
                </div>
                <p className="text-sm leading-relaxed">{result.summary}</p>
              </div>
            )}

            {/* Conflicts */}
            {result.conflicts && result.conflicts.length > 0 && (
              <div className="panel">
                <div className="panel-header flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 risk-high" />
                  <span>Conflicting Clauses ({result.conflicts.length})</span>
                </div>
                <div className="divide-y divide-border">
                  {result.conflicts.map((c, i) => (
                    <div key={i} className="p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{c.clause_topic}</span>
                        <Badge variant={importanceColor(c.severity) as "destructive" | "secondary" | "default"} className="text-[10px] font-mono uppercase">
                          {c.severity}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-red-500/5 border border-red-500/10 rounded p-2.5">
                          <div className="text-[10px] font-mono text-muted-foreground mb-1">
                            DOC A: {result.doc_a_name}
                          </div>
                          <div className="text-xs">{c.doc_a_text}</div>
                        </div>
                        <div className="bg-red-500/5 border border-red-500/10 rounded p-2.5">
                          <div className="text-[10px] font-mono text-muted-foreground mb-1">
                            DOC B: {result.doc_b_name}
                          </div>
                          <div className="text-xs">{c.doc_b_text}</div>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">{c.explanation}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Missing Clauses */}
            {((result.missing_in_a?.length || 0) > 0 || (result.missing_in_b?.length || 0) > 0) && (
              <div className="grid grid-cols-2 gap-4">
                <div className="panel">
                  <div className="panel-header flex items-center gap-2">
                    <Minus className="h-3.5 w-3.5" />
                    <span>Missing in Doc A ({result.missing_in_a?.length || 0})</span>
                  </div>
                  <div className="divide-y divide-border">
                    {result.missing_in_a?.map((m, i) => (
                      <div key={i} className="p-3 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium">{m.clause_topic}</span>
                          <Badge variant={importanceColor(m.importance) as "destructive" | "secondary" | "default"} className="text-[10px] font-mono uppercase">
                            {m.importance}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">{m.doc_b_text}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="panel">
                  <div className="panel-header flex items-center gap-2">
                    <Minus className="h-3.5 w-3.5" />
                    <span>Missing in Doc B ({result.missing_in_b?.length || 0})</span>
                  </div>
                  <div className="divide-y divide-border">
                    {result.missing_in_b?.map((m, i) => (
                      <div key={i} className="p-3 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium">{m.clause_topic}</span>
                          <Badge variant={importanceColor(m.importance) as "destructive" | "secondary" | "default"} className="text-[10px] font-mono uppercase">
                            {m.importance}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">{m.doc_a_text}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Divergent Terms */}
            {result.divergent_terms && result.divergent_terms.length > 0 && (
              <div className="panel">
                <div className="panel-header">Divergent Terms ({result.divergent_terms.length})</div>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Topic</th>
                      <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Doc A Term</th>
                      <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Doc B Term</th>
                      <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Risk Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.divergent_terms.map((dt, i) => (
                      <tr key={i} className="border-b border-border/50 hover:bg-accent/30 align-top">
                        <td className="px-4 py-2.5 text-sm font-medium">{dt.clause_topic}</td>
                        <td className="px-4 py-2.5 text-xs font-mono bg-blue-500/5">{dt.doc_a_term}</td>
                        <td className="px-4 py-2.5 text-xs font-mono bg-orange-500/5">{dt.doc_b_term}</td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">{dt.risk_note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
