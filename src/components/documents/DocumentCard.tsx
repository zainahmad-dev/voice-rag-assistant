import { CircleCheck, CircleX, FileText, Loader2, Trash2, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/cn";
import { formatRelativeTime } from "@/lib/formatRelativeTime";
import type { Document, DocumentStatus } from "@/types/document";

interface StatusMeta {
  icon: LucideIcon;
  label: string;
  badgeClass: string;
  spin: boolean;
}

function getStatusMeta(status: DocumentStatus, chunkCount: number): StatusMeta {
  switch (status) {
    case "completed":
      return {
        icon: CircleCheck,
        label: `Ready · ${chunkCount} chunks`,
        badgeClass: "bg-accent-subtle text-accent",
        spin: false,
      };
    case "pending":
    case "processing":
      return {
        icon: Loader2,
        label: "Indexing…",
        badgeClass: "bg-secondary-subtle text-secondary",
        spin: true,
      };
    case "failed":
      return {
        icon: CircleX,
        label: "Failed",
        badgeClass: "bg-danger/10 text-danger",
        spin: false,
      };
  }
}

interface DocumentCardProps {
  document: Document;
  isDeleting: boolean;
  deleteError?: string;
  onDelete: () => void;
}

/**
 * Filenames are one long unbroken "word" to CSS, so a plain wrap breaks
 * wherever it must — including mid-extension. Splitting on _ . - and
 * inserting <wbr /> gives the browser better break points to prefer first.
 */
function BreakableFileName({ name }: { name: string }) {
  const tokens = name.split(/([_.-])/);
  const segments: string[] = [];
  for (let i = 0; i < tokens.length; i += 2) {
    segments.push(tokens[i] + (tokens[i + 1] ?? ""));
  }

  return (
    <>
      {segments.map((segment, index) => (
        <span key={index}>
          {segment}
          {index < segments.length - 1 && <wbr />}
        </span>
      ))}
    </>
  );
}

export function DocumentCard({ document, isDeleting, deleteError, onDelete }: DocumentCardProps) {
  const meta = getStatusMeta(document.status, document.chunk_count);
  const StatusIcon = meta.icon;

  return (
    <li className="group rounded-lg border border-border bg-surface-raised p-3 transition-all duration-200 hover:border-accent/40 hover:shadow-sm">
      <div className="flex items-start gap-2">
        <FileText size={16} className="mt-0.5 shrink-0 text-foreground-muted" />
        <p
          className="line-clamp-2 min-w-0 flex-1 break-words text-sm leading-snug text-foreground"
          title={document.file_name}
        >
          <BreakableFileName name={document.file_name} />
        </p>
      </div>

      <div className="mt-2">
        <span
          className={cn(
            "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium",
            meta.badgeClass
          )}
        >
          <StatusIcon size={12} className={meta.spin ? "animate-spin" : undefined} />
          {meta.label}
        </span>
      </div>

      <div className="mt-2 flex items-end justify-between gap-2">
        <span className="text-xs text-foreground-muted">
          Uploaded {formatRelativeTime(document.created_at)}
        </span>

        <button
          type="button"
          aria-label={`Delete ${document.file_name}`}
          disabled={isDeleting}
          onClick={onDelete}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-foreground-muted opacity-70 transition-all duration-200 hover:scale-110 hover:bg-danger/10 hover:text-danger hover:opacity-100 disabled:pointer-events-none disabled:opacity-50"
        >
          {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
        </button>
      </div>

      {document.status === "failed" && document.error_message && (
        <p className="mt-1.5 line-clamp-2 text-xs text-danger/80" title={document.error_message}>
          {document.error_message}
        </p>
      )}

      {deleteError && (
        <p className="mt-1.5 line-clamp-2 text-xs text-danger/80" title={deleteError}>
          {deleteError}
        </p>
      )}
    </li>
  );
}

export function DocumentCardCollapsed({ document }: { document: Document }) {
  const meta = getStatusMeta(document.status, document.chunk_count);
  const StatusIcon = meta.icon;

  return (
    <li className="flex justify-center">
      <div
        title={`${document.file_name} — ${meta.label}`}
        className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-surface-raised text-foreground-muted transition-all duration-200 hover:border-accent/40 hover:text-accent"
      >
        <FileText size={16} />
        <span
          className={cn(
            "absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-surface",
            meta.badgeClass
          )}
        >
          <StatusIcon size={9} className={meta.spin ? "animate-spin" : undefined} />
        </span>
      </div>
    </li>
  );
}
