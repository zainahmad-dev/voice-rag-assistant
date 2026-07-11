import { FileText, Menu, Mic } from "lucide-react";

import { ThemeToggleButton } from "./ThemeToggleButton";

interface DashboardHeaderProps {
  documentCount: number;
  isSidebarVisible: boolean;
  onToggleSidebar: () => void;
}

export function DashboardHeader({
  documentCount,
  isSidebarVisible,
  onToggleSidebar,
}: DashboardHeaderProps) {
  return (
    <header className="flex items-center justify-between border-b border-border bg-surface px-4 py-4 md:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label={isSidebarVisible ? "Collapse document sidebar" : "Expand document sidebar"}
          aria-expanded={isSidebarVisible}
          aria-controls="document-sidebar"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-surface-raised text-foreground-muted transition-all duration-200 hover:border-accent/40 hover:text-foreground active:scale-95"
        >
          <Menu size={18} />
        </button>

        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-background">
          <Mic size={18} />
        </span>
        <h1 className="font-display text-lg font-semibold text-foreground">
          Voice RAG Assistant
        </h1>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <span className="hidden items-center gap-2 rounded-full border border-border bg-surface-raised px-3 py-1 text-sm text-foreground-muted sm:flex">
          <FileText size={14} />
          {documentCount} {documentCount === 1 ? "document" : "documents"} indexed
        </span>
        <ThemeToggleButton />
      </div>
    </header>
  );
}
