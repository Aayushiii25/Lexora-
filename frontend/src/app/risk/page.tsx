"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getDocuments, getAnalysis } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShieldAlert, FileText, AlertTriangle } from "lucide-react";

export default function RiskPage() {
  const searchParams = useSearchParams();
  const [selectedDocId, setSelectedDocId] = useState(searchParams.get("doc") || "");

  const { data: docsData } = useQuery({
    queryKey: ["documents"],
    queryFn: getDocuments,
  });

  const { data: analysisData, isLoading } = useQuery({
    queryKey: ["analysis", selectedDocId],
    queryFn: () => getAnalysis(selectedDocId),
    enabled: !!selectedDocId,
    retry: false,
  });

  const documents = docsData?.documents || [];

  // Extract risk analysis
  const riskAnalysis = analysisData?.analyses?.find(
    (a) => a.analysis_type === "risk_analysis"
  );
  const riskContent = riskAnalysis?.content as Record<string, unknown> | undefined;
  const risks = (riskContent?.risks || []) as Array<{
    clause: string;
    risk_type: string;
    severity: string;
    score: number;
    explanation: string;
    recommendation: string;
    page_number?: number;
  }>;
  const overallScore = (riskContent?.overall_risk_score as number) || 0;
  const riskLevel = (riskContent?.risk_level as string) || "—";
  const riskSummary = (riskContent?.risk_summary as string) || "";

  const highRisks = risks.filter((r) => r.severity === "high");
  const mediumRisks = risks.filter((r) => r.severity === "medium");
  const lowRisks = risks.filter((r) => r.severity === "low");

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          RISK ASSESSMENT DASHBOARD
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Automated risk classification across liability, payment, termination, compliance, and IP dimensions
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Select value={selectedDocId} onValueChange={(v) => setSelectedDocId(v ?? "")}>
          <SelectTrigger className="w-[400px]">
            <SelectValue placeholder="Select document" />
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
      </div>

      {isLoading ? (
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
      ) : riskAnalysis ? (
        <>
          {/* Risk Overview */}
          <div className="grid grid-cols-4 gap-4">
            <div className="panel p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Overall Risk Score
              </div>
              <div className={`text-3xl font-bold font-mono ${
                overallScore >= 70 ? "risk-high" : overallScore >= 40 ? "risk-medium" : "risk-low"
              }`}>
                {overallScore}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Level: <span className="uppercase font-mono">{riskLevel}</span>
              </div>
            </div>
            <div className="panel p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                High Risk
              </div>
              <div className="text-3xl font-bold font-mono risk-high">{highRisks.length}</div>
              <div className="text-xs text-muted-foreground mt-1">Requires immediate review</div>
            </div>
            <div className="panel p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Medium Risk
              </div>
              <div className="text-3xl font-bold font-mono risk-medium">{mediumRisks.length}</div>
              <div className="text-xs text-muted-foreground mt-1">Requires attention</div>
            </div>
            <div className="panel p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Low Risk
              </div>
              <div className="text-3xl font-bold font-mono risk-low">{lowRisks.length}</div>
              <div className="text-xs text-muted-foreground mt-1">Acceptable</div>
            </div>
          </div>

          {/* Risk Summary */}
          {riskSummary && (
            <div className="panel p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Risk Summary
              </div>
              <p className="text-sm leading-relaxed">{riskSummary}</p>
            </div>
          )}

          {/* Risk Table */}
          <div className="panel">
            <div className="panel-header flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Identified Risks ({risks.length})</span>
            </div>
            <ScrollArea className="h-[calc(100vh-480px)]">
              <table className="w-full">
                <thead className="sticky top-0 bg-card z-10">
                  <tr className="border-b border-border text-left">
                    <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-16">
                      Score
                    </th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-20">
                      Severity
                    </th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-32">
                      Type
                    </th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Explanation
                    </th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Recommendation
                    </th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-14 text-right">
                      Page
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {risks.map((risk, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-accent/30 transition-colors align-top">
                      <td className="px-4 py-3">
                        <span className={`text-sm font-bold font-mono ${
                          risk.severity === "high" ? "risk-high" :
                          risk.severity === "medium" ? "risk-medium" : "risk-low"
                        }`}>
                          {risk.score}/10
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            risk.severity === "high" ? "destructive" :
                            risk.severity === "medium" ? "secondary" : "default"
                          }
                          className="text-[10px] font-mono uppercase"
                        >
                          {risk.severity}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                        {risk.risk_type}
                      </td>
                      <td className="px-4 py-3 text-sm max-w-[300px]">
                        {risk.explanation}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground max-w-[250px]">
                        {risk.recommendation}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-right text-muted-foreground">
                        {risk.page_number || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>
          </div>
        </>
      ) : selectedDocId ? (
        <div className="panel p-12 text-center">
          <ShieldAlert className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
          <div className="text-sm text-muted-foreground">
            No risk analysis found. Run analysis from the Analysis Workspace first.
          </div>
        </div>
      ) : (
        <div className="panel p-12 text-center">
          <FileText className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
          <div className="text-sm text-muted-foreground">
            Select a document to view risk assessment.
          </div>
        </div>
      )}
    </div>
  );
}
