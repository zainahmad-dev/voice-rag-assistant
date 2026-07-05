"use client";

import { CircleCheck, CircleX, FileText, Loader2, Trash2 } from "lucide-react";

type MockDocumentStatus =
  | { kind: "ready"; chunkCount: number }
  | { kind: "indexing"; step: number; totalSteps: number }
  | { kind: "failed" };

interface MockDocument {
  id: string;
  fileName: string;
  status: MockDocumentStatus;
}

const MOCK_DOCUMENTS: MockDocument[] = [
  {
    id: "1",
    fileName: "employee-handbook.pdf",
    status: { kind: "ready", chunkCount: 42 },
  },
  {
    id: "2",
    fileName: "q3-financial-report.docx",
    status: { kind: "indexing", step: 2, totalSteps: 4 },
  },
  {
    id: "3",
    fileName: "meeting-notes.txt",
    status: { kind: "failed" },
  },
];

function StatusBadge({ status }: { status: MockDocumentStatus }) {
  switch (status.kind) {
    case "ready":
      return (
        <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-accent-subtle px-2 py-0.5 text-xs font-medium text-accent">
          <CircleCheck size={12} />
          Ready · {status.chunkCount} chunks
        </span>
      );
    case "indexing":
      return (
        <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-secondary-subtle px-2 py-0.5 text-xs font-medium text-secondary">
          <Loader2 size={12} className="animate-spin" />
          Indexing · step {status.step} of {status.totalSteps}
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

function handleDelete(document: MockDocument) {
  console.log("Delete document:", document.id, document.fileName);
}

export function DocumentLibrary() {
  return (
    <div className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">
        Documents
      </h2>

      <ul className="space-y-2">
        {MOCK_DOCUMENTS.map((document) => (
          <li
            key={document.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-raised p-3"
          >
            <div className="flex min-w-0 items-center gap-2">
              <FileText size={16} className="shrink-0 text-foreground-muted" />
              <span className="truncate text-sm text-foreground">
                {document.fileName}
              </span>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <StatusBadge status={document.status} />
              <button
                type="button"
                aria-label={`Delete ${document.fileName}`}
                onClick={() => handleDelete(document)}
                className="flex h-7 w-7 items-center justify-center rounded-full text-foreground-muted transition-colors duration-150 hover:bg-danger/10 hover:text-danger"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
