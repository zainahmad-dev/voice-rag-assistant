import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Voice RAG Assistant",
    short_name: "Voice RAG",
    description:
      "Ask questions about your documents by voice or text, backed by retrieval-augmented generation over your uploaded files.",
    start_url: "/",
    display: "standalone",
    background_color: "#faf6ee",
    theme_color: "#0e3b3c",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
