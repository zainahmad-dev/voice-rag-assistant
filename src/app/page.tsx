import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { DocumentLibrary } from "@/components/documents/DocumentLibrary";
import { UploadDropzone } from "@/components/upload/UploadDropzone";

const MOCK_DOCUMENT_COUNT = 3;

export default function Home() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <DashboardHeader documentCount={MOCK_DOCUMENT_COUNT} />

      <div className="flex flex-1 flex-col gap-4 p-6 md:flex-row">
        <aside className="w-full shrink-0 space-y-4 rounded-lg border border-border bg-surface p-4 md:w-80">
          <UploadDropzone />
          <DocumentLibrary />
        </aside>

        <main className="flex-1 rounded-lg border border-dashed border-border bg-surface" />
      </div>
    </div>
  );
}
