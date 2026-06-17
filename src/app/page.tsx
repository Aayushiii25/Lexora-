"use client";

import { useQuery } from "@tanstack/react-query";
import { getDashboardStats } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  BarChart3,
  MessageSquare,
  ShieldAlert,
  Clock,
  HardDrive,
} from "lucide-react";

function StatCard({
  label,
  value,
  icon: Icon,
  sub,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  sub?: string;
}) {
  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <Icon className="h-4 w-4 text-muted-foreground/50" />
      </div>
      <div className="text-2xl font-bold font-mono">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

function RiskGauge({ score }: { score: number }) {
  const getColor = (s: number) => {
    if (s >= 70) return "risk-high";
    if (s >= 40) return "risk-medium";
    return "risk-low";
  };
  const getBg = (s: number) => {
    if (s >= 70) return "bg-red-500/20";
    if (s >= 40) return "bg-yellow-500/20";
    return "bg-green-500/20";
  };

  return (
    <div className="panel p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        Average Risk Score
      </div>
      <div className="flex items-end gap-3">
        <span className={`text-4xl font-bold font-mono ${getColor(score)}`}>
          {score}
        </span>
        <span className="text-sm text-muted-foreground mb-1">/100</span>
      </div>
      <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${getBg(score)}`}
          style={{
            width: `${score}%`,
            background:
              score >= 70
                ? "oklch(0.65 0.25 25)"
                : score >= 40
                ? "oklch(0.75 0.18 70)"
                : "oklch(0.7 0.18 145)",
          }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground mt-1.5 font-mono">
        <span>LOW</span>
        <span>MEDIUM</span>
        <span>HIGH</span>
      </div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: getDashboardStats,
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-80" />
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-40 rounded-lg col-span-1" />
          <Skeleton className="h-40 rounded-lg col-span-2" />
        </div>
      </div>
    );
  }

  const riskDist = stats?.risk_distribution || { high: 0, medium: 0, low: 0 };
  const totalRisks = riskDist.high + riskDist.medium + riskDist.low;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          INTELLIGENCE DASHBOARD
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          System overview and document intelligence metrics
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Documents"
          value={stats?.total_documents ?? 0}
          icon={FileText}
          sub="Total indexed"
        />
        <StatCard
          label="Analyses"
          value={stats?.total_analyses ?? 0}
          icon={BarChart3}
          sub="Completed runs"
        />
        <StatCard
          label="Queries"
          value={stats?.total_queries ?? 0}
          icon={MessageSquare}
          sub="RAG interactions"
        />
        <StatCard
          label="Risk Alerts"
          value={riskDist.high}
          icon={ShieldAlert}
          sub={`${riskDist.medium} medium, ${riskDist.low} low`}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Risk Gauge */}
        <RiskGauge score={stats?.average_risk_score ?? 0} />

        {/* Risk Distribution */}
        <div className="panel p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Risk Distribution
          </div>
          <div className="space-y-3">
            {[
              { label: "High", count: riskDist.high, color: "bg-red-500" },
              { label: "Medium", count: riskDist.medium, color: "bg-yellow-500" },
              { label: "Low", count: riskDist.low, color: "bg-green-500" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-14">
                  {item.label}
                </span>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full ${item.color}`}
                    style={{
                      width: totalRisks
                        ? `${(item.count / totalRisks) * 100}%`
                        : "0%",
                    }}
                  />
                </div>
                <span className="text-xs font-mono text-muted-foreground w-8 text-right">
                  {item.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Processing Pipeline Status */}
        <div className="panel p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Processing Pipeline
          </div>
          <div className="space-y-2.5 text-sm">
            {[
              { label: "PDF Extraction", tech: "PyMuPDF" },
              { label: "Text Chunking", tech: "1500w / 200w overlap" },
              { label: "Embeddings", tech: "text-embedding-3-small" },
              { label: "Vector Store", tech: "ChromaDB (cosine)" },
              { label: "Analysis Engine", tech: "GPT-4o (JSON mode)" },
              { label: "Search", tech: "Semantic + FTS" },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between"
              >
                <span className="text-muted-foreground text-xs">
                  {item.label}
                </span>
                <code className="text-[11px] font-mono text-primary/80 bg-primary/5 px-1.5 py-0.5 rounded">
                  {item.tech}
                </code>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Documents Table */}
      <div className="panel">
        <div className="panel-header flex items-center justify-between">
          <span>Recent Documents</span>
          <Clock className="h-3.5 w-3.5" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full table-dense">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Filename
                </th>
                <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right">
                  Pages
                </th>
                <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right">
                  Size
                </th>
                <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right">
                  Uploaded
                </th>
              </tr>
            </thead>
            <tbody>
              {stats?.recent_documents?.length ? (
                stats.recent_documents.map((doc) => (
                  <tr
                    key={doc.id}
                    className="border-b border-border/50 hover:bg-accent/30 transition-colors"
                  >
                    <td className="px-4 py-2.5 text-sm font-medium truncate max-w-[300px]">
                      {doc.filename}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge
                        variant={
                          doc.status === "completed"
                            ? "default"
                            : doc.status === "failed"
                            ? "destructive"
                            : "secondary"
                        }
                        className="text-[10px] font-mono uppercase"
                      >
                        {doc.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-sm font-mono text-right text-muted-foreground">
                      {doc.pages}
                    </td>
                    <td className="px-4 py-2.5 text-sm font-mono text-right text-muted-foreground">
                      {formatBytes(doc.size)}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-right text-muted-foreground">
                      {doc.created_at ? formatDate(doc.created_at) : "—"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    No documents uploaded yet. Upload a PDF to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
