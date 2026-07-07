export type DocumentStatus = "pending" | "processing" | "completed" | "failed";

export type SupportedFileType = "pdf" | "docx" | "txt";

export interface Document {
  id: string;
  file_name: string;
  file_type: SupportedFileType;
  storage_path: string;
  status: DocumentStatus;
  error_message: string | null;
  chunk_count: number;
  created_at: string;
}
