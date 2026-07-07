import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import { getSupabaseServiceClient } from "@/lib/supabase/server";
import type { Document, SupportedFileType } from "@/types/document";

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

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "No file was provided. Send it as multipart/form-data under the 'file' field." },
      { status: 400 }
    );
  }

  const fileType = resolveFileType(file.name);
  if (!fileType) {
    return NextResponse.json(
      { error: "Unsupported file type. Only PDF, DOCX, and TXT files are allowed." },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: "File is too large. The maximum file size is 15MB." },
      { status: 413 }
    );
  }

  const supabase = getSupabaseServiceClient();
  const documentId = randomUUID();
  const storagePath = `${documentId}/${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, file, {
      contentType: file.type || undefined,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: `Failed to upload file to storage: ${uploadError.message}` },
      { status: 500 }
    );
  }

  const { data: document, error: insertError } = await supabase
    .from("documents")
    .insert({
      id: documentId,
      file_name: file.name,
      file_type: fileType,
      storage_path: storagePath,
      status: "processing",
    })
    .select()
    .single<Document>();

  if (insertError || !document) {
    await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
    return NextResponse.json(
      {
        error: `Failed to create document record: ${insertError?.message ?? "unknown error"}`,
      },
      { status: 500 }
    );
  }

  return NextResponse.json(document, { status: 201 });
}
