import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseServiceClient } from "@/lib/supabase/server";
import type { Document, SupportedFileType } from "@/types/document";

// Node.js explicitly, to match /api/ingest and because this route uses the
// Supabase service-role client the same way.
export const runtime = "nodejs";

const STORAGE_BUCKET = "documents";
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;

const FILE_TYPE_BY_EXTENSION: Record<string, SupportedFileType> = {
  ".pdf": "pdf",
  ".docx": "docx",
  ".txt": "txt",
};

function resolveFileType(fileName: string): SupportedFileType | null {
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex === -1) return null;
  const extension = fileName.slice(dotIndex).toLowerCase();
  return FILE_TYPE_BY_EXTENSION[extension] ?? null;
}

/**
 * Issues a signed Supabase Storage upload URL instead of accepting the file
 * body directly. Vercel Functions hard-cap request bodies at 4.5MB, well
 * under this app's 15MB file limit, so the browser must upload bytes
 * straight to Supabase Storage — this route only creates the document
 * record and hands back a one-time upload token for that direct upload.
 */
export async function POST(request: Request) {
  const requestStart = Date.now();
  console.log("[UPLOAD] START");

  const body = await request.json().catch(() => null);
  const fileName = body && typeof body === "object" ? (body as { fileName?: unknown }).fileName : null;
  const fileSize = body && typeof body === "object" ? (body as { fileSize?: unknown }).fileSize : null;

  if (typeof fileName !== "string" || !fileName || typeof fileSize !== "number") {
    console.error("[UPLOAD] FAILED: missing fileName/fileSize in request body");
    return NextResponse.json(
      { error: "fileName and fileSize are required." },
      { status: 400 }
    );
  }

  console.log(`[UPLOAD] FILE METADATA RECEIVED: name=${fileName} size=${fileSize}`);

  const fileType = resolveFileType(fileName);
  if (!fileType) {
    console.error(`[UPLOAD] FAILED: unsupported file type for ${fileName}`);
    return NextResponse.json(
      { error: "Unsupported file type. Only PDF, DOCX, and TXT files are allowed." },
      { status: 400 }
    );
  }

  if (fileSize > MAX_FILE_SIZE_BYTES) {
    console.error(`[UPLOAD] FAILED: file too large (${fileSize} bytes)`);
    return NextResponse.json(
      { error: "File is too large. The maximum file size is 15MB." },
      { status: 413 }
    );
  }

  let supabase: SupabaseClient;
  try {
    supabase = getSupabaseServiceClient();
  } catch (error) {
    console.error("[UPLOAD] FAILED: Supabase client init:", error);
    return NextResponse.json(
      {
        error: `Server configuration error: ${error instanceof Error ? error.message : "missing Supabase credentials"}`,
      },
      { status: 500 }
    );
  }

  const documentId = randomUUID();
  const storagePath = `${documentId}/${fileName}`;

  const { data: signedUpload, error: signError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUploadUrl(storagePath);

  if (signError || !signedUpload) {
    console.error(`[UPLOAD] FAILED: signed URL creation (documentId=${documentId}):`, signError);
    return NextResponse.json(
      { error: `Failed to prepare upload: ${signError?.message ?? "unknown error"}` },
      { status: 500 }
    );
  }

  console.log(`[UPLOAD] SIGNED URL ISSUED: documentId=${documentId} path=${storagePath}`);

  const { data: document, error: insertError } = await supabase
    .from("documents")
    .insert({
      id: documentId,
      file_name: fileName,
      file_type: fileType,
      storage_path: storagePath,
      status: "pending",
    })
    .select()
    .single<Document>();

  if (insertError || !document) {
    console.error(`[UPLOAD] FAILED: database insert (documentId=${documentId}):`, insertError);
    return NextResponse.json(
      {
        error: `Failed to create document record: ${insertError?.message ?? "unknown error"}`,
      },
      { status: 500 }
    );
  }

  console.log(
    `[COMPLETE] documentId=${documentId} totalDuration=${Date.now() - requestStart}ms`
  );

  return NextResponse.json(
    {
      document,
      signedUrl: signedUpload.signedUrl,
      token: signedUpload.token,
      path: signedUpload.path,
    },
    { status: 201 }
  );
}
