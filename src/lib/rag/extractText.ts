import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

import type { SupportedFileType } from "@/types/document";

async function extractPdfText(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  try {
    // Default pageJoiner appends a "-- page_number of total_number --" marker
    // after every page, which would otherwise leak into chunks/embeddings.
    const result = await parser.getText({ pageJoiner: "" });
    return result.text;
  } finally {
    await parser.destroy();
  }
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

export async function extractText(
  buffer: Buffer,
  fileType: SupportedFileType
): Promise<string> {
  switch (fileType) {
    case "pdf":
      return extractPdfText(buffer);
    case "docx":
      return extractDocxText(buffer);
    case "txt":
      return buffer.toString("utf-8");
  }
}
