"use client";

import { ConversationHistory } from "@/components/chat/ConversationHistory";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { DocumentLibrary } from "@/components/documents/DocumentLibrary";
import { UploadDropzone } from "@/components/upload/UploadDropzone";
import { VoiceOrb } from "@/components/voice/VoiceOrb";
import { useDocuments } from "@/hooks/useDocuments";

export default function Home() {
  const { documents, isLoading, error } = useDocuments();
  const readyDocumentCount = documents.filter((document) => document.status === "completed").length;

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <DashboardHeader documentCount={readyDocumentCount} />

      <div className="flex flex-1 flex-col gap-4 p-6 md:flex-row">
        <aside className="w-full shrink-0 space-y-4 rounded-lg border border-border bg-surface p-4 md:w-80">
          <UploadDropzone />
          <DocumentLibrary documents={documents} isLoading={isLoading} error={error} />
        </aside>

        <main className="flex flex-1 flex-col rounded-lg border border-border bg-surface p-6">
          <div className="flex-1 overflow-y-auto">
            <ConversationHistory />
          </div>

          <div className="flex justify-center pt-6">
            <VoiceOrb />
          </div>
        </main>
      </div>
    </div>
  );
}
