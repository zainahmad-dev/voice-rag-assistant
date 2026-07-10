import { NextResponse } from "next/server";

import { chunkText } from "@/lib/rag/chunkText";
import { embedChunks } from "@/lib/rag/embed";
import { extractText } from "@/lib/rag/extractText";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import type { Document } from "@/types/document";

const STORAGE_BUCKET = "documents";
const INSERT_BATCH_SIZE = 100;

/**
 * Runs `fn`, and on failure logs the original (possibly technical) error for
 * developers while rethrowing `friendlyMessage` — the version that ends up in
 * document.error_message and is shown to the user — so nobody has to parse a
 * raw pdf-parse/mammoth/Gemini/Supabase error to know what to do next.
 */
async function withStage<T>(stage: string, friendlyMessage: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    console.error(`Ingestion failed during ${stage}:`, error);
    throw new Error(friendlyMessage);
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const documentId =
    body && typeof body === "object" ? (body as { documentId?: unknown }).documentId : null;

  if (typeof documentId !== "string" || !documentId) {
    return NextResponse.json({ error: "documentId is required." }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient();

  const { data: document, error: fetchError } = await supabase
    .from("documents")
    .select()
    .eq("id", documentId)
    .single<Document>();

  if (fetchError || !document) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  try {
    await supabase
      .from("documents")
      .update({ status: "processing" })
      .eq("id", documentId);

    const { data: file, error: downloadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .download(document.storage_path);

    if (downloadError || !file) {
      console.error("Failed to download file from storage:", downloadError);
      throw new Error("We couldn't retrieve the uploaded file. Please try uploading it again.");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await withStage(
      "text extraction",
      "We couldn't read this file. It may be corrupted, password-protected, or in an unexpected format — try re-saving it and upload again.",
      () => extractText(buffer, document.file_type)
    );
    const chunks = chunkText(text);

    if (chunks.length === 0) {
      throw new Error(
        "This document doesn't contain any readable text. If it's a scanned image, try uploading a text-based version instead."
      );
    }

    const embeddings = await withStage(
      "embedding",
      "We couldn't process this document's content right now. Please try again in a few minutes.",
      () => embedChunks(chunks)
    );

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
        console.error("Failed to insert document chunks:", insertError);
        throw new Error("Something went wrong saving this document's content. Please try again.");
      }
    }

    const { data: updated, error: updateError } = await supabase
      .from("documents")
      .update({ status: "completed", chunk_count: chunks.length, error_message: null })
      .eq("id", documentId)
      .select()
      .single<Document>();

    if (updateError || !updated) {
      console.error("Failed to finalize document status:", updateError);
      throw new Error("Something went wrong finishing up this document. Please try again.");
    }

    return NextResponse.json(updated);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Something went wrong while processing this document. Please try again.";

    await supabase
      .from("documents")
      .update({ status: "failed", error_message: message })
      .eq("id", documentId);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
