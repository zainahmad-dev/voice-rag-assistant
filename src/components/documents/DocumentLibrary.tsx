"use client";

import { useState } from "react";

import { DocumentCard, DocumentCardCollapsed } from "./DocumentCard";
import type { Document } from "@/types/document";

interface DocumentLibraryProps {
  documents: Document[];
  isLoading: boolean;
  error: string | null;
  deleteDocument: (id: string) => Promise<void>;
  /** Icon-only rendering for the collapsed sidebar rail. */
  collapsed?: boolean;
}

export function DocumentLibrary({
  documents,
  isLoading,
  error,
  deleteDocument,
  collapsed = false,
}: DocumentLibraryProps) {
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [deleteErrors, setDeleteErrors] = useState<Record<string, string>>({});

  async function handleDelete(document: Document) {
    setDeletingIds((prev) => new Set(prev).add(document.id));
    setDeleteErrors((prev) => {
      if (!(document.id in prev)) return prev;
      const next = { ...prev };
      delete next[document.id];
      return next;
    });

    try {
      await deleteDocument(document.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete this document.";
      setDeleteErrors((prev) => ({ ...prev, [document.id]: message }));
    } finally {
      setDeletingIds((prev) => {
        if (!prev.has(document.id)) return prev;
        const next = new Set(prev);
        next.delete(document.id);
        return next;
      });
    }
  }

  if (collapsed) {
    return (
      <ul className="space-y-2">
        {documents.map((document) => (
          <DocumentCardCollapsed key={document.id} document={document} />
        ))}
      </ul>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">
        Documents
      </h2>

      {error && (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">{error}</p>
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
          <DocumentCard
            key={document.id}
            document={document}
            isDeleting={deletingIds.has(document.id)}
            deleteError={deleteErrors[document.id]}
            onDelete={() => handleDelete(document)}
          />
        ))}
      </ul>
    </div>
  );
}
