# VeriMoo — Certificate Management & Verification (starter)

VeriMoo lets organizations generate and verify certificates for webinars, workshops,
training, courses, internships, awards, and more. This is a working starter build —
functional end-to-end, with clear notes on what's genuinely finished vs. scaffolded for
you to extend.

## What's in here

- **Home** (`/`) — public serial-number lookup, SVG/PDF download, invalid-serial message,
  with a real loading state (not just a spinner) while the certificate renders
- **Login** (`/login`) — admin auth via NextAuth (credentials provider)
- **Admin Dashboard** (`/admin`) — create/delete projects (with a manual starting serial
  number + prefix, and an optional logo), see who created each project ("Me" or their
  name/email)
- **Template editor** — upload a certificate template (SVG or raster image), visually
  drag-position fields in every direction (title/heading, name, serial, course, date, QR,
  logo, free-form custom text), with **Bold/Italic/Underline**, font family, and letter
  spacing on every text field; a live preview at the exact font size/color/style/position
  the export will use; choose a standard paper size (A4/A3/A5/Letter/Legal/Certificate)
  with Portrait/Landscape orientation
- **Participants** — add manually (native date picker, optional manual serial number) or
  import via Excel/CSV with an in-UI format guide, a post-import summary, a skipped-rows
  table, and a downloadable CSV error report; export the list to Excel; bulk-download
  every certificate as a ZIP; all with real loading/progress feedback, not silent waits
- **Team** (`/admin/team`, superadmin only) — create sub-admins, cap how many projects
  each one can create, and toggle permissions
- **Predefined text blocks** — reusable wording (e.g. "Certificate of Appreciation")
  saved once and inserted into any project's title/heading fields with one click, plus
  optional AI-drafted suggestions via the Gemini API
- **Premium verification page** (`/verify/[serial]`) — themed per certificate type
  (Course Completion, Webinar, Appreciation, Attendance, Workshop, Training, Achievement,
  Participation, Internship, Excellence Award), with a transparency-safe logo, a
  configurable footer, and creator attribution
- **Email certificates via Gmail** — a real SMTP backend (not a UI mockup) that sends
  each participant their certificate PDF from the project owner's Gmail address, using an
  encrypted app password; gated behind a per-project toggle and only enabled once
  credentials are set
- **Per-project feature toggles** — eleven optional features (email, verification footer,
  themed verification, logo display, creator info, font customization, org info on the
  verify page, the public verification page itself, QR codes, custom branding, strict
  import validation, loading animations) can each be switched on/off per project without
  touching any other project
- **Custom fonts per project** — upload up to 3 font files (woff/woff2/ttf/otf), or embed
  one directly from a URL (a direct font file link, or a Google-Fonts-style CSS link,
  auto-resolved to the actual font file); available immediately in the field editor's
  font picker, embedded into every generated certificate
- **Light/Dark/System theme** — a sliding segmented switch, persisted, no flash on
  reload, follows OS changes live
- **Framer Motion** throughout — page transitions, modals, the field editor list, button
  taps, and result reveals

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript 6 (strict) · Tailwind CSS v4 ·
Framer Motion · lucide-react · NextAuth v4 · MongoDB/Mongoose 9 · SheetJS (xlsx) ·
QRCode + sharp + pdf-lib for certificate rendering · Gemini API (optional) · Nodemailer
(Gmail SMTP) · ESLint 9 (flat config).

**Requires Node.js >= 20.19.0.**

## Setup

```bash
npm install
cp .env.example .env.local
# edit .env.local — MongoDB URI, NEXTAUTH_SECRET, admin credentials, ENCRYPTION_KEY
# (GEMINI_API_KEY is optional; email sending needs no server-level secret, just a
#  Gmail app password entered per-project in Settings)

npm run seed:admin   # creates the first admin login — always a superadmin
npm run dev
```

```bash
npm run build      # production build (Turbopack)
npm run lint        # ESLint (flat config)
npm run lint:fix    # ESLint with autofix
npm run typecheck   # tsc --noEmit, strict mode
```

## Fixes from this round of feedback

**Certificate views were slow/could hang.** Two real, concrete causes were fixed:
1. Every single view previously re-fetched the *entire* Project document — including any
   embedded base64 template image, sometimes megabytes — and rebuilt the SVG from scratch,
   every time, even for the same certificate viewed twice in a row. Fixed with an
   in-process cache (`lib/cache.js`) keyed by both documents' `updatedAt`, so it's
   automatically invalidated the moment either changes, no manual cache-busting needed.
   Also added `Cache-Control` headers and excluded heavy template fields from the project
   *list* query (the dashboard grid never needed them).
2. PDF generation previously rasterized at a 1:1 pixel ratio (effectively ~96 DPI — soft
   and slow to zoom/print) with no visible progress feedback, which read as "hanging" even
   when it was just working. Now high-resolution (see below) with a real progress
   indicator on every long operation (import, PDF/ZIP export, certificate rendering).

**PDF titles/names not showing at all (SVG fine, PDF blank text).** Root cause: PDF
generation rasterizes server-side via `sharp`/librsvg, which — unlike a browser —
depends entirely on fonts installed on the *server's OS*. Many deployment targets
(serverless platforms like Vercel especially, and minimal Docker images) ship with zero
system fonts, so text silently renders as nothing while shapes/QR codes/images (which
don't need fonts) render fine — exactly this symptom. Fixed by embedding a real,
redistributable font (Inter, SIL OFL-1.1 license) directly into every generated SVG as a
`@font-face { src: url(data:...) }` rule (`assets/fonts/`, `lib/certificate.js`), used as
a guaranteed fallback after whatever font the field actually requests. Verified two ways:
rendering with a font-family name that cannot exist on any system (proving the embedded
data, not a system font, was used), and confirming text pixels are present in the exact
region a title/name should occupy. The same font is also declared via `@font-face` in
`app/globals.css` under the identical name, so picking "Inter (recommended)" in the field
editor now looks pixel-identical between the live preview and the exported certificate —
the two were previously rendered by two different renderers with no shared font
guarantee, which is *also* why fields could look "a little off" between preview and
output even beyond the baseline-vs-center issue below.

**Fields drifted out of sync between the editor preview and the real certificate ("location
not synchronized").** Root cause: SVG text is anchored at its *baseline* by default, while
the editor preview CSS vertically centers each field on its drag point — so text always
rendered lower in the actual output than where it was dragged in the preview. Fixed with
`dominant-baseline="middle"` on generated `<text>` elements, matching the preview exactly.
Verified with a standalone script asserting the attribute is present in generated SVG.

**PDF quality.** Previously ~96 DPI-equivalent (screen quality, soft when printed). Now
renders at 3× resolution (~288 effective PPI — genuinely print-quality) by scaling the SVG's
declared width/height while keeping its `viewBox` unchanged, which makes the renderer
redraw all vector content — text, QR modules, embedded logos — crisply at that resolution,
rather than upscaling a blurry raster. Also fixed a real page-sizing bug: PDF pages were
previously created using raw pixel counts as PDF *points* (1/72in), making every exported
page ~33% larger than the selected paper size; now correctly converted (`px × 0.75`).
Both fixes verified with a standalone script asserting exact output dimensions.

**Certificate date off by one day in production (correct locally, wrong on Vercel).** Root
cause: dates were parsed/stored via local-timezone-sensitive methods (`new Date(y, m, d)`,
or an unzoned date string), then read back with local-timezone accessors
(`.getDate()`/`.getMonth()`/`.getFullYear()`). A calendar date like a certificate's issue
date has no time-of-day component, so it needs to be timezone-*independent* — but this
approach meant the *same stored value* could report a different calendar day depending on
which timezone the reading process happened to run in. A local dev machine is commonly not
UTC; Vercel's serverless functions always run in UTC — so a date entered as "23" could be
stored as (e.g.) `...T19:00:00Z` the previous day, which reads back correctly as "23" on a
UTC+5 dev machine but as "22" on Vercel. Fixed by using UTC construction and UTC accessors
exclusively, everywhere a date is parsed, stored, or formatted (`lib/dateFormat.js`, the
Excel import's date coercion). Verified by running the exact parse→store→format round trip
under three different simulated server timezones (`TZ=Asia/Karachi`, `TZ=UTC`,
`TZ=America/Los_Angeles`) and confirming identical output in all three — proving the fix is
genuinely timezone-independent rather than happening to work in whichever timezone this was
tested in.

## Dates: DD-MM-YYYY by default, stored as real dates

`Participant.date` is a proper Mongoose `Date`. Entry always goes through
`<input type="date">`, so there's no input ambiguity. **Display format is a per-project
setting** (Settings tab), with presets including `DD-MM-YYYY`, `DD-MMM-YYYY`
(12-Aug-2026), `MMMM D, YYYY`, and more — used consistently on certificates, the
verification page, and Excel exports (`lib/dateFormat.js`).

Excel/CSV import guards against the classic "Excel serial number" bug (a date column
showing `46088` instead of a date) three ways: `cellDates: true` for properly-formatted
columns, explicit parsing of manually-typed `DD-MM-YYYY`/`DD/MM/YYYY` strings, and a
fallback conversion via `XLSX.SSF.parse_date_code` for a bare unformatted serial. All
three verified with a standalone script.

## Security

- **Uploaded SVG templates are sanitized** (`lib/sanitizeSvg.js`) — strips `<script>`,
  `on*` event-handler attributes, and `javascript:` URIs before storage, and again
  defensively at generation time. Verified with a script asserting all three vectors are
  stripped. This closes a real stored-XSS risk: uploaded SVGs are rendered via
  `dangerouslySetInnerHTML` in the editor preview.
- **Mass-assignment guarded** — `PATCH /api/projects/[id]` only accepts an explicit
  allowlist of fields, so a crafted request can't overwrite `createdBy`, tamper with
  `_id`, etc.
- **Gmail app passwords are encrypted at rest** (AES-256-GCM, `lib/crypto.js`) — never
  stored or returned in plaintext. Verified with a round-trip encrypt/decrypt test.
- **Rate limiting** on the public, unauthenticated `verify` and `certificate` endpoints
  (`lib/rateLimit.js`) — prevents serial-number enumeration and brute-force abuse.
  Verified with a standalone test.
- **File upload validation** — 5MB client-side cap and MIME-type checks on template/logo
  uploads, plus a 2MB server-side cap on stored SVG markup.
- **Ownership + permission checks** on every project route — sub-admins can only reach
  their own projects, and project deletion respects the `canDeleteProjects` permission.
- **Basic input validation** — string length caps and numeric clamping on project
  creation/update.
- **SSRF protection on the "embed font from link" feature** (`lib/safeFetch.js`) — an
  admin-supplied URL means the *server* makes an outbound request to wherever it points,
  which without guardrails is a classic vector for reaching internal services or cloud
  metadata endpoints (e.g. `169.254.169.254`) using the server as a proxy. Every fetch
  (including the second hop when a URL turns out to be a Google-Fonts-style CSS file
  pointing at a separate font file) resolves the hostname and rejects private/reserved/
  loopback/link-local IP ranges — checked against *every* resolved address, not just the
  first, and re-checked after redirects — plus enforces a size cap and timeout. Verified
  against the actual SSRF targets (`169.254.169.254`, `127.0.0.1`, `localhost`, private
  ranges, non-http schemes) and confirmed a real public URL still succeeds.
- **Custom font uploads/embeds are validated** — 3MB size cap, MIME-type allowlist, capped
  at 3 fonts per project (enforced server-side, not just hidden in the UI), and font names
  are sanitized to safe CSS identifiers before ever being used as a `font-family` value in
  a `<style>` block (both server-side generation and the client preview) — an unsanitized
  name would otherwise be a CSS/HTML injection vector. Verified against an actual injection
  payload.

**What this is *not***: a full security audit. CSRF relies on NextAuth's same-site
session cookies (not a dedicated token scheme); there's no dependency-vulnerability
scanning wired into CI; the rate limiter is in-process (per server instance, not
shared/Redis-backed — fine for one server, not for a multi-instance deployment behind a
load balancer without changes). Said plainly rather than implied as "done."

## Performance

- In-process certificate cache (above) — the main fix for slow/repeated views.
- Project list query excludes heavy template fields and populates creator info in one
  query instead of N+1.
- `Project.createdBy` is indexed (used by the Team page's per-admin project counts and
  the sub-admin project-ownership filter).
- QR/logo/text field resolution runs in parallel (`Promise.all`) instead of sequentially.
- **Not done**: participant table pagination (currently renders the full list — fine for
  hundreds of rows, would want windowing for thousands), a shared/distributed cache for
  multi-instance deployments, and bundle-size trimming beyond what's already reasonably
  lean. Noted honestly rather than left silent.

## Custom fonts (Option B: full per-project upload/embed)

Each project's Settings tab has a Fonts section — upload up to 3 font files
(`.woff`/`.woff2`/`.ttf`/`.otf`), or embed one directly from a URL: either a direct link
to a font file, or a Google-Fonts-style CSS link (`fonts.googleapis.com/css2?family=...`),
which is fetched and parsed for the actual font file URL, then that's fetched and embedded
too. Either way, the font is stored as a permanent base64 copy on the project — **not** a
live link — so certificates keep rendering correctly even if the original source URL later
changes or goes offline. Fonts appear immediately in the field editor's font picker under
"This project's fonts," and in the same generation pipeline as the always-available
built-in Inter fallback (`lib/certificate.js`).

The upload path and the link-embed path converge on the same validation before storage:
size cap, MIME-type check, and the SSRF guard (link path only, see Security above) — so
there's one consistent set of guarantees regardless of how the font was added.

## Premium verification page & certificate types

One well-built, responsive, themed layout (`app/verify/[serial]/page.tsx`) rather than
ten disconnected one-off designs — each of the ten certificate types
(`lib/verificationThemes.js`) gets its own headline wording, icon, and gradient color
accent, selected in Project Settings. A transparent PNG logo renders with no background
box behind it (no `preserveAspectRatio="none"` stretching either — logos keep their own
proportions). The footer (company name / contact email / "Powered by VeriMoo") and
creator attribution are both optional per project.

## Email certificates (Gmail)

`app/api/projects/[id]/send-email/route.js` is a real, working backend — not a UI-only
mockup — using Nodemailer over Gmail SMTP with an
[app password](https://support.google.com/accounts/answer/185833) (not the account's
normal password). Set it up in a project's Settings tab: enter the Gmail address and app
password, toggle "Enable emailing certificates," then click Send. Each participant with
an email address gets their certificate generated fresh and attached as a PDF; their
status flips to `emailed` on success.

**This wasn't live-tested against real Gmail SMTP** in this sandbox (no outbound network
access here) — the Nodemailer/Gmail integration follows the standard, widely-used
`service: "gmail"` transport configuration exactly, and the encryption round-trip and
route logic were verified independently, but you should send one real test email before
relying on it for participants.

## Team / sub-admins & permissions

Superadmins create sub-admins under `/admin/team`, each with a project cap
(`Admin.maxProjects`, enforced) and permission checkboxes (`Admin.permissions`).
**Only `canDeleteProjects` is actually enforced today** — `canManageParticipants` and
`canManageTemplates` are stored and shown in the UI so the shape is in place, but no
route checks them yet.

## Project structure

```
app/
  page.tsx                       Home (public lookup)
  theme-provider.tsx              Light/Dark/System state
  login/page.tsx                  Admin login
  verify/[serial]/page.tsx        Premium, themed verification page
  admin/
    layout.tsx                    Auth-guarded shell + nav + theme toggle
    page.tsx                      Project list/create/delete, creator info
    team/page.tsx                 Sub-admin management (superadmin only)
    projects/[id]/page.tsx        Template editor, fields, participants, settings
  api/
    admins/, text-templates/, ai/suggest-text/
    projects/route.js             List/create (project-cap enforcement, field projection)
    projects/[id]/route.js        Get/update/delete (ownership, mass-assignment guard,
                                   SVG sanitization, email-password encryption)
    projects/[id]/participants/, import/, export/, certificates/zip/, send-email/
    certificate/[serial]/route.js  SVG/PDF generation (cached, rate-limited)
    verify/[serial]/route.js       Authenticity check (rate-limited, settings-aware)
lib/
  certificate.js       SVG/PDF generation engine (high-res, embedded-font, location-sync fix)
  dateFormat.js         Shared date formatting/parsing
  sanitizeSvg.js         XSS-stripping for uploaded templates
  cache.js, rateLimit.js, crypto.js
  verificationThemes.js  Per-certificate-type theming
  mongodb.js, auth.js, log.js, types.ts
components/
  ui.tsx, modal.tsx, theme-toggle.tsx, progress-bar.tsx
models/  Admin, Project, Participant, TextTemplate, ActivityLog
types/next-auth.d.ts   Session/JWT type augmentation
assets/fonts/    Inter woff files (SIL OFL-1.1), embedded server-side into every
                 generated certificate — see "Fixes from this round" above
public/fonts/    Same font files, served to the browser so the admin UI's font
                 preview matches the embedded server-side font exactly
```

## What's intentionally simple (extend from here)

- Field editor still has no snapping/alignment guides, multi-select, or undo.
- Two of three sub-admin permissions aren't enforced yet (see above).
- Analytics/activity-log UI — the model and logging calls exist, no dashboard page yet.
- Backup/restore isn't built — straightforward with `mongodump`/`mongorestore` or a JSON
  export route using the existing models.
- Bulk ZIP download buffers the whole archive in memory — fine for typical batch sizes,
  switch to true streaming for very large projects.
- Vector SVG templates don't re-scale as intelligently as raster ones across a drastic
  paper-size change after upload.
- AI suggestions and Gmail sending weren't live-tested against the real external services
  in this sandbox (no outbound network access here) — smoke-test both with real
  credentials before relying on them.
- `loadingAnimations` per-project toggle is wired for the import progress indicator; it
  doesn't yet gate every Framer Motion animation throughout the admin UI.

## Modernization notes

Upgraded end-to-end from Next 14/React 18/Tailwind v3 to Next 16/React 19/Tailwind v4,
strict TypeScript, flat ESLint config, Mongoose 9.

- **ESLint pinned to 9.x, not 10.x** — `eslint-config-next`'s bundled `eslint-plugin-react`
  currently throws under ESLint 10's rule-context API.
- **`archiver@8.0.0`** exports classes directly (`import { ZipArchive } from "archiver"`)
  instead of the old factory function.
- **`nodemailer` pinned to the 7.x line**, not the newer 9.x — `next-auth@4.24.14`
  declares a peer dependency on `nodemailer@^7.0.7` (for its own optional email-provider
  feature, unrelated to this project's Gmail sending); 7.x satisfies that cleanly without
  `--legacy-peer-deps`.
#   v e r i m o o  
 