// Single registrar for the offline service worker. Never registers in dev or Lovable previews.
const PREVIEW_LABEL = /^(?:id-preview|preview)(?:-[a-z0-9]+)?--.+$/;

function isRefusedContext(): boolean {
  if (!import.meta.env.PROD) return true;
  try { if (window.self !== window.top) return true; } catch { return true; }
  const h = window.location.hostname.toLowerCase();
  if (new URLSearchParams(window.location.search).get("sw") === "off") return true;
  const label = h.split(".")[0] ?? "";
  for (const zone of [".lovable.app", ".gpt-eng.com", ".gptengineer.run"]) {
    if (h.endsWith(zone) && (PREVIEW_LABEL.test(label) || /^project--.+-dev$/.test(label))) return true;
  }
  if (h === "lovableproject.com" || h.endsWith(".lovableproject.com")) return true;
  if (h === "lovableproject-dev.com" || h.endsWith(".lovableproject-dev.com")) return true;
  if (h === "beta.lovable.dev" || h.endsWith(".beta.lovable.dev")) return true;
  return false;
}

export async function registerOfflineSW() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  if (isRefusedContext()) {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.allSettled(
      regs.filter((r) => r.active?.scriptURL.endsWith("/sw.js") || r.installing?.scriptURL.endsWith("/sw.js") || r.waiting?.scriptURL.endsWith("/sw.js")).map((r) => r.unregister()),
    );
    return;
  }
  try { await navigator.serviceWorker.register("/sw.js", { scope: "/" }); } catch (e) { console.warn("SW", e); }
}
