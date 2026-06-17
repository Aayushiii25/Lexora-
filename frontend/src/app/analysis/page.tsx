"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getDocuments, getAnalysis, analyzeDocument } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BarChart3, Loader2, FileText, AlertTriangle } from "lucide-react";

const ANALYSIS_LABELS: Record<string, string> = {
  executive_summary: "Executive Summary",
  key_clauses: "Key Clauses",
  obligations: "Obligations",
  important_dates: "Important Dates",
  payment_terms: "Payment Terms",
  termination_conditions: "Termination Conditions",
  confidentiality: "Confidentiality",
  liability: "Liability",
  missing_clauses: "Missing Clauses",
  improvements: "Recommendations",
  risk_analysis: "Risk Analysis",
};

function RenderAnalysisContent({ type, content }: { type: string; content: Record<string, unknown> }) {
  if (content?.error) {
    return (
      <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">
        {String(content.error)}
      </div>
    );
  }

  // Render the JSON content in a structured way
  return (
    <div className="space-y-3">
      {Object.entries(content).map(([key, value]) => {
        if (key === "mock") return null;

        if (Array.isArray(value)) {
          return (
            <div key={key}>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                {key.replace(/_/g, " ")}
              </div>
              <div className="space-y-2">
                {value.map((item: Record<string, unknown>, i: number) => (
                  <div key={i} className="panel p-3 text-sm space-y-1.5">
                    {typeof item === "object" && item !== null ? (
                      Object.entries(item).map(([k, v]) => (
                        <div key={k} className="flex gap-2">
                          <span className="text-muted-foreground text-xs min-w-[100px] shrink-0">
                            {k.replace(/_/g, " ")}:
                          </span>
                          <span className="text-sm">
                            {k === "severity" || k === "importance" || k === "priority" ? (
                              <Badge
                                variant={
                                  String(v) === "high" || String(v) === "critical"
                                    ? "destructive"
                                    : String(v) === "medium" || String(v) === "important"
                                    ? "secondary"
                                    : "default"
                                }
                                className="text-[10px] font-mono uppercase"
                              >
                                {String(v)}
                              </Badge>
                            ) : (
                              String(v)
                            )}
                          </span>
                        </div>
                      ))
                    ) : (
                      <span>{String(item)}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        }

        if (typeof value === "object" && value !== null) {
          return (
            <div key={key}>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                {key.replace(/_/g, " ")}
              </div>
              <div className="panel p-3 text-sm space-y-1">
                {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
                  <div key={k} className="flex gap-2">
                    <span className="text-muted-foreground text-xs min-w-[100px]">
                      {k.replace(/_/g, " ")}:
                    </span>
                    <span>{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        }

        return (
          <div key={key}>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              {key.replace(/_/g, " ")}
            </div>
            <div className="text-sm leading-relaxed">{String(value)}</div>
          </div>
        );
      })}
    </div>
  );
}

export default function AnalysisPage() {
  const searchParams = useSearchParams();
  const initialDocId = searchParams.get("doc") || "";
  const [selectedDocId, setSelectedDocId] = useState(initialDocId);

  const { data: docsData } = useQuery({
    queryKey: ["documents"],
    queryFn: getDocuments,
  });

  const {
    data: analysisData,
    isLoading: analysisLoading,
    refetch: refetchAnalysis,
  } = useQuery({
    queryKey: ["analysis", selectedDocId],
    queryFn: () => getAnalysis(selectedDocId),
    enabled: !!selectedDocId,
    retry: false,
  });

  const analyzeMutation = useMutation({
    mutationFn: () => analyzeDocument(selectedDocId),
    onSuccess: () => {
      toast.success("Analysis complete");
      refetchAnalysis();
    },
    onError: (e: Error) => {
      toast.error(`Analysis failed: ${e.message}`);
    },
  });

  const documents = docsData?.documents || [];
  const analyses = analysisData?.analyses || [];

  return (
    <div className="p-6 space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            ANALYSIS WORKSPACE
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Clause extraction, obligation mapping, and structured document analysis
          </p>
        </div>
      </div>

      {/* Document Selector + Run */}
      <div className="flex items-center gap-3">
        <Select value={selectedDocId} onValueChange={(v) => setSelectedDocId(v ?? "")}>
          <SelectTrigger className="w-[400px]">
            <SelectValue placeholder="Select document to analyze" />
          </SelectTrigger>
          <SelectContent>
            {documents.map((doc) => (
              <SelectItem key={doc.id} value={doc.id}>
                <span className="flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5" />
                  {doc.original_filename}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          onClick={() => analyzeMutation.mutate()}
          disabled={!selectedDocId || analyzeMutation.isPending}
          size="sm"
          className="gap-2"
        >
          {analyzeMutation.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <BarChart3 className="h-3.5 w-3.5" />
          )}
          {analyzeMutation.isPending ? "Analyzing..." : "Run Full Analysis"}
        </Button>
      </div>

      {/* Analysis Results */}
      {analysisLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : analyses.length > 0 ? (
        <div className="flex-1 min-h-0">
          <Tabs defaultValue={analyses[0]?.analysis_type} className="h-full flex flex-col">
            <TabsList className="bg-muted/30 border border-border flex-wrap h-auto gap-1 p-1">
              {analyses.map((a) => (
                <TabsTrigger
                  key={a.analysis_type}
                  value={a.analysis_type}
                  className="text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                >
                  {a.analysis_type === "risk_analysis" && (
                    <AlertTriangle className="h-3 w-3 mr-1" />
                  )}
                  {ANALYSIS_LABELS[a.analysis_type] || a.analysis_type}
                </TabsTrigger>
              ))}
            </TabsList>
            {analyses.map((a) => (
              <TabsContent key={a.analysis_type} value={a.analysis_type} className="flex-1 mt-4">
                <ScrollArea className="h-[calc(100vh-320px)]">
                  <div className="panel p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {ANALYSIS_LABELS[a.analysis_type] || a.analysis_type}
                      </div>
                      <Badge
                        variant={a.status === "completed" ? "default" : "destructive"}
                        className="text-[10px] font-mono uppercase"
                      >
                        {a.status}
                      </Badge>
                    </div>
                    <RenderAnalysisContent
                      type={a.analysis_type}
                      content={a.content as Record<string, unknown>}
                    />
                  </div>
                </ScrollArea>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      ) : selectedDocId ? (
        <div className="panel p-12 text-center">
          <BarChart3 className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
          <div className="text-sm text-muted-foreground mb-3">
            No analysis results found for this document.
          </div>
          <Button
            onClick={() => analyzeMutation.mutate()}
            disabled={analyzeMutation.isPending}
            size="sm"
            className="gap-2"
          >
            {analyzeMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <BarChart3 className="h-3.5 w-3.5" />
            )}
            Run Analysis
          </Button>
        </div>
      ) : (
        <div className="panel p-12 text-center">
          <FileText className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
          <div className="text-sm text-muted-foreground">
            Select a document to view or run analysis.
          </div>
        </div>
      )}
    </div>
  );
}
