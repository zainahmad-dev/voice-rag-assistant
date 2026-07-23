import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow the Next.js dev server to be reached from other devices on the
  // local network (e.g. testing on a phone via the "Network" URL printed
  // by `next dev`). Without this, dev-only assets and the HMR websocket
  // are blocked as cross-origin, so the page never hydrates on that device.
  allowedDevOrigins: ["192.168.100.*"],

  // Keep the PDF stack out of the bundler and let it be `require`d from
  // node_modules at runtime.
  //
  // pdfjs pulls in `@napi-rs/canvas` through a conditional require, to
  // polyfill the browser globals (DOMMatrix, ImageData, Path2D) that its
  // build references. Bundlers can't see through that require, so on Vercel
  // the package was traced out of the deployed function entirely — and with
  // no polyfill, `pdf.worker.mjs` (imported at module scope by
  // src/lib/rag/extractText.ts) threw "DOMMatrix is not defined" while it was
  // being evaluated. That killed the whole /api/ingest module before its
  // handler ran, so every ingest returned Next's generic HTML 500 instead of
  // this route's JSON errors, and no document could be indexed from either
  // client. It only ever reproduced on the deployment: locally the package is
  // installed for the host platform, so the polyfill was always there.
  //
  // Marking these external makes Next `require` them from node_modules at
  // runtime instead of bundling them.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "@napi-rs/canvas"],

  // Externalizing pdfjs is necessary but not sufficient: its dependency on
  // `@napi-rs/canvas` is a *conditional* require, and Next's file tracer
  // (@vercel/nft) can't follow those, so the package is still traced out and
  // absent at runtime — the original failure. Force it (and its platform
  // binary) into the /api/ingest function explicitly. The globs are resolved
  // on the build machine, so on Vercel's Linux builders the `-linux-*`
  // binaries match; the `**` under the scope covers whichever platform builds.
  outputFileTracingIncludes: {
    "/api/ingest": [
      "./node_modules/@napi-rs/canvas/**",
      "./node_modules/@napi-rs/canvas-linux-*/**",
    ],
  },

  async headers() {
    return [
      {
        // Prevents the browser/any proxy from HTTP-caching the service
        // worker script itself, so updates to it are always picked up.
        source: "/sw.js",
        headers: [{ key: "Cache-Control", value: "no-cache" }],
      },
    ];
  },
};

export default nextConfig;
