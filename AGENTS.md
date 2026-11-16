<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project structure
- Each lesson sheet (ficha) is its own single-segment route (e.g. /karpov, /peones-bajo-presion) and section pages (/campeones, /apertura-espanola, /clases-avanzadas) list them; single-segment paths keep the lesson's relative `assets/...` URLs working.
- Imported sheets are kept byte-for-byte from their source projects (src/components/karpov, src/lesson); only route wiring and the floating "Panel" back link are added.
- Section pages export their `fichas` array so a test can assert a sheet is unlocked and points at its route, without rendering the app shell.
- Offline support uses vite-plugin-pwa (generateSW, output to dist/client) registered only via src/lib/register-sw.ts, which refuses dev/preview hosts; keeps Lovable previews free of stale caches.
