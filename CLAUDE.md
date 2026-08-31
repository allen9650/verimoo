# CLAUDE.md — VeriMoo

Project context for Claude Code. Read this at the start of every session on this repo.

Companion docs:
- [AGENTS.md](AGENTS.md) — tool-agnostic twin of this file
- [coding-guidelines.md](coding-guidelines.md) — patterns, naming, styling, state
- [docs/audit.md](docs/audit.md) — full codebase audit (2026-08-31), including verified bugs and dead code

---

## What this is

**VeriMoo** is a multi-tenant SaaS application for issuing, managing, and publicly verifying digital certificates — for webinars, workshops, training, internships, and similar programs.

It is **not** a portfolio or marketing site. It contains one agency/bio section ("Ahsan & My Team"), but that is a single component inside a much larger product.

Two audiences, one codebase:

- **Public, unauthenticated** — anyone with a serial number can verify a certificate and download it as PNG or PDF. Routes: `/`, `/verify/[serial]`, `/about`, plus the public `/api/verify/*` and `/api/certificate/*` endpoints.
- **Authenticated admin** — superadmins and sub-admins ("Simple Users") create projects, design certificate templates in a drag-and-drop studio, import participant rosters from Excel/CSV, bulk-export certificates, and email them. Routes under `/admin` and most of `/api`.

### Core domain model

```
Admin (superadmin | admin)
  └── Project          template, fields[], serial prefix/counter, branding,
      │                customFonts[], verification theme, emailConfig, settings{}
      └── Participant  serialNumber (unique), name, email, courseTitle, date,
                       customFields{}, status
```

Plus two standalone collections: `TextTemplate` (shared certificate wording blocks) and `ActivityLog` (audit trail — currently **written but never read**).

### How a certificate is produced

The pipeline matters and shows up in most feature work:

1. `lib/certificate.js` → `buildCertificateSVG()` composes an SVG: the project's uploaded template as background, then each `field` positioned by **percentage** coordinates, with text resolved from the participant, plus QR code and logo overlays. Fonts are base64-embedded so output is self-contained.
2. `svgToPngBuffer()` rasterizes at **300 DPI** (`scale = 300/96`) via `@resvg/resvg-js`, falling back to `sharp`.
3. `lib/pdf.js` → `pngToPdfBuffer()` wraps the PNG in a PDF at `width × 72/96` points.
4. `lib/clientCertificateDownload.ts` implements **the same PNG→PDF flow in the browser** (Canvas + `pdf-lib`) as a fallback for when server rasterization is unavailable — this exists because of Vercel's serverless payload limit.

Results are cached three ways (`svg:`, `png:`, `pdf:`) in `lib/cache.js`, keyed on `serialNumber:participant.updatedAt:project.updatedAt` so any edit self-invalidates.

---

## Tech stack

| Concern | Choice |
|---|---|
| Framework | **Next.js 16.2.10**, App Router |
| UI | React 19.2.7 |
| Language | TypeScript 6.0.3 (`strict: true`) — mixed with plain JS, see below |
| Styling | **Tailwind CSS v4.3.2**, CSS-first config. **No `tailwind.config.js` exists** — all theming lives in `app/globals.css` under `@theme` and `@utility` |
| Auth | **NextAuth v4.24.14**, credentials provider + JWT sessions |
| Database | MongoDB via Mongoose 9.7.3 |
| Animation | `framer-motion` 12.42.2 |
| Icons | `lucide-react` 1.24.0 (brand icons hand-rolled — lucide dropped them) |
| Rasterizing | `@resvg/resvg-js` (primary), `sharp` (fallback) |
| PDF | `pdf-lib` (server **and** browser) |
| Spreadsheets | `xlsx` 0.18.5 |
| Archives | `archiver` 8 (server), `jszip` (browser) |
| Email | `nodemailer` (Gmail SMTP) |
| Deployment | **Vercel serverless** |

**Node `>=20.19.0`** (`package.json` `engines`).

### Language split — deliberate, follow it

| Extension | Used for |
|---|---|
| `.tsx` | Pages and React components |
| `.ts` | Shared types (`lib/types.ts`), client-side browser logic (`lib/clientCertificateDownload.ts`), static data (`lib/changelog-data.ts`) |
| `.js` | **All API routes** and all server-side `lib/` + `models/` modules |

`tsconfig.json` sets `allowJs: true`. Don't convert `.js` route handlers to TypeScript as a drive-by — that's a project-wide decision, not a per-file one.

---

## Running it locally

```bash
npm install
npm run dev        # next dev          → http://localhost:3000
npm run build      # next build
npm run start      # next start        (production server)
npm run lint       # eslint
npm run lint:fix   # eslint --fix
npm run typecheck  # tsc --noEmit
npm run seed:admin # create the first superadmin account
```

**There is no test suite.** No test framework, runner, or test files exist anywhere in the repo. "Verified" in this project means: `npm run typecheck && npm run lint && npm run build` all pass. Run all three before claiming a change works.

### Environment setup

Copy `.env.example` → `.env.local` and fill it in. Required:

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | MongoDB connection string (local or Atlas) |
| `NEXTAUTH_SECRET` | Session JWT signing key — `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `http://localhost:3000` locally |
| `NEXT_PUBLIC_BASE_URL` | Base URL baked into certificate QR codes |

Optional: `ADMIN_EMAIL` / `ADMIN_PASSWORD` (used by `seed:admin`), `GEMINI_API_KEY` + `GEMINI_MODEL` (AI wording suggestions), `ENCRYPTION_KEY` (AES key for stored Gmail app passwords; falls back to `NEXTAUTH_SECRET`).

**Gotcha:** `scripts/seed-admin.js` loads `.env.local` explicitly via `dotenv` — it does **not** read `.env`. A `.env` file alone will make `npm run seed:admin` fail with "MONGODB_URI not set".

**Gotcha:** `.env` is gitignored; `.env.example` is committed and currently contains a placeholder `NEXTAUTH_SECRET` literal. `lib/auth.js` falls back to that same literal if the env var is missing — see Known Issues.

### Diagnostics

`GET /api/health` (public, no auth) reports env-var presence, MongoDB connection + database name, participant/project counts, and whether `sharp` loaded. First stop when something is misbehaving in a deployed environment.

---

## Folder structure

```
app/
  layout.tsx              Root layout — Inter font, metadata, pre-paint theme script,
                          Providers → ThemeProvider, global <ChangelogModal />
  page.tsx                Public verification portal (client)
  globals.css             THE design system: @theme tokens, @utility classes, dark variant
  providers.tsx           SessionProvider wrapper
  theme-provider.tsx      Theme context via useSyncExternalStore + themeInitScript
  about/page.tsx          The only server-component page in the app
  login/page.tsx
  verify/[serial]/page.tsx
  admin/
    layout.tsx            Auth gate, admin nav shell, mobile drawer
    page.tsx              Project dashboard
    team/page.tsx         Superadmin team management
    projects/[id]/page.tsx  ⚠ Certificate Studio — 2,207 lines, ~40 useState hooks
  api/                    22 route files (all .js)

components/               5 files, ~740 lines total
  ui.tsx                  Button, Input, Card, Badge
  modal.tsx               Modal (Escape, scroll-lock, ARIA)
  progress-bar.tsx        ProgressBar (indeterminate, brand gradient)
  theme-toggle.tsx        ThemeToggle (light/dark/system segmented control)
  who-we-are-section.tsx  WhoWeAreSection + LinkedinIcon/GithubIcon

lib/                      16 modules — see table below
models/                   5 Mongoose schemas
types/next-auth.d.ts      Augments Session/User/JWT with id + role
scripts/seed-admin.js     Standalone CommonJS seed script (not part of the Next build)
assets/fonts/             Inter woff — read from disk, base64-embedded server-side
public/fonts/             Same two files — served to the browser via @font-face
docs/audit.md
```

### `lib/` reference

| Module | Responsibility |
|---|---|
| `certificate.js` | SVG composition, 300 DPI PNG raster, PDF, `generateSerial()` |
| `pdf.js` | PNG buffer → PDF buffer (`pdf-lib`) |
| `clientCertificateDownload.ts` | Browser-side PNG/PDF/ZIP rendering — the serverless fallback path |
| `mongodb.js` | Cached global Mongoose connection (serverless-safe) |
| `auth.js` | `authOptions` — credentials provider, bcrypt, JWT callbacks injecting `id` + `role` |
| `crypto.js` | AES-256-GCM encrypt/decrypt for stored Gmail app passwords |
| `safeFetch.js` | **SSRF-guarded** fetch for admin-supplied font URLs |
| `sanitizeSvg.js` | Strips `<script>`, `<foreignObject>`, `on*=`, `javascript:` from uploaded SVG |
| `sanitizeFontName.js` | Reduces a font name to a safe CSS identifier |
| `dateFormat.js` | **UTC-only** date formatting/parsing + `DATE_FORMAT_OPTIONS` |
| `cache.js` | In-process TTL+LRU cache for rendered certificates |
| `rateLimit.js` | In-process sliding-window IP limiter |
| `log.js` | `logActivity()` → `ActivityLog` |
| `verificationThemes.js` | 10 verification-page themes (label, headline, icon, gradient) |
| `types.ts` | **All shared TypeScript interfaces** — the single source of truth |
| `changelog-data.ts` | `CURRENT_VERSION` + 9 releases / 43 items |

---

## Project-specific conventions

Full detail in [coding-guidelines.md](coding-guidelines.md). The ones that bite hardest:

1. **`params` is a Promise.** Next 16: `const { id } = await params;` in every dynamic route. Public routes use `await Promise.resolve(params)` because they're also invoked directly by their query-param alias routes.
2. **Every API mutation follows the same spine:** `getServerSession(authOptions)` → 401 → load resource → 404 → `canAccess()` → 403 → `connectDB()` → act → `logActivity()` → `NextResponse.json(...)`.
3. **Ownership is enforced by an explicit `canAccess(session, project)` helper**, redefined per route file. Superadmins pass everything; sub-admins must match `createdBy`. **Five routes are currently missing this check** — see Known Issues.
4. **Errors are `{ error: string }` with an HTTP status** — except the two public verification endpoints, which return `{ valid: boolean, message?: string }`.
5. **PATCH bodies go through an allowlist.** `ALLOWED_UPDATE_FIELDS` in `app/api/projects/[id]/route.js` blocks mass assignment. Extend the array to add a field — never pass the raw body through.
6. **Dates are UTC, always.** Never `new Date(y, m, d)`, `.getDate()`, or `.getFullYear()`. Use `Date.UTC()` and `getUTC*` exclusively, via `lib/dateFormat.js`. There is a documented production bug behind this rule (a date rendered "23" locally and "22" on Vercel).
7. **Field coordinates are percentages** (`x`, `y` ∈ 0–100), never pixels — so a template renders identically at any zoom or paper size.
8. **Mongoose models use the hot-reload guard:** `mongoose.models.X || mongoose.model("X", Schema)`.
9. **Secrets never round-trip.** `.select("-emailConfig.gmailAppPasswordEncrypted")` on every project read; `.select("-passwordHash")` on every admin read.
10. **`WhoWeAreSection` is deliberately rendered twice** — inline on `/` for scroll-to-anchor, and as the body of `/about` for a shareable URL with its own SEO metadata. This is intentional; don't "fix" it.

---

## Known issues — read before touching related code

Verified in [docs/audit.md](docs/audit.md). Do not re-derive these.

### Bugs

- **`xs:` breakpoint does not exist.** Tailwind v4 has no `xs`, and none is defined in `@theme`. `hidden xs:flex` therefore collapses to plain `hidden` at every width. Two elements never render at any screen size: the homepage's LinkedIn/GitHub icons ([app/page.tsx:138](app/page.tsx#L138)) and the admin "Admin" badge ([app/admin/layout.tsx:87](app/admin/layout.tsx#L87)). Fix: add `--breakpoint-xs: 24rem;` to `@theme`, or switch to `sm:`.
- **Five project-scoped API routes authenticate but never check ownership** — `participants` (POST), `participants/[pid]` (PATCH/DELETE), `import`, `export`, `certificates/zip`. Any logged-in sub-admin with a project id can read or mutate another admin's data; `export` leaks a full participant roster with emails. The `canAccess` guard already exists in sibling routes.
- **Two of three configurable permissions are unenforced.** The Team UI persists `canManageParticipants` and `canManageTemplates`; only `canDeleteProjects` is ever read.
- **`NEXTAUTH_SECRET` has a hardcoded fallback** in [lib/auth.js:63](lib/auth.js#L63), whose literal value is also the committed `.env.example` value. A deploy missing the env var silently signs JWTs with a public constant and raises no error.

### Constraints

- **`lib/cache.js` and `lib/rateLimit.js` are in-process `Map`s.** On Vercel each serverless instance has its own memory, so the 180 req/min limit is *per instance* and the cache only hits on a warm instance. Both are correct for a single long-lived server; neither matches the deployment target. Don't assume either is globally effective.
- **`xlsx@0.18.5` has two unfixable high-severity advisories** (prototype pollution, ReDoS). SheetJS stopped publishing to the npm registry at this version, so no bump exists — `npm audit` reports "No fix available." Mitigating: spreadsheet upload is authenticated-admin-only, not public. **Decision: leave as-is for now.** Do not swap the library as part of unrelated work.
- **NextAuth v4 is the legacy line.** An Auth.js v5 migration is **planned but not scheduled** — it would touch all 14 authenticated routes. Until then, v4's `getServerSession(authOptions)` is the convention. Write new routes in the v4 style; don't mix in v5 patterns.
- **`npm audit` reports 7 vulnerabilities** (1 critical, 5 high). The critical NextAuth advisory is OAuth-specific and **not reachable** — this app uses only the credentials provider.

### Dead code (don't extend it, don't be confused by it)

`public/loading.gif` (801 KB, zero references) · three byte-identical 470 KB copies of the logo (`public/favicon.ico`, `app/favicon.ico`, `app/icon.png` — both `.ico` files are actually PNGs) · `ActivityLog` written by 15 call sites but **never read** by any route or page · `downloadCertificateHD` · `toDateInputValue` · `btn-secondary` / `btn-ghost` utilities · `DELETE /api/text-templates/[id]` and `PATCH /api/projects/[id]/participants/[pid]` (no callers) · `--color-primary-dark`, `--color-primary-light`, `--color-indigo`, `--color-purple-light` (zero usages).

Also: the header comment in `app/api/projects/[id]/certificates/zip/route.js` claims *"There's no PDF option anywhere in this app"* — **false since v1.2.5**. And `models/Project.js` points at `MAX_CUSTOM_FONTS in app/api/projects/[id]/route.js`; it actually lives in `.../fonts/route.js`.

---

## Working notes

- **Don't grow `app/admin/projects/[id]/page.tsx`.** It's already 2,207 lines with ~40 `useState` hooks. New studio functionality should be extracted into `components/`, not appended.
- **Public page chrome is hand-copied** across `/`, `/about`, `/login`, `/verify/[serial]`. It has already drifted — `/about`'s footer GitHub link points somewhere different from every other page. Editing one header/footer means checking all four, or extracting a shared component.
- **The comment quality in this repo is unusually high** — `lib/safeFetch.js`, `lib/dateFormat.js`, `lib/crypto.js`, and `lib/sanitizeSvg.js` each explain the specific attack or production bug they address. Preserve those comments; match that standard when adding security- or timezone-sensitive code.
- **Two version numbers exist and neither references the other:** `package.json` says `0.2.0`, `lib/changelog-data.ts` says `v1.2.5`. The changelog is the user-facing one.
- **`README.md` is a single empty byte.** `.env.example` is currently the only onboarding doc besides these files.
