import { FileText, Mic } from "lucide-react";

import { ThemeToggleButton } from "./ThemeToggleButton";

interface DashboardHeaderProps {
  documentCount: number;
}

export function DashboardHeader({ documentCount }: DashboardHeaderProps) {
  return (
    <header className="flex items-center justify-between border-b border-border bg-surface px-6 py-4">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-background">
          <Mic size={18} />
        </span>
        <h1 className="font-display text-lg font-semibold text-foreground">
          Voice RAG Assistant
        </h1>
      </div>

      <div className="flex items-center gap-4">
        <span className="flex items-center gap-2 rounded-full border border-border bg-surface-raised px-3 py-1 text-sm text-foreground-muted">
          <FileText size={14} />
          {documentCount} {documentCount === 1 ? "document" : "documents"} indexed
        </span>
        <ThemeToggleButton />
      </div>
    </header>
  );
}
