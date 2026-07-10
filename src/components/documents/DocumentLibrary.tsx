"use client";

import { CircleCheck, CircleX, FileText, Loader2, Trash2 } from "lucide-react";

import type { Document } from "@/types/document";

interface DocumentLibraryProps {
  documents: Document[];
  isLoading: boolean;
  error: string | null;
}

function StatusBadge({ status, chunk_count }: Pick<Document, "status" | "chunk_count">) {
  switch (status) {
    case "completed":
      return (
        <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-accent-subtle px-2 py-0.5 text-xs font-medium text-accent">
          <CircleCheck size={12} />
          Ready · {chunk_count} chunks
        </span>
      );
    case "pending":
    case "processing":
      return (
        <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-secondary-subtle px-2 py-0.5 text-xs font-medium text-secondary">
          <Loader2 size={12} className="animate-spin" />
          Indexing…
        </span>
      );
    case "failed":
      return (
        <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-danger/10 px-2 py-0.5 text-xs font-medium text-danger">
          <CircleX size={12} />
          Failed
        </span>
      );
  }
}

function handleDelete(document: Document) {
  console.log("Delete document:", document.id, document.file_name);
}

export function DocumentLibrary({ documents, isLoading, error }: DocumentLibraryProps) {
  return (
    <div className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">
        Documents
      </h2>

      {error && (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">
          {error}
        </p>
      )}

      {isLoading && documents.length === 0 && !error && (
        <p className="text-sm text-foreground-muted">Loading documents…</p>
      )}

      {!isLoading && documents.length === 0 && !error && (
        <p className="text-sm text-foreground-muted">
          No documents yet. Upload one to get started.
        </p>
      )}

      <ul className="space-y-2">
        {documents.map((document) => (
          <li
            key={document.id}
            className="rounded-lg border border-border bg-surface-raised p-3"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <FileText size={16} className="shrink-0 text-foreground-muted" />
                <span className="truncate text-sm text-foreground">
                  {document.file_name}
                </span>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <StatusBadge status={document.status} chunk_count={document.chunk_count} />
                <button
                  type="button"
                  aria-label={`Delete ${document.file_name}`}
                  onClick={() => handleDelete(document)}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-foreground-muted transition-colors duration-150 hover:bg-danger/10 hover:text-danger"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {document.status === "failed" && document.error_message && (
              <p
                className="mt-1.5 truncate text-xs text-danger/80"
                title={document.error_message}
              >
                {document.error_message}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
