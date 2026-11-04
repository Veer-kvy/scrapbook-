# KABBU'S LITTLE SCRAPBOOK

A handmade, interactive digital scrapbook — and a private studio to keep it alive.

The project has two clearly separated surfaces:

| Surface | Address | Who it is for | What it can do |
| --- | --- | --- | --- |
| **Public scrapbook** | `#/` | Anyone with the link | Open the envelope, turn pages, flip Polaroids, open letters, find hidden notes. Read-only. |
| **Admin studio** | `#/admin/login` | The administrator only | Edit pages, photos, letters, stickers, interactions, theme, publish and restore versions. |

The public app never mounts an editor, never receives write credentials, and only reads the latest **published snapshot**. Drafts are never exposed.

Built with React 19, TypeScript 5.9, Vite 7, Tailwind CSS 3.4, GSAP and Framer Motion. Fonts are self-hosted with Fontsource. No UI kit and no external image host.

---

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run typecheck
npm run build      # type-check + production bundle in dist/
npm run preview    # serve the production bundle
```

Node 20.19+ / 22.12+ is required by Vite 7 (developed on Node 24).

### First run (local mode)

There is **no default passcode**. On the first visit to `#/admin/login` the studio asks you to create one (at least four characters, stored as a salted hash). The session lasts for the browser tab.

The app seeds itself with seven demo pages and sample photographs in `public/photos/`, and publishes that first version locally so the public link has something to show. Replace or delete the samples from the studio to make it yours.

### Admin routes

```
#/admin/login          sign in / first-run passcode
#/admin/dashboard      counts, quick actions, recent versions
#/admin/pages          page manager (create, duplicate, reorder, delete)
#/admin/pages/:id      visual page builder
#/admin/photos         photo library (upload, albums, replace, delete)
#/admin/letters        letters & messages
#/admin/stickers       stickers & custom decorations
#/admin/interactions   tap behaviour for photos, envelopes, secrets, buttons
#/admin/theme          palette, paper, fonts, motion
#/admin/preview        full draft preview, read-only
#/admin/publishing     publish, version history, restore
#/admin/settings       book details, sound, account, backup
```

Routing is hash-based, so the static build works on any host without rewrite rules.

### Deploy to GitHub Pages

This repo includes `.github/workflows/deploy.yml`, which builds `dist/` and deploys it with GitHub Actions.

1. Push to the `main` branch.
2. Open the repository → **Settings → Pages → Build and deployment** → set **Source** to **GitHub Actions**.
3. Wait for the workflow to finish. The site is at `https://<user>.github.io/<repo>/`.

The build uses relative asset paths (`base: './'`), so the same output works at a domain root and under a project subpath. Do not use **Deploy from a branch → / (root)** — the repository root is the Vite source, not the build, and the page would stay blank. GitHub Pages on a private repository requires a paid GitHub plan; otherwise make the repository public.

---

## Supabase setup (production mode)

The app runs fully in **local mode** with no configuration. To use secure, multi-device authentication and storage, connect Supabase.

### 1. Environment

Copy `.env.example` to `.env.local` and fill in:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
# Optional, defaults to scrapbook-media
VITE_SUPABASE_BUCKET=scrapbook-media
```

Only the **anon** key belongs in the browser. RLS makes it safe. **Never** put the service-role key in a `VITE_` variable — Vite ships every `VITE_*` value to visitors.

### 2. Apply the schema

Open the Supabase SQL editor and run [`supabase/schema.sql`](supabase/schema.sql). It creates:

- `admin_users` — allow-list of administrators (RLS enabled, no client policies)
- `scrapbook_settings`, `scrapbook_pages`, `media_assets`, `letters`, `scrapbook_assets`, `scrapbook_interactions` — draft content
- `scrapbook_versions`, `scrapbook_publication` — immutable published snapshots and the live pointer
- `get_published_snapshot()` — the only anonymous read path
- `publish_version(...)` — admin-only publishing RPC that prunes to 25 versions
- the private `scrapbook-media` Storage bucket plus policies

### 3. Create the administrator

1. In **Authentication → Users**, create the account manually (email + password). Do **not** enable public sign-up; the app has no sign-up form.
2. Copy the user's UUID and run:

```sql
insert into public.admin_users (user_id, email)
select id, email from auth.users where email = 'you@example.com'
on conflict (user_id) do nothing;
```

Only users listed in `admin_users` pass the `is_admin()` check used by every table policy, the publishing RPC, and the storage policy. Creating a normal Supabase user is not enough.

### 4. Configure Auth

- Disable **Allow new users to sign up** in Authentication settings.
- Keep email confirmation on if you like; the app signs in with email + password only.
- Password changes are done in the Supabase dashboard, not in the app.

### What changes in Supabase mode

- Draft content lives in Postgres; photos and decorations live in the private bucket and are read through short-lived signed URLs.
- Only metadata is stored in database rows — never image bytes.
- `saveDraft` uses a `revision` compare-and-set, so two open tabs cannot silently overwrite each other. The studio shows a conflict with **Retry** and **Reload**.
- Publishing copies every referenced file into `published/<versionId>/…` before writing the snapshot. Later draft edits or deletions cannot break the live book.
- The public app reads **only** `get_published_snapshot()`. If nothing has been published it shows a friendly “not published yet” screen.
- Backup download still works. Restore is local-only; with Supabase, use the dashboard/SQL editor.

### Security properties

- No service-role key, no hardcoded administrator, no client-only “unlock”.
- Every admin table and the bucket are protected by RLS; anonymous users can read only `published/%` objects (needed to sign URLs) and the published snapshot RPC.
- The UI hides admin routes, but authorization does not depend on that: a signed-out request is rejected by RLS/RPC.
- Drafts are never readable by anonymous visitors.

---

## What is included

| Area | Details |
| --- | --- |
| Public story | Envelope invitation → cloth cover → open book, page turns, fade/slide transitions, swipe, arrows, dots |
| Public interactions | Polaroid flips with a back message, envelopes open letters, hidden notes bloom, buttons jump pages |
| Page manager | 8 templates, create/duplicate/delete/rename/reorder, paper background, transition, live thumbnails |
| Visual builder | Desktop 3-panel (palette / canvas / properties), mobile bottom toolbar with sheets; add, select, move, resize, rotate, duplicate, delete, layer, lock, align, snap, undo/redo, keyboard nudge |
| Elements | Polaroid photos, text, handwritten notes, envelopes, flowers/hearts/butterflies and other stickers, washi tape, hidden surprises, buttons, custom PNG/SVG decorations |
| Photo library | Multi-upload with progress, albums, search, metadata editing, preview, reuse across pages, replace-in-place without breaking layouts, guarded delete |
| Letters | Categories, handwriting fonts, ink colour/size, paper styles, envelope tone, opening animation, hidden postscript |
| Interactions | Configure tap behaviour per element without code; target-page picker; envelope→letter linking |
| Theme | 5 palettes, paper textures, three font roles, Polaroid styles, shadows, button shapes, motion intensity, decoration toggle; instant studio preview |
| Publishing | Draft validation, version labels, progress, immutable snapshots, frozen media, history, restore into draft |
| Persistence | Debounced autosave, save-state indicator, network retry, conflict handling, undo/redo, JSON backup download |
| Sound | Synthesised ambient pad and interface sounds, independent music/SFX toggles, volume, never autoplayed |
| Responsive | 320, 375, 390, 430, 768, 1024, 1440 px; portrait and landscape; no horizontal overflow |
| Accessibility | Keyboard paging/nudging, focus-visible rings, focus trap + Escape in dialogs, reduced-motion paths |

Every visible control is wired. There are no placeholder buttons and no fake sync indicators.

---

## Storage and offline behaviour

### Local mode (no env vars)

- The document lives in **IndexedDB** (`kabbu-scrapbook`, store `docs`, key `scrapbook`).
- Photo and decoration binaries live in the `blobs` store and are referenced by `blobId`; they are never embedded in the document.
- Published versions live in the `versions` store; the live pointer lives in `meta`.
- A `localStorage` copy is used only if IndexedDB is unavailable.
- Saves are debounced; the top bar shows **Saving…**, **Saved**, **Not saved**, or **Newer draft exists**.
- Undo/redo keeps up to 50 document snapshots; drags and resizes coalesce into one step.

### Upload limits

JPG, PNG, WebP, AVIF and HEIC are accepted up to 30 MB each. Photos are downscaled to a max 1800 px edge and re-encoded (WebP where supported) before storage. Decorations accept transparent PNG and SVG up to 4 MB.

### Backup

**Settings → Backup → Download backup** writes one JSON file containing the draft and every local media file as a data URL. The current passcode hash is deliberately excluded. Restoring asks for confirmation and only replaces the draft — the live book changes on the next publish.

---

## Project layout

```
src/
  App.tsx                     public/admin route split
  backend/
    types.ts                  ContentBackend contract
    local.ts                  IndexedDB + local passcode adapter
    supabase.ts               Auth + Postgres + Storage adapter
    index.ts                  backend selection
  components/
    Admin/                    studio shell, dashboard, pages, builder, photos,
                              letters, stickers, interactions, theme, preview,
                              publishing, settings
    Public/PublicApp.tsx      read-only scrapbook entry
    Scenes/                   welcome envelope and cover
    Scrapbook/                page canvas, book viewer, spread, flip, elements
    Editor/                   inspector, memories library, framing, sticker grid
    UI/                       modal, icons, splash, sound controls, note dialog
  data/
    store.ts                  zustand store, actions, autosave, undo/redo
    seed.ts                   seeded scrapbook
    db.ts                     IndexedDB helpers
    theme.ts                  palettes, font stacks, applyTheme
    factories.ts              templates and element constructors
  hooks/                      hash route, app effects, layout helpers
  lib/                        router, audio, local auth hashing, image pipeline
  styles/index.css            paper, book, studio and responsive styling
supabase/schema.sql           tables, RLS, RPCs, storage policies
public/photos/                sample photographs
```

---

## Interaction notes

- **Reading:** swipe or use arrow keys; dots jump to a page; the sound menu is opt-in.
- **Building:** click a page element to select it; drag to move, corner handle to resize, top handle to rotate. Arrow keys nudge (Shift for bigger steps). ⌘/Ctrl+Z and ⇧⌘/Ctrl+Shift+Z undo/redo. Locked elements ignore drag; unlock from the properties panel or layers list.
- **Mobile builder:** the bottom toolbar opens Add / Layers / Adjust / Page sheets without covering the whole canvas.
- **Deleting** a photo or decoration that is in use is guarded and, for decorations, removes the placed elements after confirmation. Replacing a photo keeps its id, so every page layout stays intact.
- **Reduced motion:** `prefers-reduced-motion` removes page-turn, cover, float and modal animations; the motion theme also has a “Calm” setting.
- **Unsaved changes:** the studio warns before signing out or closing the tab while edits are pending.
