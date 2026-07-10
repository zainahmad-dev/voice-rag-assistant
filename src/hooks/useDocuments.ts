"use client";

import { useCallback, useEffect, useState } from "react";

import type { Document } from "@/types/document";

const POLL_INTERVAL_MS = 3000;

function isSettled(document: Document): boolean {
  return document.status === "completed" || document.status === "failed";
}

interface UseDocumentsResult {
  documents: Document[];
  isLoading: boolean;
  error: string | null;
  deleteDocument: (id: string) => Promise<void>;
}

export function useDocuments(): UseDocumentsResult {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pollCount, setPollCount] = useState(0);

  // Fetches the document list and, if anything is still pending/processing,
  // schedules another poll a few seconds later by bumping pollCount so this
  // effect re-runs. setState calls live inside the promise callbacks below,
  // not the effect body itself, so they only fire once the fetch settles.
  useEffect(() => {
    let ignore = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    fetch("/api/documents")
      .then((response) =>
        response.json().then((body: unknown) => {
          if (!response.ok) {
            const message =
              body && typeof body === "object" && "error" in body
                ? String((body as { error: unknown }).error)
                : `Failed to load documents (status ${response.status}).`;
            throw new Error(message);
          }
          return body as Document[];
        })
      )
      .then((data) => {
        if (ignore) return;

        setDocuments(data);
        setError(null);

        if (!data.every(isSettled)) {
          timeoutId = setTimeout(() => {
            setPollCount((count) => count + 1);
          }, POLL_INTERVAL_MS);
        }
      })
      .catch((err: unknown) => {
        if (ignore) return;
        setError(err instanceof Error ? err.message : "Failed to load documents.");
      })
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });

    return () => {
      ignore = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [pollCount]);

  // Removes the document from view immediately (optimistic update) rather
  // than waiting on the DELETE request or the next poll tick. If the request
  // fails, the document is spliced back into its original position and the
  // error is rethrown so the caller (the delete button) can show it.
  const deleteDocument = useCallback(
    async (id: string) => {
      const index = documents.findIndex((document) => document.id === id);
      const removed = documents[index];
      if (!removed) return;

      setDocuments((docs) => docs.filter((document) => document.id !== id));

      try {
        const response = await fetch(`/api/documents/${id}`, { method: "DELETE" });

        if (!response.ok) {
          const body = await response.json().catch(() => null);
          const message =
            body && typeof body === "object" && "error" in body
              ? String((body as { error: unknown }).error)
              : `Failed to delete document (status ${response.status}).`;
          throw new Error(message);
        }
      } catch (err) {
        setDocuments((docs) => {
          const next = [...docs];
          next.splice(Math.min(index, next.length), 0, removed);
          return next;
        });
        throw err instanceof Error ? err : new Error("Failed to delete document.");
      }
    },
    [documents]
  );

  return { documents, isLoading, error, deleteDocument };
}
