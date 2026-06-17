"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { searchDocuments, getDocuments } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, FileText, Loader2, Database } from "lucide-react";
import type { SearchResult } from "@/lib/types";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [searchType, setSearchType] = useState("semantic");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [lastQuery, setLastQuery] = useState("");

  const { data: docsData } = useQuery({
    queryKey: ["documents"],
    queryFn: getDocuments,
  });

  const searchMutation = useMutation({
    mutationFn: () => searchDocuments(query, searchType),
    onSuccess: (data) => {
      setResults(data.results);
      setTotalResults(data.total);
      setLastQuery(data.query);
    },
    onError: (e: Error) => {
      toast.error(`Search failed: ${e.message}`);
    },
  });

  const handleSearch = () => {
    if (!query.trim()) return;
    searchMutation.mutate();
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">SEARCH CENTER</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Semantic vector search (ChromaDB cosine similarity) and PostgreSQL full-text keyword search
        </p>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search across all documents..."
            className="pl-9"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
            }}
          />
        </div>
        <Select value={searchType} onValueChange={(val) => setSearchType(val || "")}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semantic">
              <span className="flex items-center gap-2">
                <Database className="h-3.5 w-3.5" />
                Semantic Search
              </span>
            </SelectItem>
            <SelectItem value="keyword">
              <span className="flex items-center gap-2">
                <Search className="h-3.5 w-3.5" />
                Keyword Search
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
        <Button
          onClick={handleSearch}
          disabled={!query.trim() || searchMutation.isPending}
          size="sm"
          className="gap-2"
        >
          {searchMutation.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Search className="h-3.5 w-3.5" />
          )}
          Search
        </Button>
      </div>

      {/* Search Method Info */}
      <div className="panel p-3">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="font-semibold">Method:</span>
            {searchType === "semantic" ? (
              <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[10px]">
                Query → OpenAI Embed → ChromaDB Cosine Similarity → Top-K
              </code>
            ) : (
              <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[10px]">
                Query → PostgreSQL to_tsvector → ts_rank → Ranked Results
              </code>
            )}
          </div>
          {lastQuery && (
            <span className="ml-auto font-mono">
              {totalResults} results for &quot;{lastQuery}&quot;
            </span>
          )}
        </div>
      </div>

      {/* Results */}
      {searchMutation.isPending ? (
        <div className="panel p-12 text-center">
          <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto mb-3" />
          <div className="text-sm text-muted-foreground">
            {searchType === "semantic" ? "Generating query embedding and searching vectors..." : "Running full-text search..."}
          </div>
        </div>
      ) : results.length > 0 ? (
        <div className="panel">
          <div className="panel-header flex items-center justify-between">
            <span>Results ({totalResults})</span>
            <Badge variant="secondary" className="text-[10px] font-mono uppercase">
              {searchType}
            </Badge>
          </div>
          <ScrollArea className="h-[calc(100vh-340px)]">
            <div className="divide-y divide-border">
              {results.map((result, i) => (
                <div key={i} className="px-4 py-3 hover:bg-accent/30 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm font-medium">{result.document_name}</span>
                      {result.page_number && (
                        <code className="text-[10px] bg-muted px-1 py-0.5 rounded font-mono">
                          Page {result.page_number}
                        </code>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-muted-foreground">
                        relevance
                      </span>
                      <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${result.relevance_score * 100}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-primary">
                        {(result.relevance_score * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                    {result.chunk_content}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      ) : lastQuery ? (
        <div className="panel p-12 text-center">
          <Search className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
          <div className="text-sm text-muted-foreground">
            No results found for &quot;{lastQuery}&quot;
          </div>
        </div>
      ) : null}
    </div>
  );
}
