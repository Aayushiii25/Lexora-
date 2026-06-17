"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getDocuments, extractObligations } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { ListChecks, FileText, Loader2 } from "lucide-react";

interface Obligation {
  id: string;
  party: string;
  description: string;
  type: string;
  trigger: string;
  deadline: string;
  frequency: string;
  consequence: string;
  priority: string;
  status: string;
  clause_reference: string;
  page_number: number;
}

export default function ObligationsPage() {
  const [selectedDocId, setSelectedDocId] = useState("");
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [summary, setSummary] = useState<Record<string, unknown>>({});
  const [filterType, setFilterType] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");

  const { data: docsData } = useQuery({
    queryKey: ["documents"],
    queryFn: getDocuments,
  });

  const extractMutation = useMutation({
    mutationFn: () => extractObligations(selectedDocId),
    onSuccess: (data) => {
      const d = data as {
        obligations?: Obligation[];
        by_party?: Record<string, number>;
        by_type?: Record<string, number>;
        by_priority?: Record<string, number>;
        total_obligations?: number;
      };
      setObligations(d.obligations || []);
      setSummary({
        by_party: d.by_party || {},
        by_type: d.by_type || {},
        by_priority: d.by_priority || {},
        total: d.total_obligations || 0,
      });
      toast.success("Obligations extracted");
    },
    onError: (e: Error) => {
      toast.error(`Extraction failed: ${e.message}`);
    },
  });

  const documents = docsData?.documents || [];

  const filteredObligations = obligations.filter((o) => {
    if (filterType !== "all" && o.type !== filterType) return false;
    if (filterPriority !== "all" && o.priority !== filterPriority) return false;
    return true;
  });

  const uniqueTypes = [...new Set(obligations.map((o) => o.type))];
  const uniqueParties = [...new Set(obligations.map((o) => o.party))];

  const priorityColor = (p: string) => {
    if (p === "critical") return "destructive";
    if (p === "high") return "destructive";
    if (p === "medium") return "secondary";
    return "default";
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          OBLIGATION TRACKER
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Extract, classify, and track contractual obligations by party, type, and deadline
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
        <Button
          onClick={() => extractMutation.mutate()}
          disabled={!selectedDocId || extractMutation.isPending}
          size="sm"
          className="gap-2"
        >
          {extractMutation.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <ListChecks className="h-3.5 w-3.5" />
          )}
          Extract Obligations
        </Button>
      </div>

      {obligations.length > 0 && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-4">
            <div className="panel p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Total Obligations
              </div>
              <div className="text-2xl font-bold font-mono">{obligations.length}</div>
            </div>
            <div className="panel p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Parties
              </div>
              <div className="text-2xl font-bold font-mono">{uniqueParties.length}</div>
              <div className="text-xs text-muted-foreground mt-1 truncate">
                {uniqueParties.slice(0, 2).join(", ")}
              </div>
            </div>
            <div className="panel p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Critical/High
              </div>
              <div className="text-2xl font-bold font-mono risk-high">
                {obligations.filter((o) => o.priority === "critical" || o.priority === "high").length}
              </div>
            </div>
            <div className="panel p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Types
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                {uniqueTypes.map((t) => (
                  <code key={t} className="text-[10px] bg-muted px-1 py-0.5 rounded font-mono">
                    {t}
                  </code>
                ))}
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {uniqueTypes.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">
              Showing {filteredObligations.length} of {obligations.length}
            </span>
          </div>

          {/* Obligations Table */}
          <div className="panel">
            <ScrollArea className="h-[calc(100vh-440px)]">
              <table className="w-full">
                <thead className="sticky top-0 bg-card z-10">
                  <tr className="border-b border-border text-left">
                    <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-16">ID</th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-20">Priority</th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-28">Party</th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-24">Type</th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Description</th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-28">Deadline</th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-24">Frequency</th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-14 text-right">Pg</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredObligations.map((obl, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-accent/30 transition-colors align-top">
                      <td className="px-4 py-2.5 text-xs font-mono text-muted-foreground">{obl.id}</td>
                      <td className="px-4 py-2.5">
                        <Badge variant={priorityColor(obl.priority) as "destructive" | "secondary" | "default"} className="text-[10px] font-mono uppercase">
                          {obl.priority}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-xs font-medium">{obl.party}</td>
                      <td className="px-4 py-2.5">
                        <code className="text-[10px] bg-muted px-1 py-0.5 rounded font-mono">{obl.type}</code>
                      </td>
                      <td className="px-4 py-2.5 text-sm">{obl.description}</td>
                      <td className="px-4 py-2.5 text-xs font-mono text-muted-foreground">{obl.deadline || "—"}</td>
                      <td className="px-4 py-2.5 text-xs font-mono text-muted-foreground">{obl.frequency}</td>
                      <td className="px-4 py-2.5 text-xs font-mono text-right text-muted-foreground">{obl.page_number || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>
          </div>
        </>
      )}

      {obligations.length === 0 && !extractMutation.isPending && selectedDocId && (
        <div className="panel p-12 text-center">
          <ListChecks className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
          <div className="text-sm text-muted-foreground">
            Click &quot;Extract Obligations&quot; to analyze the document.
          </div>
        </div>
      )}

      {extractMutation.isPending && (
        <div className="panel p-12 text-center">
          <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto mb-3" />
          <div className="text-sm text-muted-foreground">
            Extracting and classifying obligations...
          </div>
        </div>
      )}
    </div>
  );
}
