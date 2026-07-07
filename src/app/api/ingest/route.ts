import { NextResponse } from "next/server";

import { chunkText } from "@/lib/rag/chunkText";
import { embedChunks } from "@/lib/rag/embed";
import { extractText } from "@/lib/rag/extractText";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import type { Document } from "@/types/document";

const STORAGE_BUCKET = "documents";
const INSERT_BATCH_SIZE = 100;

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
      throw new Error(
        `Failed to download file from storage: ${downloadError?.message ?? "unknown error"}`
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await extractText(buffer, document.file_type);
    const chunks = chunkText(text);

    if (chunks.length === 0) {
      throw new Error("No text could be extracted from this document.");
    }

    const embeddings = await embedChunks(chunks);

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
        throw new Error(`Failed to insert chunks: ${insertError.message}`);
      }
    }

    const { data: updated, error: updateError } = await supabase
      .from("documents")
      .update({ status: "completed", chunk_count: chunks.length, error_message: null })
      .eq("id", documentId)
      .select()
      .single<Document>();

    if (updateError || !updated) {
      throw new Error(
        `Failed to finalize document status: ${updateError?.message ?? "unknown error"}`
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ingestion failed for an unknown reason.";

    await supabase
      .from("documents")
      .update({ status: "failed", error_message: message })
      .eq("id", documentId);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
