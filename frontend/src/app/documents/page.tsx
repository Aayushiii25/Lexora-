"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDocuments, deleteDocument } from "@/lib/api";
import Link from "next/link";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Trash2,
  BarChart3,
  MessageSquare,
  ShieldAlert,
  ExternalLink,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DocumentsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["documents"],
    queryFn: getDocuments,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Document deleted");
    },
    onError: () => {
      toast.error("Failed to delete document");
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full rounded-lg" />
      </div>
    );
  }

  const documents = data?.documents || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">DOCUMENT INDEX</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {documents.length} document{documents.length !== 1 ? "s" : ""} indexed
          </p>
        </div>
        <Link href="/upload">
          <Button size="sm" className="gap-2">
            <FileText className="h-3.5 w-3.5" />
            Upload
          </Button>
        </Link>
      </div>

      <div className="panel">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Document
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
                <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {documents.length > 0 ? (
                documents.map((doc) => (
                  <tr
                    key={doc.id}
                    className="border-b border-border/50 hover:bg-accent/30 transition-colors group"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm font-medium truncate max-w-[280px]">
                          {doc.original_filename}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          doc.upload_status === "completed"
                            ? "default"
                            : doc.upload_status === "failed"
                            ? "destructive"
                            : "secondary"
                        }
                        className="text-[10px] font-mono uppercase"
                      >
                        {doc.upload_status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-right text-muted-foreground">
                      {doc.page_count}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-right text-muted-foreground">
                      {formatBytes(doc.file_size)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-muted-foreground">
                      {formatDate(doc.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link href={`/analysis?doc=${doc.id}`}>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <BarChart3 className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                        <Link href={`/risk?doc=${doc.id}`}>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <ShieldAlert className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                        <Link href={`/query?doc=${doc.id}`}>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <MessageSquare className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm("Delete this document and all associated data?")) {
                              deleteMutation.mutate(doc.id);
                            }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <FileText className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                    <div className="text-sm text-muted-foreground">
                      No documents indexed. Upload a PDF to begin analysis.
                    </div>
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
