declare module "pdfjs-dist/legacy/build/pdf.worker.mjs" {
  export const WorkerMessageHandler: {
    setup(workerHandler: unknown, port: unknown): void;
  };
}