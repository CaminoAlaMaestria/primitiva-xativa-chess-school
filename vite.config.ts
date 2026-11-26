// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// Never set ssr.external or resolve.external: the Worker has no runtime module resolution, so
// the build fails. Never add compression (compressPublicAssets, vite-plugin-compression):
// hosting already compresses at the edge.
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { existsSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import type { Plugin } from "vite";
import { generateSW } from "workbox-build";

const GLOB_PATTERNS = ["**/*.{js,css,svg,png,jpg,jpeg,webp,woff2,wasm,json,webmanifest,mp3,m4a}"];

function hasRealClientAssets(dir: string): boolean {
  if (!existsSync(dir)) return false;
  return readdirSync(dir).some((name) => !name.startsWith("sw.") && !name.startsWith("workbox-"));
}

function offlineServiceWorkerPlugin(): Plugin {
  let root = process.cwd();
  return {
    name: "chess-school:offline-sw",
    apply: "build",
    configResolved(config) {
      root = config.root;
    },
    buildApp: {
      order: "post",
      async handler() {
        const candidates = [join(root, ".output", "public"), join(root, "dist", "client")];
        const targets = candidates.filter(hasRealClientAssets);
        if (targets.length === 0) return;

        for (const outDir of targets) {
          await generateSW({
            swDest: join(outDir, "sw.js"),
            globDirectory: outDir,
            globPatterns: GLOB_PATTERNS,
            globIgnores: ["sw.js", "workbox-*.js"],
            maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
            skipWaiting: true,
            clientsClaim: true,
            cleanupOutdatedCaches: true,
            navigateFallback: null,
            runtimeCaching: [
              {
                urlPattern: ({ url, sameOrigin }) =>
                  sameOrigin && /\.(mp3|m4a)$/i.test(url.pathname),
                handler: "CacheFirst",
                options: {
                  cacheName: "audio",
                  rangeRequests: true,
                  cacheableResponse: { statuses: [0, 200] },
                  expiration: { maxEntries: 20 },
                },
              },
              {
                urlPattern: ({ request, url }) =>
                  request.mode === "navigate" && !url.pathname.startsWith("/~oauth"),
                handler: "NetworkFirst",
                options: {
                  cacheName: "pages",
                  networkTimeoutSeconds: 4,
                  expiration: { maxEntries: 50 },
                },
              },
              {
                urlPattern: ({ url, sameOrigin }) =>
                  sameOrigin &&
                  (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/__l5e/")),
                handler: "CacheFirst",
                options: { cacheName: "static-assets", expiration: { maxEntries: 500 } },
              },
              {
                urlPattern: ({ url }) =>
                  url.origin === "https://fonts.googleapis.com" ||
                  url.origin === "https://fonts.gstatic.com",
                handler: "CacheFirst",
                options: { cacheName: "google-fonts", expiration: { maxEntries: 30 } },
              },
            ],
          });
        }

        // Clean stale empty dist/client output when Nitro emitted into .output/public instead.
        const distClient = join(root, "dist", "client");
        if (!hasRealClientAssets(distClient) && existsSync(distClient)) {
          rmSync(join(root, "dist"), { recursive: true, force: true });
        }
      },
    },
  };
}

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [offlineServiceWorkerPlugin()],
  },
});
