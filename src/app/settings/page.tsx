"use client";

import { useQuery } from "@tanstack/react-query";
import { healthCheck } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Settings, Server, Database, Brain, HardDrive } from "lucide-react";

export default function SettingsPage() {
  const { data: health, isLoading } = useQuery({
    queryKey: ["health"],
    queryFn: healthCheck,
    refetchInterval: 30000,
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">SETTINGS</h1>
        <p className="text-sm text-muted-foreground mt-1">
          System configuration and service status
        </p>
      </div>

      {/* System Status */}
      <div className="panel">
        <div className="panel-header flex items-center gap-2">
          <Server className="h-3.5 w-3.5" />
          <span>Service Status</span>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`status-dot ${health?.status === "healthy" ? "status-dot--success" : "status-dot--error"}`} />
              <span className="text-sm">API Server</span>
            </div>
            <Badge variant={health?.status === "healthy" ? "default" : "destructive"} className="text-[10px] font-mono uppercase">
              {isLoading ? "checking..." : health?.status || "unknown"}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Version</span>
            <code className="text-xs font-mono text-muted-foreground">{health?.version || "—"}</code>
          </div>
        </div>
      </div>

      {/* Architecture */}
      <div className="panel">
        <div className="panel-header">System Architecture</div>
        <div className="p-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Frontend Stack
              </div>
              {[
                { label: "Framework", value: "Next.js 15 (App Router)" },
                { label: "Language", value: "TypeScript" },
                { label: "Styling", value: "Tailwind CSS v4" },
                { label: "Components", value: "shadcn/ui" },
                { label: "State", value: "TanStack React Query" },
                { label: "HTTP Client", value: "Axios" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{item.label}</span>
                  <code className="text-[11px] font-mono bg-muted px-1.5 py-0.5 rounded">{item.value}</code>
                </div>
              ))}
            </div>
            <div className="space-y-3">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Backend Stack
              </div>
              {[
                { label: "Framework", value: "FastAPI (Python 3.12)" },
                { label: "ORM", value: "SQLAlchemy (async)" },
                { label: "Database", value: "PostgreSQL (Neon)" },
                { label: "Vector Store", value: "ChromaDB (cosine)" },
                { label: "LLM", value: "OpenAI GPT-4o" },
                { label: "Embeddings", value: "text-embedding-3-small" },
                { label: "PDF Engine", value: "PyMuPDF" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{item.label}</span>
                  <code className="text-[11px] font-mono bg-muted px-1.5 py-0.5 rounded">{item.value}</code>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Processing Configuration */}
      <div className="panel">
        <div className="panel-header">Processing Configuration</div>
        <div className="p-4 space-y-3">
          {[
            { label: "Chunk Size", value: "1500 words", desc: "Text segment size for embedding" },
            { label: "Chunk Overlap", value: "200 words", desc: "Overlap between adjacent chunks" },
            { label: "Embedding Dimension", value: "1536", desc: "text-embedding-3-small output" },
            { label: "Similarity Metric", value: "Cosine", desc: "ChromaDB distance function" },
            { label: "RAG Context", value: "Top-5 chunks", desc: "Chunks retrieved per query" },
            { label: "Max File Size", value: "50 MB", desc: "Upload limit per document" },
            { label: "Analysis Model", value: "GPT-4o (JSON mode)", desc: "Structured output generation" },
            { label: "Temperature", value: "0.1", desc: "Low temperature for factual extraction" },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between">
              <div>
                <span className="text-sm">{item.label}</span>
                <span className="text-xs text-muted-foreground ml-3">{item.desc}</span>
              </div>
              <code className="text-[11px] font-mono bg-muted px-1.5 py-0.5 rounded">{item.value}</code>
            </div>
          ))}
        </div>
      </div>

      {/* Environment Variables */}
      <div className="panel">
        <div className="panel-header">Required Environment Variables</div>
        <div className="p-4">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Variable</th>
                <th className="pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Service</th>
                <th className="pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Required</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {[
                { name: "DATABASE_URL", service: "PostgreSQL", required: true },
                { name: "OPENAI_API_KEY", service: "OpenAI", required: true },
                { name: "SECRET_KEY", service: "JWT Auth", required: true },
                { name: "CHROMA_PERSIST_DIR", service: "ChromaDB", required: false },
                { name: "NEXT_PUBLIC_API_URL", service: "Frontend → API", required: true },
              ].map((env) => (
                <tr key={env.name} className="border-b border-border/50">
                  <td className="py-2 font-mono text-xs">{env.name}</td>
                  <td className="py-2 text-muted-foreground text-xs">{env.service}</td>
                  <td className="py-2">
                    <Badge variant={env.required ? "destructive" : "secondary"} className="text-[10px] font-mono uppercase">
                      {env.required ? "required" : "optional"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Keyboard Shortcuts */}
      <div className="panel">
        <div className="panel-header">Keyboard Shortcuts</div>
        <div className="p-4 grid grid-cols-2 gap-2">
          {[
            { key: "⌘ + K", action: "Quick search" },
            { key: "⌘ + U", action: "Upload document" },
            { key: "⌘ + /", action: "Focus query input" },
            { key: "Enter", action: "Send query / Submit" },
            { key: "Esc", action: "Close dialog" },
          ].map((shortcut) => (
            <div key={shortcut.key} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{shortcut.action}</span>
              <kbd className="text-[10px] font-mono bg-muted border border-border px-1.5 py-0.5 rounded">
                {shortcut.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
