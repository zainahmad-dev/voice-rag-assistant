"use client";

import { UploadCloud } from "lucide-react";
import { useRef, useState } from "react";

const ACCEPTED_EXTENSIONS = [".pdf", ".docx", ".txt"];
const ACCEPT_ATTR = ACCEPTED_EXTENSIONS.join(",");

function isAcceptedFile(file: File) {
  const name = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((extension) => name.endsWith(extension));
}

function handleFiles(files: FileList | null) {
  if (!files) return;

  for (const file of Array.from(files)) {
    if (isAcceptedFile(file)) {
      console.log("Selected file:", file);
    } else {
      console.warn("Rejected file (unsupported type):", file.name);
    }
  }
}

export function UploadDropzone() {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
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
  );
}
