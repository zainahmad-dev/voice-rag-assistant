import { NextResponse } from "next/server";

import { getSupabaseServiceClient } from "@/lib/supabase/server";
import type { Document } from "@/types/document";

const STORAGE_BUCKET = "documents";

/**
 * Deletes the document row first (cascading to its chunks via the FK in
 * schema.sql), then best-effort removes the underlying file from Storage.
 * Doing the row first means a failure to reach Storage never leaves behind a
 * DB row pointing at a file that might already be gone; a failure here just
 * leaks an orphaned blob, which is harmless and logged for cleanup.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabaseServiceClient();

  const { data: document, error: fetchError } = await supabase
    .from("documents")
    .select()
    .eq("id", id)
    .single<Document>();

  if (fetchError || !document) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  const { error: deleteError } = await supabase.from("documents").delete().eq("id", id);

  if (deleteError) {
    return NextResponse.json(
      { error: "Something went wrong deleting this document. Please try again." },
      { status: 500 }
    );
  }

  const { error: storageError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .remove([document.storage_path]);

  if (storageError) {
    console.error("Failed to remove document file from storage:", storageError);
  }

  return new NextResponse(null, { status: 204 });
}
