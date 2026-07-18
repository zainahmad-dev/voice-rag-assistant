import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { chunkText } from "@/lib/rag/chunkText";
import { embedChunks } from "@/lib/rag/embed";
import { extractText } from "@/lib/rag/extractText";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import type { Document } from "@/types/document";

// pdf-parse/mammoth need Buffer and other Node APIs, so this can't run on the
// Edge runtime. Explicit rather than relying on Next's Node-by-default
// behavior, since that default is exactly the kind of thing that's easy to
// break with a stray top-level `export const runtime = "edge"` elsewhere.
export const runtime = "nodejs";
// The whole pipeline (download + extract + chunk + embed + insert) runs
// synchronously inside this one request. Vercel's default function timeout
// (10s on Hobby) is easy to blow past once Gemini embedding calls are in the
// mix. 60s is the Hobby-plan ceiling; raise it (up to 300s on Pro, 800s on
// Enterprise/Fluid compute) if real documents still time out.
export const maxDuration = 60;

const STORAGE_BUCKET = "documents";
const INSERT_BATCH_SIZE = 100;

function elapsed(start: number): string {
  return `${Date.now() - start}ms`;
}

/**
 * Runs `fn` under a `[TAG]`-prefixed log line (with timing), and on failure
 * logs the original (possibly technical) error for developers while
 * rethrowing `friendlyMessage` — the version that ends up in
 * document.error_message and is shown to the user — so nobody has to parse a
 * raw pdf-parse/mammoth/Gemini/Supabase error to know what to do next.
 */
async function withStage<T>(
  tag: string,
  documentId: string,
  friendlyMessage: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    console.log(`${tag} SUCCESS: documentId=${documentId} duration=${elapsed(start)}`);
    return result;
  } catch (error) {
    console.error(`${tag} FAILED: documentId=${documentId} duration=${elapsed(start)}:`, error);
    throw new Error(friendlyMessage);
  }
}

export async function POST(request: Request) {
  const requestStart = Date.now();
  const body = await request.json().catch(() => null);
  const documentId =
    body && typeof body === "object" ? (body as { documentId?: unknown }).documentId : null;

  if (typeof documentId !== "string" || !documentId) {
    console.error("[INGEST] FAILED: missing documentId in request body");
    return NextResponse.json({ error: "documentId is required." }, { status: 400 });
  }

  console.log(`[INGEST] START: documentId=${documentId}`);

  // Everything below — including client construction, which throws
  // synchronously if Supabase env vars are missing — must stay inside this
  // try block. Anything that escapes uncaught skips our NextResponse.json
  // error shape entirely; Next then returns its own generic error response,
  // which is indistinguishable client-side from a plain "status 500" with no
  // detail (see ingestDocument()'s fallback message in UploadDropzone.tsx).
  let supabase: SupabaseClient;
  try {
    supabase = getSupabaseServiceClient();

    const { data: document, error: fetchError } = await supabase
      .from("documents")
      .select()
      .eq("id", documentId)
      .single<Document>();

    if (fetchError || !document) {
      console.error(`[INGEST] FAILED: document lookup (documentId=${documentId}):`, fetchError);
      return NextResponse.json({ error: "Document not found." }, { status: 404 });
    }

    await supabase.from("documents").update({ status: "processing" }).eq("id", documentId);

    const downloadStart = Date.now();
    const { data: file, error: downloadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .download(document.storage_path);

    if (downloadError || !file) {
      console.error(
        `[DOWNLOAD] FAILED: documentId=${documentId} path=${document.storage_path} duration=${elapsed(downloadStart)}:`,
        downloadError
      );
      throw new Error(
        "Storage download failed: we couldn't retrieve the uploaded file. Please try uploading it again."
      );
    }

    console.log(
      `[DOWNLOAD] SUCCESS: documentId=${documentId} bytes=${file.size} duration=${elapsed(downloadStart)}`
    );

    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await withStage(
      "[EXTRACT]",
      documentId,
      "Extraction failed: we couldn't read this file. It may be corrupted, password-protected, or in an unexpected format — try re-saving it and upload again.",
      () => extractText(buffer, document.file_type)
    );

    const chunkStart = Date.now();
    const chunks = chunkText(text);
    console.log(
      `[CHUNK] SUCCESS: documentId=${documentId} chunks=${chunks.length} duration=${elapsed(chunkStart)}`
    );

    if (chunks.length === 0) {
      throw new Error(
        "Extraction produced no text: this document doesn't contain any readable text. If it's a scanned image, try uploading a text-based version instead."
      );
    }

    const embeddings = await withStage(
      "[EMBED]",
      documentId,
      "Embedding generation failed: we couldn't process this document's content right now. Please try again in a few minutes.",
      () => embedChunks(chunks)
    );

    const supabaseStart = Date.now();

    // Clear out any chunks from a previous attempt so retries don't duplicate rows.
    await supabase.from("document_chunks").delete().eq("document_id", documentId);

    const rows = chunks.map((content, index) => ({
      document_id: documentId,
      chunk_index: index,
      content,
      embedding: embeddings[index],
    }));

    for (let i = 0; i < rows.length; i += INSERT_BATCH_SIZE) {
      const batch = rows.slice(i, i + INSERT_BATCH_SIZE);
      const { error: insertError } = await supabase.from("document_chunks").insert(batch);
      if (insertError) {
        console.error(`[SUPABASE] FAILED: chunk insert (documentId=${documentId}):`, insertError);
        throw new Error(
          "Supabase insert failed: something went wrong saving this document's content. Please try again."
        );
      }
    }

    console.log(
      `[SUPABASE] SUCCESS: documentId=${documentId} chunksInserted=${rows.length} duration=${elapsed(supabaseStart)}`
    );

    const { data: updated, error: updateError } = await supabase
      .from("documents")
      .update({ status: "completed", chunk_count: chunks.length, error_message: null })
      .eq("id", documentId)
      .select()
      .single<Document>();

    if (updateError || !updated) {
      console.error(`[SUPABASE] FAILED: finalize status (documentId=${documentId}):`, updateError);
      throw new Error(
        "Supabase update failed: something went wrong finishing up this document. Please try again."
      );
    }

    console.log(`[COMPLETE] documentId=${documentId} totalDuration=${elapsed(requestStart)}`);

    return NextResponse.json(updated);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Something went wrong while processing this document. Please try again.";

    console.error(
      `[INGEST] FAILED: documentId=${documentId} totalDuration=${elapsed(requestStart)}:`,
      error
    );

    // This write itself must never be allowed to throw uncaught — a second
    // failure here (e.g. a transient network error hitting Supabase) would
    // otherwise escape this catch block entirely and produce the same
    // generic, detail-free error response we're trying to eliminate.
    try {
      const { error: statusUpdateError } = await getSupabaseServiceClient()
        .from("documents")
        .update({ status: "failed", error_message: message })
        .eq("id", documentId);

      if (statusUpdateError) {
        console.error(
          `[INGEST] FAILED: could not write failure status (documentId=${documentId}):`,
          statusUpdateError
        );
      }
    } catch (statusUpdateError) {
      console.error(
        `[INGEST] FAILED: could not write failure status (documentId=${documentId}):`,
        statusUpdateError
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
