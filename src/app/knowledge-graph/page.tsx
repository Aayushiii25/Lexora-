"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getDocuments, extractKnowledgeGraph } from "@/lib/api";
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
import { Network, FileText, Loader2 } from "lucide-react";

interface Entity {
  id: string;
  name: string;
  type: string;
  properties?: Record<string, unknown>;
}

interface Relationship {
  source: string;
  target: string;
  type: string;
  label: string;
  properties?: Record<string, unknown>;
}

interface GraphData {
  entities: Entity[];
  relationships: Relationship[];
  summary?: string;
}

const TYPE_COLORS: Record<string, string> = {
  party: "#3b82f6",
  organization: "#8b5cf6",
  person: "#06b6d4",
  date: "#f59e0b",
  amount: "#10b981",
  legal_concept: "#ef4444",
  document: "#6366f1",
  location: "#f97316",
  obligation: "#ec4899",
  clause: "#14b8a6",
};

function KnowledgeGraphCanvas({ data }: { data: GraphData }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredNode, setHoveredNode] = useState<Entity | null>(null);
  const positionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const [dimensions, setDimensions] = useState({ width: 900, height: 500 });

  // Force-directed layout simulation
  const computeLayout = useCallback(() => {
    const positions = new Map<string, { x: number; y: number }>();
    const entities = data.entities;
    const relationships = data.relationships;
    const w = dimensions.width;
    const h = dimensions.height;

    // Initialize positions in a circle
    entities.forEach((entity, i) => {
      const angle = (2 * Math.PI * i) / entities.length;
      const r = Math.min(w, h) * 0.35;
      positions.set(entity.id, {
        x: w / 2 + r * Math.cos(angle),
        y: h / 2 + r * Math.sin(angle),
      });
    });

    // Simple force-directed iterations
    for (let iter = 0; iter < 100; iter++) {
      // Repulsion between all nodes
      for (let i = 0; i < entities.length; i++) {
        for (let j = i + 1; j < entities.length; j++) {
          const posA = positions.get(entities[i].id)!;
          const posB = positions.get(entities[j].id)!;
          const dx = posA.x - posB.x;
          const dy = posA.y - posB.y;
          const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
          const force = 5000 / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          posA.x += fx;
          posA.y += fy;
          posB.x -= fx;
          posB.y -= fy;
        }
      }

      // Attraction along edges
      for (const rel of relationships) {
        const posA = positions.get(rel.source);
        const posB = positions.get(rel.target);
        if (!posA || !posB) continue;
        const dx = posB.x - posA.x;
        const dy = posB.y - posA.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const force = (dist - 120) * 0.01;
        const fx = (dx / Math.max(dist, 1)) * force;
        const fy = (dy / Math.max(dist, 1)) * force;
        posA.x += fx;
        posA.y += fy;
        posB.x -= fx;
        posB.y -= fy;
      }

      // Center gravity
      entities.forEach((entity) => {
        const pos = positions.get(entity.id)!;
        pos.x += (w / 2 - pos.x) * 0.01;
        pos.y += (h / 2 - pos.y) * 0.01;
        // Bounds
        pos.x = Math.max(40, Math.min(w - 40, pos.x));
        pos.y = Math.max(40, Math.min(h - 40, pos.y));
      });
    }

    positionsRef.current = positions;
  }, [data, dimensions]);

  useEffect(() => {
    computeLayout();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.fillStyle = "oklch(0.14 0.005 260)";
    ctx.fillRect(0, 0, dimensions.width, dimensions.height);

    const positions = positionsRef.current;

    // Draw edges
    data.relationships.forEach((rel) => {
      const posA = positions.get(rel.source);
      const posB = positions.get(rel.target);
      if (!posA || !posB) return;

      ctx.beginPath();
      ctx.moveTo(posA.x, posA.y);
      ctx.lineTo(posB.x, posB.y);
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Edge label
      const midX = (posA.x + posB.x) / 2;
      const midY = (posA.y + posB.y) / 2;
      ctx.font = "9px monospace";
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.textAlign = "center";
      ctx.fillText(rel.label, midX, midY - 4);
    });

    // Draw nodes
    data.entities.forEach((entity) => {
      const pos = positions.get(entity.id);
      if (!pos) return;

      const color = TYPE_COLORS[entity.type] || "#6b7280";
      const isHovered = hoveredNode?.id === entity.id;
      const radius = isHovered ? 10 : 7;

      // Glow
      if (isHovered) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 16, 0, Math.PI * 2);
        ctx.fillStyle = color + "20";
        ctx.fill();
      }

      // Node
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = color + "60";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Label
      ctx.font = isHovered ? "bold 11px sans-serif" : "10px sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.textAlign = "center";
      ctx.fillText(entity.name, pos.x, pos.y + radius + 14);
    });
  }, [data, hoveredNode, computeLayout, dimensions]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    let found: Entity | null = null;
    for (const entity of data.entities) {
      const pos = positionsRef.current.get(entity.id);
      if (!pos) continue;
      const dist = Math.sqrt((pos.x - x) ** 2 + (pos.y - y) ** 2);
      if (dist < 15) {
        found = entity;
        break;
      }
    }
    setHoveredNode(found);
  };

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        style={{ width: dimensions.width, height: dimensions.height }}
        className="rounded-lg border border-border cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredNode(null)}
      />
      {hoveredNode && (
        <div className="absolute top-3 right-3 panel p-3 max-w-[200px]">
          <div className="text-xs font-medium mb-1">{hoveredNode.name}</div>
          <Badge variant="secondary" className="text-[10px] font-mono uppercase mb-1">
            {hoveredNode.type}
          </Badge>
          {hoveredNode.properties && Object.keys(hoveredNode.properties).length > 0 && (
            <div className="text-[10px] text-muted-foreground mt-1 space-y-0.5">
              {Object.entries(hoveredNode.properties).map(([k, v]) => (
                <div key={k}>
                  <span className="text-muted-foreground">{k}:</span> {String(v)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function KnowledgeGraphPage() {
  const [selectedDocId, setSelectedDocId] = useState("");
  const [graphData, setGraphData] = useState<GraphData | null>(null);

  const { data: docsData } = useQuery({
    queryKey: ["documents"],
    queryFn: getDocuments,
  });

  const extractMutation = useMutation({
    mutationFn: () => extractKnowledgeGraph(selectedDocId),
    onSuccess: (data) => {
      setGraphData(data as GraphData);
      toast.success("Knowledge graph extracted");
    },
    onError: (e: Error) => {
      toast.error(`Extraction failed: ${e.message}`);
    },
  });

  const documents = docsData?.documents || [];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          KNOWLEDGE GRAPH
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Entity-relationship extraction with force-directed graph visualization
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
            <Network className="h-3.5 w-3.5" />
          )}
          Extract Graph
        </Button>
      </div>

      {extractMutation.isPending && (
        <div className="panel p-12 text-center">
          <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto mb-3" />
          <div className="text-sm text-muted-foreground">
            Extracting entities and relationships...
          </div>
        </div>
      )}

      {graphData && (
        <div className="space-y-4">
          {/* Legend */}
          <div className="panel p-3">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mr-2">
                Entity Types:
              </span>
              {Object.entries(TYPE_COLORS).map(([type, color]) => (
                <div key={type} className="flex items-center gap-1.5">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-[11px] text-muted-foreground font-mono">{type}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Graph Canvas */}
          <KnowledgeGraphCanvas data={graphData} />

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="panel p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Entities
              </div>
              <div className="text-2xl font-bold font-mono">{graphData.entities.length}</div>
            </div>
            <div className="panel p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Relationships
              </div>
              <div className="text-2xl font-bold font-mono">{graphData.relationships.length}</div>
            </div>
            <div className="panel p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Entity Types
              </div>
              <div className="text-2xl font-bold font-mono">
                {new Set(graphData.entities.map((e) => e.type)).size}
              </div>
            </div>
          </div>

          {/* Entity Table */}
          <div className="panel">
            <div className="panel-header">Entities ({graphData.entities.length})</div>
            <ScrollArea className="h-[300px]">
              <table className="w-full">
                <thead className="sticky top-0 bg-card z-10">
                  <tr className="border-b border-border text-left">
                    <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-12">ID</th>
                    <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Name</th>
                    <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-28">Type</th>
                    <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right w-20">Connections</th>
                  </tr>
                </thead>
                <tbody>
                  {graphData.entities.map((entity) => {
                    const connections = graphData.relationships.filter(
                      (r) => r.source === entity.id || r.target === entity.id
                    ).length;
                    return (
                      <tr key={entity.id} className="border-b border-border/50 hover:bg-accent/30">
                        <td className="px-4 py-2 text-xs font-mono text-muted-foreground">{entity.id}</td>
                        <td className="px-4 py-2 text-sm font-medium">{entity.name}</td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-1.5">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: TYPE_COLORS[entity.type] || "#6b7280" }}
                            />
                            <span className="text-xs font-mono text-muted-foreground">{entity.type}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-xs font-mono text-right text-muted-foreground">{connections}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </ScrollArea>
          </div>

          {/* Relationship Table */}
          <div className="panel">
            <div className="panel-header">Relationships ({graphData.relationships.length})</div>
            <ScrollArea className="h-[250px]">
              <table className="w-full">
                <thead className="sticky top-0 bg-card z-10">
                  <tr className="border-b border-border text-left">
                    <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Source</th>
                    <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Relationship</th>
                    <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Target</th>
                    <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-24">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {graphData.relationships.map((rel, i) => {
                    const source = graphData.entities.find((e) => e.id === rel.source);
                    const target = graphData.entities.find((e) => e.id === rel.target);
                    return (
                      <tr key={i} className="border-b border-border/50 hover:bg-accent/30">
                        <td className="px-4 py-2 text-sm">{source?.name || rel.source}</td>
                        <td className="px-4 py-2 text-xs font-mono text-primary">{rel.label}</td>
                        <td className="px-4 py-2 text-sm">{target?.name || rel.target}</td>
                        <td className="px-4 py-2">
                          <code className="text-[10px] bg-muted px-1 py-0.5 rounded font-mono">{rel.type}</code>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </ScrollArea>
          </div>
        </div>
      )}
    </div>
  );
}
