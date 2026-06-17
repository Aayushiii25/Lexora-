"use client";

import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getDocuments, sendChatMessage, getChatHistory } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MessageSquare, FileText, Send, Loader2, BookOpen } from "lucide-react";
import type { ChatMessage, Citation } from "@/lib/types";

function CitationBlock({ citation }: { citation: Citation }) {
  return (
    <div className="bg-muted/50 border border-border rounded p-2.5 text-xs">
      <div className="flex items-center gap-2 mb-1.5">
        <BookOpen className="h-3 w-3 text-primary" />
        <span className="font-mono text-[10px] text-muted-foreground">
          Chunk {citation.chunk_index}
          {citation.page_number ? ` · Page ${citation.page_number}` : ""}
        </span>
        <span className="text-[10px] font-mono text-primary/60 ml-auto">
          relevance: {(citation.relevance_score * 100).toFixed(1)}%
        </span>
      </div>
      <div className="text-xs text-muted-foreground leading-relaxed">
        {citation.content}
      </div>
    </div>
  );
}

function QueryPageContent() {
  const searchParams = useSearchParams();
  const [selectedDocId, setSelectedDocId] = useState(searchParams.get("doc") || "");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: docsData } = useQuery({
    queryKey: ["documents"],
    queryFn: getDocuments,
  });

  const { data: historyData } = useQuery({
    queryKey: ["chat-history", selectedDocId],
    queryFn: () => getChatHistory(selectedDocId),
    enabled: !!selectedDocId,
  });

  useEffect(() => {
    if (historyData?.messages) {
      setMessages(historyData.messages as ChatMessage[]);
    }
  }, [historyData]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMutation = useMutation({
    mutationFn: () => sendChatMessage(selectedDocId, input),
    onSuccess: (response) => {
      setMessages((prev) => [...prev, response as ChatMessage]);
      setInput("");
    },
    onError: (e: Error) => {
      toast.error(`Query failed: ${e.message}`);
    },
  });

  const handleSend = () => {
    if (!input.trim() || !selectedDocId) return;
    // Add user message immediately
    const userMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: input,
      citations: [],
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    sendMutation.mutate();
  };

  const documents = docsData?.documents || [];

  return (
    <div className="p-6 h-[calc(100vh)] flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          RESEARCH CONSOLE
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          RAG-powered document query with semantic retrieval and citation tracking
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Select value={selectedDocId} onValueChange={(v) => { setSelectedDocId(v || ""); setMessages([]); }}>
          <SelectTrigger className="w-[400px]">
            <SelectValue placeholder="Select document to query" />
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
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[10px]">ChromaDB → Top-5 → GPT-4o</code>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0 panel">
        <ScrollArea className="h-full p-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <MessageSquare className="h-8 w-8 text-muted-foreground/20 mb-3" />
              <div className="text-sm text-muted-foreground mb-4">
                {selectedDocId
                  ? "Query the document using natural language. Responses include source citations."
                  : "Select a document to begin querying."}
              </div>
              {selectedDocId && (
                <div className="space-y-1.5 text-xs text-muted-foreground/60">
                  <div>Example queries:</div>
                  <div className="font-mono">&quot;What are the payment obligations?&quot;</div>
                  <div className="font-mono">&quot;Summarize the termination conditions&quot;</div>
                  <div className="font-mono">&quot;What penalties exist for breach?&quot;</div>
                  <div className="font-mono">&quot;List all deadlines in this agreement&quot;</div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] space-y-2 ${
                    msg.role === "user" ? "items-end" : "items-start"
                  }`}>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono uppercase text-muted-foreground">
                        {msg.role === "user" ? "QUERY" : "RESPONSE"}
                      </span>
                    </div>
                    <div className={`rounded-lg px-4 py-3 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-primary/10 border border-primary/20"
                        : "bg-muted/30 border border-border"
                    }`}>
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    </div>
                    {/* Citations */}
                    {msg.citations && msg.citations.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="text-[10px] font-mono uppercase text-muted-foreground">
                          Sources ({msg.citations.length})
                        </div>
                        {msg.citations.map((cit, i) => (
                          <CitationBlock key={i} citation={cit} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {sendMutation.isPending && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-xs">Retrieving context and generating response...</span>
                </div>
              )}
              <div ref={scrollRef} />
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Input */}
      <div className="flex gap-3">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={selectedDocId ? "Enter your query..." : "Select a document first"}
          disabled={!selectedDocId || sendMutation.isPending}
          className="resize-none h-[60px]"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <Button
          onClick={handleSend}
          disabled={!input.trim() || !selectedDocId || sendMutation.isPending}
          className="h-[60px] px-6"
        >
          {sendMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

import React from "react";
export default function QueryPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading console...</div>}>
      <QueryPageContent />
    </React.Suspense>
  );
}
