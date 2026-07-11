"use client";

import { ConversationHistory } from "@/components/chat/ConversationHistory";
import { TextQueryInput } from "@/components/chat/TextQueryInput";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { Sidebar } from "@/components/layout/Sidebar";
import { VoiceOrb } from "@/components/voice/VoiceOrb";
import { useDocuments } from "@/hooks/useDocuments";
import { useSidebarState } from "@/hooks/useSidebarState";

export default function Home() {
  const { documents, isLoading, error, deleteDocument } = useDocuments();
  const readyDocumentCount = documents.filter((document) => document.status === "completed").length;
  const { isCollapsed, isMobileOpen, isSidebarVisible, toggle, closeMobile } = useSidebarState();

  return (
    <div className="flex min-h-full flex-1 flex-col overflow-x-hidden bg-background">
      <DashboardHeader
        documentCount={readyDocumentCount}
        isSidebarVisible={isSidebarVisible}
        onToggleSidebar={toggle}
      />

      <div className="relative flex flex-1 overflow-hidden">
        <Sidebar
          documents={documents}
          isLoading={isLoading}
          error={error}
          deleteDocument={deleteDocument}
          isCollapsed={isCollapsed}
          isMobileOpen={isMobileOpen}
          onCloseMobile={closeMobile}
        />

        <main className="flex min-w-0 flex-1 flex-col rounded-lg border border-border bg-surface p-4 md:m-6 md:p-6">
          <div className="flex-1 overflow-y-auto">
            <ConversationHistory />
          </div>

          <div className="flex flex-col items-center gap-4 pt-6">
            <VoiceOrb />
            <TextQueryInput />
          </div>
        </main>
      </div>
    </div>
  );
}
