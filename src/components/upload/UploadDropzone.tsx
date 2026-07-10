"use client";

import { CircleCheck, CircleX, Loader2, UploadCloud } from "lucide-react";
import { useRef, useState } from "react";

import { createId } from "@/lib/createId";
import type { Document } from "@/types/document";

const ACCEPTED_EXTENSIONS = [".pdf", ".docx", ".txt"];
const ACCEPT_ATTR = ACCEPTED_EXTENSIONS.join(",");
// Mirrors MAX_FILE_SIZE_BYTES in src/app/api/upload/route.ts, checked client-side
// so oversized files are rejected instantly instead of after a full upload round-trip.
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;

interface UploadItem {
  id: string;
  fileName: string;
  status: "uploading" | "indexing" | "ready" | "error";
  document?: Document;
  errorMessage?: string;
}

function isAcceptedFile(file: File) {
  const name = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((extension) => name.endsWith(extension));
}

async function uploadFile(file: File): Promise<Document> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      body && typeof body === "object" && "error" in body
        ? String((body as { error: unknown }).error)
        : `Upload failed with status ${response.status}.`;
    throw new Error(message);
  }

  return body as Document;
}

/**
 * Kicks off extraction/chunking/embedding for a freshly uploaded document.
 * The request stays open for the whole ingest pipeline (see /api/ingest), so
 * its resolution reflects the real outcome — no separate polling needed to
 * know when this specific upload has finished indexing.
 */
async function ingestDocument(documentId: string): Promise<Document> {
  const response = await fetch("/api/ingest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ documentId }),
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      body && typeof body === "object" && "error" in body
        ? String((body as { error: unknown }).error)
        : `Indexing failed with status ${response.status}.`;
    throw new Error(message);
  }

  return body as Document;
}

export function UploadDropzone() {
  const [isDragging, setIsDragging] = useState(false);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFiles(files: FileList | null) {
    if (!files) return;

    for (const file of Array.from(files)) {
      const id = createId();

      if (!isAcceptedFile(file)) {
        setUploads((prev) => [
          ...prev,
          {
            id,
            fileName: file.name,
            status: "error",
            errorMessage: "Unsupported file type. Only PDF, DOCX, and TXT files are accepted.",
          },
        ]);
        continue;
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        setUploads((prev) => [
          ...prev,
          {
            id,
            fileName: file.name,
            status: "error",
            errorMessage: "File is too large. The maximum file size is 15MB.",
          },
        ]);
        continue;
      }

      setUploads((prev) => [
        ...prev,
        { id, fileName: file.name, status: "uploading" },
      ]);

      uploadFile(file)
        .then((document) => {
          setUploads((prev) =>
            prev.map((item) =>
              item.id === id ? { ...item, status: "indexing", document } : item
            )
          );

          return ingestDocument(document.id)
            .then((updatedDocument) => {
              setUploads((prev) =>
                prev.map((item) =>
                  item.id === id
                    ? { ...item, status: "ready", document: updatedDocument }
                    : item
                )
              );
            })
            .catch((error: unknown) => {
              const message =
                error instanceof Error ? error.message : "Failed to index this document.";
              setUploads((prev) =>
                prev.map((item) =>
                  item.id === id
                    ? { ...item, status: "error", errorMessage: message }
                    : item
                )
              );
            });
        })
        .catch((error: unknown) => {
          const message =
            error instanceof Error ? error.message : "Upload failed.";
          setUploads((prev) =>
            prev.map((item) =>
              item.id === id
                ? { ...item, status: "error", errorMessage: message }
                : item
            )
          );
        });
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setIsDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          handleFiles(event.dataTransfer.files);
        }}
        className={`flex flex-col items-center gap-3 rounded-lg border border-dashed px-4 py-8 text-center transition-colors duration-150 ${
          isDragging
            ? "border-accent bg-accent-subtle"
            : "border-border bg-surface"
        }`}
      >
        <UploadCloud size={28} className="text-foreground-muted" />

        <p className="text-sm text-foreground">
          Drag and drop a file here, or
        </p>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-background transition-colors duration-150 hover:bg-accent-hover"
        >
          Browse files
        </button>

        <p className="text-xs text-foreground-muted">PDF, DOCX, or TXT</p>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_ATTR}
          multiple
          className="hidden"
          onChange={(event) => {
            handleFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </div>

      {uploads.length > 0 && (
        <ul className="space-y-2">
          {uploads.map((item) => (
            <li
              key={item.id}
              className="rounded-lg border border-border bg-surface-raised px-3 py-2 text-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-foreground">
                  {item.fileName}
                </span>

                {item.status === "uploading" && (
                  <span className="flex shrink-0 items-center gap-1 text-foreground-muted">
                    <Loader2 size={12} className="animate-spin" />
                    Uploading…
                  </span>
                )}

                {item.status === "indexing" && (
                  <span className="flex shrink-0 items-center gap-1 text-foreground-muted">
                    <Loader2 size={12} className="animate-spin" />
                    Indexing…
                  </span>
                )}

                {item.status === "ready" && (
                  <span className="flex shrink-0 items-center gap-1 text-accent">
                    <CircleCheck size={12} />
                    Ready
                  </span>
                )}

                {item.status === "error" && (
                  <span className="flex shrink-0 items-center gap-1 text-danger">
                    <CircleX size={12} />
                    Failed
                  </span>
                )}
              </div>

              {item.status === "error" && item.errorMessage && (
                <p
                  className="mt-1 truncate text-danger/80"
                  title={item.errorMessage}
                >
                  {item.errorMessage}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
