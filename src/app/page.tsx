"use client";

import { ConversationHistory } from "@/components/chat/ConversationHistory";
import { TextQueryInput } from "@/components/chat/TextQueryInput";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { InstallPrompt } from "@/components/layout/InstallPrompt";
import { Sidebar } from "@/components/layout/Sidebar";
import { VoiceOrb } from "@/components/voice/VoiceOrb";
import { useDocuments } from "@/hooks/useDocuments";
import { useSidebarState } from "@/hooks/useSidebarState";

export default function Home() {
  const { documents, isLoading, error, deleteDocument } = useDocuments();
  const readyDocumentCount = documents.filter((document) => document.status === "completed").length;
  const { isCollapsed, isMobileOpen, isSidebarVisible, toggle, closeMobile } = useSidebarState();

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <DashboardHeader
        documentCount={readyDocumentCount}
        isSidebarVisible={isSidebarVisible}
        onToggleSidebar={toggle}
      />

      <InstallPrompt />

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <Sidebar
          documents={documents}
          isLoading={isLoading}
          error={error}
          deleteDocument={deleteDocument}
          isCollapsed={isCollapsed}
          isMobileOpen={isMobileOpen}
          onCloseMobile={closeMobile}
        />

        <main className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-surface md:m-6">
          <div className="min-h-0 flex-1">
            <ConversationHistory />
          </div>

          <div className="shrink-0 border-t border-border bg-surface/95 px-4 py-4 backdrop-blur-sm md:px-6">
            <div className="flex flex-col items-center gap-3">
              <VoiceOrb />
              <TextQueryInput />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
