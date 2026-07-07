"use client";

import { CircleCheck, CircleX, Loader2, UploadCloud } from "lucide-react";
import { useRef, useState } from "react";

import type { Document } from "@/types/document";

const ACCEPTED_EXTENSIONS = [".pdf", ".docx", ".txt"];
const ACCEPT_ATTR = ACCEPTED_EXTENSIONS.join(",");

interface UploadItem {
  id: string;
  fileName: string;
  status: "uploading" | "success" | "error";
  document?: Document;
  errorMessage?: string;
}

function isAcceptedFile(file: File) {
  const name = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((extension) => name.endsWith(extension));
}

function createUploadId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `upload-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
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

export function UploadDropzone() {
  const [isDragging, setIsDragging] = useState(false);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFiles(files: FileList | null) {
    if (!files) return;

    for (const file of Array.from(files)) {
      if (!isAcceptedFile(file)) {
        console.warn("Rejected file (unsupported type):", file.name);
        continue;
      }

      const id = createUploadId();
      setUploads((prev) => [
        ...prev,
        { id, fileName: file.name, status: "uploading" },
      ]);

      uploadFile(file)
        .then((document) => {
          setUploads((prev) =>
            prev.map((item) =>
              item.id === id ? { ...item, status: "success", document } : item
            )
          );
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

                {item.status === "success" && (
                  <span className="flex shrink-0 items-center gap-1 text-accent">
                    <CircleCheck size={12} />
                    {item.document?.status === "processing"
                      ? "Processing"
                      : "Uploaded"}
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
