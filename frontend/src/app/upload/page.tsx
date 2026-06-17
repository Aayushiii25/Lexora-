"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { uploadDocument } from "@/lib/api";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Upload,
  FileText,
  CheckCircle2,
  XCircle,
  Loader2,
  HardDrive,
} from "lucide-react";

interface UploadItem {
  file: File;
  status: "queued" | "uploading" | "processing" | "completed" | "failed";
  progress: number;
  documentId?: string;
  error?: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export default function UploadPage() {
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: uploadDocument,
    onSuccess: (data, file) => {
      setUploads((prev) =>
        prev.map((u) =>
          u.file === file
            ? { ...u, status: "completed", progress: 100, documentId: data.id }
            : u
        )
      );
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success(`${file.name} processed successfully`);
    },
    onError: (error: Error, file) => {
      setUploads((prev) =>
        prev.map((u) =>
          u.file === file
            ? { ...u, status: "failed", error: error.message }
            : u
        )
      );
      toast.error(`Failed to process ${file.name}`);
    },
  });

  const processQueue = useCallback(
    async (files: File[]) => {
      for (const file of files) {
        setUploads((prev) =>
          prev.map((u) =>
            u.file === file ? { ...u, status: "uploading", progress: 30 } : u
          )
        );

        // Simulate processing stages
        setTimeout(() => {
          setUploads((prev) =>
            prev.map((u) =>
              u.file === file && u.status === "uploading"
                ? { ...u, status: "processing", progress: 60 }
                : u
            )
          );
        }, 500);

        await uploadMutation.mutateAsync(file);
      }
    },
    [uploadMutation]
  );

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const pdfFiles = acceptedFiles.filter(
        (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")
      );

      if (pdfFiles.length === 0) {
        toast.error("Only PDF files are supported");
        return;
      }

      const newUploads: UploadItem[] = pdfFiles.map((file) => ({
        file,
        status: "queued",
        progress: 0,
      }));

      setUploads((prev) => [...newUploads, ...prev]);
      processQueue(pdfFiles);
    },
    [processQueue]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxSize: 50 * 1024 * 1024,
  });

  const statusIcon = (status: UploadItem["status"]) => {
    switch (status) {
      case "queued":
        return <HardDrive className="h-4 w-4 text-muted-foreground" />;
      case "uploading":
      case "processing":
        return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const statusLabel = (status: UploadItem["status"]) => {
    switch (status) {
      case "queued": return "QUEUED";
      case "uploading": return "UPLOADING";
      case "processing": return "EXTRACTING & EMBEDDING";
      case "completed": return "INDEXED";
      case "failed": return "FAILED";
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">DOCUMENT UPLOAD</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload PDFs for text extraction, chunking, and vector embedding
        </p>
      </div>

      {/* Processing Pipeline Info */}
      <div className="panel p-4">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Upload Pipeline
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[11px]">PDF Upload</code>
          <span>→</span>
          <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[11px]">PyMuPDF Extract</code>
          <span>→</span>
          <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[11px]">Chunk (1500w/200w overlap)</code>
          <span>→</span>
          <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[11px]">OpenAI Embed</code>
          <span>→</span>
          <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[11px]">ChromaDB Store</code>
          <span>→</span>
          <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[11px]">PostgreSQL Index</code>
        </div>
      </div>

      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={`panel border-2 border-dashed cursor-pointer transition-colors ${
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-border hover:border-muted-foreground/30"
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Upload
            className={`h-8 w-8 ${
              isDragActive ? "text-primary" : "text-muted-foreground"
            }`}
          />
          <div className="text-sm font-medium">
            {isDragActive
              ? "Drop PDF files here"
              : "Drag and drop PDF files, or click to browse"}
          </div>
          <div className="text-xs text-muted-foreground">
            Max file size: 50MB per document
          </div>
        </div>
      </div>

      {/* Upload Queue */}
      {uploads.length > 0 && (
        <div className="panel">
          <div className="panel-header flex items-center justify-between">
            <span>Processing Queue</span>
            <span className="text-xs font-mono">
              {uploads.filter((u) => u.status === "completed").length}/{uploads.length}
            </span>
          </div>
          <div className="divide-y divide-border">
            {uploads.map((upload, i) => (
              <div key={i} className="px-4 py-3 flex items-center gap-4">
                {statusIcon(upload.status)}
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {upload.file.name}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[11px] font-mono text-muted-foreground">
                      {formatBytes(upload.file.size)}
                    </span>
                    {upload.error && (
                      <span className="text-[11px] text-red-400 truncate">
                        {upload.error}
                      </span>
                    )}
                  </div>
                </div>
                <Badge
                  variant={
                    upload.status === "completed"
                      ? "default"
                      : upload.status === "failed"
                      ? "destructive"
                      : "secondary"
                  }
                  className="text-[10px] font-mono uppercase shrink-0"
                >
                  {statusLabel(upload.status)}
                </Badge>
                {(upload.status === "uploading" || upload.status === "processing") && (
                  <div className="w-24">
                    <Progress value={upload.progress} className="h-1.5" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
