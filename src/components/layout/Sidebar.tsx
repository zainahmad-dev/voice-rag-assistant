"use client";

import { FileStack, X } from "lucide-react";

import { DocumentLibrary } from "@/components/documents/DocumentLibrary";
import { UploadDropzone } from "@/components/upload/UploadDropzone";
import { cn } from "@/lib/cn";
import type { Document } from "@/types/document";

interface SidebarProps {
  documents: Document[];
  isLoading: boolean;
  error: string | null;
  deleteDocument: (id: string) => Promise<void>;
  isCollapsed: boolean;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({
  documents,
  isLoading,
  error,
  deleteDocument,
  isCollapsed,
  isMobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const readyCount = documents.filter((document) => document.status === "completed").length;

  return (
    <>
      {isMobileOpen && (
        <div
          aria-hidden="true"
          onClick={onCloseMobile}
          className="fixed inset-0 z-30 bg-foreground/40 backdrop-blur-[2px] transition-opacity duration-300 md:hidden"
        />
      )}

      <aside
        id="document-sidebar"
        aria-label="Document sidebar"
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[85vw] max-w-[320px] shrink-0 flex-col border-r border-border bg-surface shadow-xl transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
          "md:static md:z-auto md:max-w-none md:shadow-none md:transition-[width] md:duration-300 md:ease-[cubic-bezier(0.16,1,0.3,1)]",
          isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          isCollapsed ? "md:w-[72px]" : "md:w-[280px] lg:w-[340px]"
        )}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border p-4 md:hidden">
          <span className="text-sm font-semibold text-foreground">Documents</span>
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close document sidebar"
            className="flex h-8 w-8 items-center justify-center rounded-full text-foreground-muted transition-all duration-200 hover:bg-danger/10 hover:text-danger active:scale-95"
          >
            <X size={18} />
          </button>
        </div>

        <div className={cn("shrink-0 border-b border-border", isCollapsed ? "p-3" : "p-4")}>
          <UploadDropzone collapsed={isCollapsed} />
        </div>

        <div className={cn("min-h-0 flex-1 overflow-y-auto", isCollapsed ? "p-3" : "p-4")}>
          <DocumentLibrary
            documents={documents}
            isLoading={isLoading}
            error={error}
            deleteDocument={deleteDocument}
            collapsed={isCollapsed}
          />
        </div>

        <div
          className={cn(
            "shrink-0 border-t border-border text-xs text-foreground-muted",
            isCollapsed ? "flex justify-center p-3" : "p-4"
          )}
          title={`${documents.length} total · ${readyCount} ready`}
        >
          {isCollapsed ? (
            <FileStack size={16} />
          ) : (
            <span className="flex items-center gap-1.5">
              <FileStack size={14} />
              {documents.length} total · {readyCount} ready
            </span>
          )}
        </div>
      </aside>
    </>
  );
}
