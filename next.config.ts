import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow the Next.js dev server to be reached from other devices on the
  // local network (e.g. testing on a phone via the "Network" URL printed
  // by `next dev`). Without this, dev-only assets and the HMR websocket
  // are blocked as cross-origin, so the page never hydrates on that device.
  allowedDevOrigins: ["192.168.100.*"],

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
