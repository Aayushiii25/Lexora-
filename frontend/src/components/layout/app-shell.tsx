"use client";

import React, { createContext, useContext, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Upload,
  FileText,
  BarChart3,
  ShieldAlert,
  MessageSquare,
  Search,
  Settings,
  ChevronLeft,
  ChevronRight,
  Scale,
  GitCompareArrows,
  ListChecks,
  Network,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface SidebarContextType {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType>({
  collapsed: false,
  setCollapsed: () => {},
});

export function useSidebar() {
  return useContext(SidebarContext);
}

const navSections = [
  {
    label: "Core",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/upload", label: "Upload", icon: Upload },
      { href: "/documents", label: "Documents", icon: FileText },
    ],
  },
  {
    label: "Analysis",
    items: [
      { href: "/analysis", label: "Analysis Workspace", icon: BarChart3 },
      { href: "/risk", label: "Risk Assessment", icon: ShieldAlert },
      { href: "/obligations", label: "Obligation Tracker", icon: ListChecks },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { href: "/compare", label: "Document Comparison", icon: GitCompareArrows },
      { href: "/knowledge-graph", label: "Knowledge Graph", icon: Network },
      { href: "/query", label: "Research Console", icon: MessageSquare },
      { href: "/search", label: "Search Center", icon: Search },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { collapsed } = useSidebar();

  return (
    <aside
      className={`fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-border bg-sidebar transition-all duration-200 ${
        collapsed ? "w-[52px]" : "w-[220px]"
      }`}
    >
      {/* Logo */}
      <div className="flex h-12 items-center border-b border-border px-3">
        <Scale className="h-5 w-5 shrink-0 text-primary" />
        {!collapsed && (
          <span className="ml-2.5 text-sm font-bold tracking-wide text-foreground">
            LEXORA
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-1.5">
        {navSections.map((section) => (
          <div key={section.label} className="mb-1">
            {!collapsed && (
              <div className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                {section.label}
              </div>
            )}
            {collapsed && <div className="my-1 mx-3 border-t border-border/50" />}
            {section.items.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href));
              const Icon = item.icon;

              const linkContent = (
                <Link
                  href={item.href}
                  className={`flex items-center gap-2.5 mx-1.5 px-2.5 py-[7px] rounded-md text-[13px] font-medium transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground border border-transparent"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              );

              if (collapsed) {
                return (
                  <Tooltip key={item.href} delayDuration={0}>
                    <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                    <TooltipContent side="right" className="text-xs">
                      {item.label}
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return <React.Fragment key={item.href}>{linkContent}</React.Fragment>;
            })}
          </div>
        ))}
      </nav>

      {/* Status bar */}
      <div className="border-t border-border px-3 py-2">
        {!collapsed && (
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="status-dot status-dot--success" />
            <span>System Online</span>
          </div>
        )}
      </div>
    </aside>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed }}>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <main
          className={`flex-1 overflow-auto transition-all duration-200 ${
            collapsed ? "ml-[52px]" : "ml-[220px]"
          }`}
        >
          {children}
        </main>
      </div>
    </SidebarContext.Provider>
  );
}
