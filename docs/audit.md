# VeriMoo — Codebase Audit

**Audited:** 2026-08-31 · **Branch:** `main` @ `e1ba930` (clean) · **Scope:** entire repo, config included
**Verification performed:** `tsc --noEmit` (pass), `eslint` (pass, 0 findings), `next build` (pass, 29 routes), `npm audit`, `npm outdated`, runtime check of `archiver`'s export shape, and a CSS-output check of the built bundle.

---

## 0. Scope note — read this first

The task brief described this as a portfolio-style site and asked for an inventory of "bio / experience / project copy." This repo is **not a portfolio**. It is **VeriMoo**, a full-stack multi-tenant SaaS application for issuing, managing, and publicly verifying digital certificates — MongoDB-backed, with an authenticated admin area, a drag-and-drop certificate design studio, Excel roster import, bulk PNG/PDF export, Gmail dispatch, and a public verification portal.

There *is* marketing/bio copy in it — an "Ahsan & My Team" agency section — but it is one section of a much larger product, not the point of the site. Section 4 inventories that copy verbatim as asked, and also inventories the product/UI copy, since a revamp of this codebase will touch far more of the latter. Everything else in this audit is scoped to the application as it actually exists.

---

## 1. Framework & library versions

`package.json` declares `"name": "cert-system"`, `"version": "0.2.0"`, `"private": true`, and `engines.node: ">=20.19.0"`.

### Core stack

| Concern | Choice | Installed | Latest | Status |
|---|---|---|---|---|
| Framework | Next.js (App Router) | 16.2.10 | 16.3.3 | Behind; the gap carries 9 advisories |
| UI runtime | React / React DOM | 19.2.7 | 19.2.8 | Current enough |
| Language | TypeScript | 6.0.3 | 7.0.2 | One major behind |
| Styling | Tailwind CSS v4 (CSS-first, `@theme`) | 4.3.2 | 4.3.3 | Current |
| PostCSS plugin | `@tailwindcss/postcss` | 4.3.2 | 4.3.3 | Current |
| Auth | NextAuth v4 (credentials + JWT) | 4.24.14 | 4.24.15 | **Legacy major line** — see below |
| Database | MongoDB via Mongoose | 9.7.3 | 9.9.4 | Current major |
| Animation | `framer-motion` | 12.42.2 | 13.1.1 | One major behind; package renamed to `motion` |
| Icons | `lucide-react` | 1.24.0 | 1.37.0 | Behind |
| Linting | ESLint + `eslint-config-next` | 9.39.4 | 10.9.1 | One major behind |

### Certificate pipeline & I/O

| Purpose | Package | Installed |
|---|---|---|
| SVG → PNG raster (primary, Rust) | `@resvg/resvg-js` | ^2.6.2 |
| SVG → PNG raster (fallback) + template image compression | `sharp` | ^0.35.3 |
| PDF assembly (server **and** browser) | `pdf-lib` | ^1.17.1 |
| QR codes | `qrcode` | 1.5.4 |
| ZIP (server bulk export) | `archiver` | 8.0.0 |
| ZIP (browser bulk export) | `jszip` | ^3.10.1 |
| Excel/CSV import & export | `xlsx` | 0.18.5 |
| Password hashing | `bcryptjs` | 3.0.3 |
| SMTP | `nodemailer` | 7.0.13 |
| Class merging | `clsx` | 2.1.1 |

### Deployment target

**Vercel serverless**, stated explicitly and consistently: `.env.example` gives Vercel-specific setup instructions, `next.config.js` sets `serverExternalPackages` for the four native modules and `outputFileTracingIncludes` to ship `assets/**` + `public/**` into `/api/**` bundles, `package.json` pins `optionalDependencies` for `@img/sharp-linux-x64` and `@img/sharp-libvips-linux-x64`, and the changelog names "Vercel 4.5MB Serverless Limit Fix" and "Vercel Serverless Optimization" as shipped work. Two code comments in `lib/dateFormat.js` and `app/api/projects/[id]/import/route.js` document a real production bug caused by Vercel's always-UTC runtime differing from a local dev machine's timezone.

### Outdated / deprecated — the ones that matter

1. **NextAuth v4 is the legacy line.** The project is on `next-auth@4.24.14`. The successor is Auth.js v5 (`next-auth@5`), which is a different, non-drop-in API (`auth()` instead of `getServerSession(authOptions)`, a root `auth.ts`, different route handler shape). Every one of the 14 authenticated API routes calls `getServerSession(authOptions)`, so this is the single largest migration cost in the dependency tree. **This is a revamp-defining decision and should be made deliberately, not drifted into.**
2. **`xlsx@0.18.5` has two unfixable high-severity advisories** (prototype pollution `GHSA-4r6h-8v6p-xvw6`, ReDoS `GHSA-5pgg-2g8v-p4x9`) and `npm audit` reports **"No fix available."** This is not a version-bump problem: SheetJS stopped publishing to the npm registry at 0.18.5 and moved distribution to their own CDN, so the registry package is permanently frozen at a vulnerable version. Both advisories are reachable here — admin-uploaded spreadsheets are parsed by `XLSX.read` in the import route. Real options are: install from SheetJS's CDN, or swap to a maintained parser (`exceljs`, `papaparse` for the CSV path).
3. **`framer-motion` was renamed to `motion`** at v12/13. Staying on `framer-motion@12` works, but the package is on its way to being a legacy alias.
4. `next`, `nodemailer`, `sharp`, `postcss`, `eslint`, `typescript`, `lucide-react` all have newer releases; none are deprecated.

### `npm audit` summary — 7 vulnerabilities (1 critical, 5 high, 1 moderate)

| Package | Severity | Fixable by upgrade? |
|---|---|---|
| `next-auth` ≤5.0.0-beta.31 | **critical** (3 advisories: homoglyph email bypass, `getToken()` uncaught exception, unbound OAuth check cookies) | Partially — 4.24.15 patches some |
| `next` (9 advisories: SSRF ×2, cache confusion ×2, DoS ×2, middleware bypass, Server Function disclosure) | high | Yes → 16.3.3 |
| `nodemailer` ≤9.0.0 (3 SMTP/CRLF command-injection advisories) | high | Yes → 9.x (major) |
| `sharp` <0.35.0 (4 libvips CVEs, transitive under `next`) | high | Yes |
| `xlsx` | high | **No** |
| `postcss` (transitive) | — | Yes |
| `uuid` <11.1.1 (transitive under `next-auth`) | moderate | Yes |

Mitigating context on the OAuth-related NextAuth advisories: this app uses **only** the credentials provider, so the OAuth state/nonce/PKCE cookie-binding issue is not reachable. The homoglyph and `getToken()` issues are not OAuth-specific.

---

## 2. Route inventory

29 routes build successfully. `○` = prerendered static, `ƒ` = server-rendered on demand.

### Pages (7)

| Route | File | Rendering | What it contains today |
|---|---|---|---|
| `/` | [app/page.tsx](app/page.tsx) (471 ln) | `○` client | The public verification portal. Sticky header (logo, "Who We Are" `#about` anchor, "Admin Login", LinkedIn/GitHub icons, theme toggle); animated hero with a `ShieldCheck` badge, headline, subhead; a serial-number search form; three animated result states — loading (`ProgressBar`), not-found (red card), found (metadata grid for course/date/organization, inline SVG certificate preview with an `<img>` fallback + retry button, Download PNG / Download PDF / Verification Page actions). Ends with `<WhoWeAreSection />` and a footer. |
| `/about` | [app/about/page.tsx](app/about/page.tsx) (106 ln) | `○` **server** | The only server component page in the app. Exports `metadata`. Header + `<WhoWeAreSection />` + footer — **nothing else.** The entire body is the same component `/` already renders. |
| `/login` | [app/login/page.tsx](app/login/page.tsx) (176 ln) | `○` client | Admin sign-in. Logo card, email + password fields (password visibility toggle), inline error, `signIn("credentials", { redirect: false })` → `router.push("/admin")`. Back-link, theme toggle, footer. |
| `/verify/[serial]` | [app/verify/[serial]/page.tsx](app/verify/[serial]/page.tsx) (381 ln) | `ƒ` client | Public per-certificate verification page. Fetches on mount with a query-param fallback. Valid → theme-driven gradient banner (per `VERIFICATION_THEMES`: label, headline, emoji icon, 2-stop gradient), org logo, holder name, "Officially Verified & Authentic" badge, metadata cards (date, serial, organization, program, credential manager), a collapsible certificate preview, PNG/PDF/Search-another actions, optional org footer. Invalid → "Certificate Record Not Found". |
| `/admin` | [app/admin/page.tsx](app/admin/page.tsx) (567 ln) | `○` client | Project dashboard. Header + "New Project" button; a `md:hidden` "Desktop / Laptop Recommended" notice; 3 metric cards (Total Projects, Certificates Issued, and — superadmin only — a Team Members card linking to `/admin/team`; non-superadmins get a static "System Active" card); a search box filtering by name/org/prefix; a responsive project card grid (logo or fallback icon, name, org, description, serial prefix + issued count, Manage link, delete button); loading / empty / no-match states; a delete-confirmation modal and a create-project modal (name, org, serial prefix, starting number, live serial-format preview, logo upload, description). |
| `/admin/team` | [app/admin/team/page.tsx](app/admin/team/page.tsx) (781 ln) | `○` client | Superadmin team management. 3 metric cards (Total Team Members, Simple Users, Super Admins); a member list (avatar or crown, name, role badge, email, projects-created count, and for Simple Users their project limit + per-permission check/cross icons); "Configure Role" and remove buttons. Three modals: **Add** (3-step form — role picker cards, credentials, then role-specific limits/permissions), **Configure Role** (same picker + limits, no credential fields), **Remove** confirmation. |
| `/admin/projects/[id]` | [app/admin/projects/[id]/page.tsx](app/admin/projects/[id]/page.tsx) (**2,207 ln**) | `ƒ` client | The Certificate Studio — by far the largest file. See §2.1. |
| — | [app/admin/layout.tsx](app/admin/layout.tsx) (319 ln) | client | Admin shell: redirects unauthenticated users to `/login`, loading state, sticky header with brand + active-route nav pills (Team is superadmin-only), a user pill (gradient initials avatar, email, role badge), sign-out, theme toggle, a mobile hamburger drawer, animated `<main>` keyed on pathname, and a footer. |
| — | [app/layout.tsx](app/layout.tsx) (47 ln) | server | Root layout. Loads Inter via `next/font/google` (7 subsets, weights 300–800), sets metadata + icons, injects `themeInitScript` in `<head>` before paint, wraps in `Providers` → `ThemeProvider`, and mounts `<ChangelogModal />` globally. |

#### 2.1 The Certificate Studio (`/admin/projects/[id]`)

One component, 2,207 lines, ~40 `useState` hooks, three tabs:

- **Design Studio** — a `md:hidden` "Canvas Locked on Mobile" advisory; paper size (Certificate / A4 / A3 / A5 / Letter / Legal / Custom) × orientation selectors that swap width/height from a portrait base table; SVG-or-image template upload (5MB cap); project logo upload; a zoom toolbar (Auto Fit / 50 / 75 / 100 / 125%) with live original-vs-display dimensions; a `ResizeObserver`-measured drag canvas rendering the template plus absolutely-positioned percentage-coordinate fields (text, QR placeholder, logo box) with selection rings and live X/Y readouts; and a right-hand Fields panel to add (+ Title / + Text / + QR Code / + Logo), relabel, restyle (font family, size, color, bold/italic/underline, alignment, letter-spacing), nudge by exact X/Y, quick-center, and remove fields. Heading fields get preset wording, saved shared templates, and an AI-suggest button.
- **Participants** — a manual add form (name, email, serial with auto-generated placeholder, course, date, plus one input per custom field); Excel/CSV import with an expandable expected-format table and a post-import result panel (imported/skipped counts, per-row skip reasons, downloadable error CSV); and a participants table (serial, name, course, date, status badge, Preview/Delete) with search, Export Excel, and "Download All (ZIP of PNGs)" — the latter rendering client-side via JSZip with a server endpoint as fallback.
- **Settings** — serial prefix + counter (with a live next-serial preview); date format; AI suggestions toggle; Custom Fonts (max 3, upload or embed-by-URL, live specimen preview, remove); verification page (theme, footer company name + contact email, preview link); Gmail sending (enable toggle, address, app password, send-to-all button with results); and an 11-checkbox "Optional features" grid.

Plus three modals: save-as-reusable-template, AI text suggestions, and a certificate preview (live SVG, PNG/PDF download, open-in-tab, verify-page link).

### API routes (22)

All are `ƒ`. Auth column: **public** = no session required; **session** = any logged-in admin; **owner** = ownership/role enforced.

| Route | Methods | Auth | Purpose |
|---|---|---|---|
| `/api/auth/[...nextauth]` | GET POST | public | NextAuth handler |
| `/api/health` | GET | **public** | Diagnostics: env-var presence booleans, Mongo connection + DB name, participant/project counts, `sharp` availability |
| `/api/verify/[serial]` | GET | public | Verification lookup. Rate-limited 180/min/IP, case-insensitive escaped-regex match, honours per-project display toggles |
| `/api/verify` | GET | public | Query-param alias — re-exports the above with `?serial=` |
| `/api/certificate/[serial]` | GET | public | Renders a certificate as `svg` (default), `png`, or `pdf`. Rate-limited 180/min/IP, three-tier cache, marks pending → issued |
| `/api/certificate` | GET | public | Query-param alias |
| `/api/projects` | GET POST | owner | List (scoped: sub-admins see own, superadmins see all; excludes heavy template blobs) / create (enforces `maxProjects`, seeds 5 default fields) |
| `/api/projects/[id]` | GET PATCH DELETE | owner | Read / update (allowlisted fields, encrypts Gmail password, sanitizes SVG) / delete (checks `canDeleteProjects`, cascades participants) |
| `/api/projects/[id]/participants` | POST | **session only** | Add participant (auto or manual serial, 409 on duplicate) |
| `/api/projects/[id]/participants/[pid]` | PATCH DELETE | **session only** | Update / delete participant |
| `/api/projects/[id]/import` | POST | **session only** | Excel/CSV roster import; unknown columns → `customFields`; strict/lenient per project setting |
| `/api/projects/[id]/export` | GET | **session only** | Participants → `.xlsx` |
| `/api/projects/[id]/certificates/zip` | GET | **session only** | Server-side bulk ZIP of 300 DPI PNGs (SVG per-file fallback) |
| `/api/projects/[id]/fonts` | POST DELETE | owner | Custom font upload or embed-by-URL (SSRF-guarded, magic-byte format detection, max 3) / remove |
| `/api/projects/[id]/send-email` | POST | owner | Gmail SMTP dispatch with PNG attachment; marks `emailed` |
| `/api/admins` | GET POST | superadmin | List team (excludes self, adds project counts) / create member |
| `/api/admins/[id]` | PATCH DELETE | superadmin | Update role/limits/permissions / remove |
| `/api/text-templates` | GET POST | session | Shared wording blocks — list / create |
| `/api/text-templates/[id]` | DELETE | creator-or-superadmin | Delete a shared wording block |
| `/api/ai/suggest-text` | POST | session | Gemini wording suggestions, gated on a per-admin lifetime token quota |

---

## 3. Component inventory

### Reusable (`components/`) — 5 files, 743 lines

| Component | File | Reuse | Notes |
|---|---|---|---|
| `Button` | [components/ui.tsx](components/ui.tsx) | Heavy | Wraps `motion.button`; 6 variants mapped to `@utility` classes; `loading` prop renders a spinner and disables |
| `Input` | ui.tsx | Heavy | Thin `<input>` + `clsx("input", className)` |
| `Card` | ui.tsx | Heavy | `<div>` with `card` + default `p-5 sm:p-6`; optional `hover` |
| `Badge` | ui.tsx | Heavy | 8 color schemes (gray/green/yellow/red/blue/indigo/purple/slate), optional status dot |
| `Modal` | [components/modal.tsx](components/modal.tsx) | 6 call sites | Escape-to-close, body-scroll lock, backdrop click-out, `role="dialog"`, configurable `maxWidth` |
| `ProgressBar` | [components/progress-bar.tsx](components/progress-bar.tsx) | 8 call sites | Indeterminate brand-gradient bar + label |
| `ThemeToggle` | [components/theme-toggle.tsx](components/theme-toggle.tsx) | 5 call sites | Segmented light/dark/system radiogroup with a `layoutId` sliding pill |
| `LinkedinIcon`, `GithubIcon` | who-we-are-section.tsx | 2 call sites | Inline SVG brand marks (lucide dropped brand icons) |

### One-off / single-use

| Component | File | Used by |
|---|---|---|
| `WhoWeAreSection` | [components/who-we-are-section.tsx](components/who-we-are-section.tsx) (428 ln) | `/` and `/about` — the only genuinely shared "content" component |
| `ChangelogModal` | [components/changelog-modal.tsx](components/changelog-modal.tsx) (367 ln) | Mounted once in the root layout; floating trigger + filterable/searchable release timeline |
| `ThemeProvider` / `useTheme` / `themeInitScript` | [app/theme-provider.tsx](app/theme-provider.tsx) | Root layout + `ThemeToggle` |
| `Providers` | [app/providers.tsx](app/providers.tsx) | Root layout — just `SessionProvider` |

### The structural gap

Only ~740 lines live in `components/`, against **~4,700 lines of page components**, and 2,207 of those sit in one file. Nothing has been extracted from the studio — the drag canvas, the field editor panel, the participants table, the import panel, the font manager, and the settings cards are all inline JSX in `app/admin/projects/[id]/page.tsx`. There is also **no shared page-chrome component**: the public header + footer are hand-copied across `/`, `/about`, `/login`, and `/verify/[serial]`, which is exactly why the GitHub URL drifted out of sync between them (§6).

---

## 4. Content inventory (verbatim)

### 4.1 "Who We Are" — the agency/bio copy

All from [components/who-we-are-section.tsx](components/who-we-are-section.tsx), rendered on both `/` and `/about`.

**Creator quote banner**
- Badge: `Engineering & Design Lead`
- Byline: `Created by Ahsan`
- Quote: `"Building next-generation digital trust, certificate verification systems, and scalable Agile technology solutions."`
- Attribution: `— Ahsan & My Team` · `Software Engineer & Technology Team`
- Buttons: `LinkedIn Profile` → `https://www.linkedin.com/in/ahsan-raza8hbb/` · `GitHub Repo` → `https://github.com/allen9650/verimoo`

**Section header**
- Eyebrow: `Who We Are`
- Heading: `Ahsan & My Team`
- Lead: `**Ahsan & My Team** operate with an **Agile-based technology mindset** providing innovative, reliable, secure, and scalable digital services to businesses and organizations.`
- Sub: `We help businesses transform ideas into practical technology solutions through an **iterative, collaborative, and customer-focused approach**. By applying Agile principles, we continuously communicate with clients, deliver solutions in manageable increments, gather feedback, and adapt to changing business and technology requirements.`

**Services** — heading `Our Services`, sub `End-to-end expertise spanning modern software engineering and digital transformation.`, badge `7 Core Disciplines`:

1. **Software Solutions** — `Custom software development and business applications designed around specific organizational requirements using an iterative Agile development approach.`
2. **IT Consultancy** — `Technology consulting, system planning, digital transformation, IT strategy, and solution architecture to help organizations make effective technology decisions.`
3. **Technical Support** — `Reliable technical assistance, troubleshooting, system maintenance, infrastructure support, and continuous IT support.`
4. **AI Solutions** — `Artificial intelligence, automation, intelligent systems, data-driven applications, machine learning solutions, and AI integration.`
5. **Web Solutions** — `Professional websites, web applications, e-commerce platforms, portals, dashboards, and custom web-based systems.`
6. **Mobile App Solutions** — `Development of modern Android and iOS applications with a focus on usability, performance, scalability, and continuous improvement.`
7. **Cloud Services** — `Cloud deployment, migration, infrastructure, hosting, backups, scalability, security, and cloud-based applications.`

**Agile Project Cycle** — badge `Continuous Refinement`, heading `Our Agile Project Cycle`, sub `This cycle allows us to continuously refine solutions based on real-world requirements and feedback.`

`01 Discover` — Understand requirements & scope · `02 Plan` — Sprint backlog & roadmap · `03 Design` — Architecture & user experience · `04 Develop` — Iterative clean-code building · `05 Test` — Automated & quality testing · `06 Review` — Stakeholder demo & feedback · `07 Improve` — Refinement & enhancement · `08 Deploy` — Continuous release & launch · `09 Support` — Ongoing maintenance & growth

**Agile Mindset** — badge `Core Operating Principles`, heading `Our Agile Mindset`, sub `We follow an Agile mindset to ensure that technology projects remain flexible, transparent, and aligned with business and user needs.`

- **Client Collaboration** — `Working closely with clients and stakeholders throughout the project lifecycle.`
- **Iterative Development** — `Building and improving solutions through manageable development cycles.`
- **Continuous Feedback** — `Regularly reviewing progress and incorporating user feedback.`
- **Adaptability** — `Responding effectively to changing requirements and emerging challenges.`
- **Continuous Improvement** — `Reviewing our processes and solutions to improve quality and efficiency.`
- **Frequent Delivery** — `Delivering usable features progressively rather than waiting until completion.`
- **Transparency** — `Maintaining clear communication about project progress, priorities, and deliverables.`

**Vision** — eyebrow `Strategic Direction`, heading `Our Vision` — `To become a trusted **Agile technology partner** that helps businesses and organizations transform their ideas into secure, innovative, and scalable digital solutions.`

**Mission** — eyebrow `Our Commitment`, heading `Our Mission` — `To deliver high-quality technology solutions through **Agile, customer-focused, and continuously improving processes**, combining innovation, reliability, security, and practical business value while providing continuous support throughout the technology lifecycle.`

**What We Do banner** — eyebrow `What We Do`, heading `Consult. Build. Integrate. Test. Improve. Support. Innovate.`, body `From an initial idea to a complete digital platform, **Ahsan & My Team** provide the technology expertise needed to **design, develop, deploy, and continuously improve** modern IT solutions.`, closing quote `"We believe successful technology is not simply delivered once — it evolves with the business."`

### 4.2 Product marketing copy

**Root metadata** ([app/layout.tsx](app/layout.tsx))
- Title: `VeriMoo — Certificate Management & Verification`
- Description: `Create, manage, and verify digital certificates for webinars, workshops, training, and more.`

**`/about` metadata** ([app/about/page.tsx](app/about/page.tsx))
- Title: `Who We Are — Ahsan & Team | VeriMoo Platform`
- Description: `Ahsan & My Team provide modern Agile technology solutions, digital trust, and certificate verification systems.`

**Home hero** ([app/page.tsx](app/page.tsx))
- Badge: `Digital Certificate Verification System`
- H1: `Verify Any Certificate Instantly`
- Sub: `Enter the unique certificate serial number below to verify authenticity and download official high-resolution credentials.`
- Input placeholder: `e.g. CERT-00001 or 4324-ABCD-1234` · Button: `Verify Certificate` / `Verifying...`
- Loading: `Looking up certificate in secure registry...` + `Validating cryptographic signatures & issuer credentials...`
- Not found: `Certificate Not Found` — `No certificate matching serial number "{serial}" could be verified. Please double-check the code and try again.`
- Found: `Verified & Authentic` · `Search another` · labels `Course / Program`, `Date Issued`, `Issuing Organization` · preview `Rendering high-resolution vector certificate...` · error fallback `Certificate rendered securely. You can view or download the official file below.` + `Retry Preview` · actions `Download PNG` / `Preparing PNG...`, `Download PDF` / `Preparing PDF...`, `Verification Page`, note `Official **PNG & PDF** Formats`
- Nav: `Who We Are`, `Admin Login` · Footer: `© {year} **Ahsan & Team** · VeriMoo Platform`, `LinkedIn (Ahsan)`, `GitHub`, `About & Services`, `Admin Portal`

**Login** ([app/login/page.tsx](app/login/page.tsx))
- `Admin Portal` / `Sign in to manage and issue digital certificates.` · `Back to Verification Search` · placeholder `admin@verimoo.com` · `Sign In` / `Authenticating...` · errors `Invalid email address or password.` and `An unexpected authentication error occurred.`

**Verify page** ([app/verify/[serial]/page.tsx](app/verify/[serial]/page.tsx))
- `Verifying digital certificate authenticity...` · `{Label} · Verified Credential` · `Officially Verified & Authentic` · labels `Date Issued`, `Serial Number`, `Issuing Organization`, `Program / Course`, `Credential Manager` · `Show/Hide Certificate Preview`, `High-Definition Preview` · `Not Verified`, `Certificate Record Not Found`, `This certificate serial number could not be verified against the official registry.` · footer `Verified with VeriMoo Security Engine`
- Default theme: label `Certificate`, headline `is a verified holder of this certificate`, icon `🎓`

**Verification themes** ([lib/verificationThemes.js](lib/verificationThemes.js)) — 10 entries, each `label` / `headline` / `icon`:

`Course Completion` — has successfully completed the course 🎓 · `Webinar` — attended the webinar 💻 · `Appreciation` — is recognized with appreciation 🌟 · `Attendance` — is confirmed in attendance 📋 · `Workshop` — participated in the workshop 🛠️ · `Training` — completed the training program 📈 · `Achievement` — has achieved a milestone 🏆 · `Participation` — participated in 🤝 · `Internship` — completed the internship 💼 · `Excellence Award` — is awarded for excellence 🏅

**Certificate heading presets** ([app/admin/projects/[id]/page.tsx](app/admin/projects/[id]/page.tsx))

`Certificate of Appreciation` · `Certificate of Completion` · `Certificate of Achievement` · `Certificate of Participation` · `Certificate of Excellence` · `This is to certify that` · `has successfully completed the course` · `Awarded to`

**Admin notable copy**
- Dashboard: `Certificate Projects` / `Create, design, and manage participant certificate issuances.` · `No projects created yet` / `Get started by creating your first certificate project. You can design the layout, add participants, and issue certificates.`
- Mobile notice: `**Desktop / Laptop Recommended**: For better view, management, and full drag-and-drop certificate design studio tools, use a desktop or laptop. Field positions are locked on mobile devices.`
- Studio mobile banner: `Canvas Locked on Mobile` — `For better view, management, and full drag-and-drop customization, please use a **desktop or laptop** to edit certificates. Field positions are **fixed & locked** on mobile devices to prevent accidental displacement.`
- Team: `Team Management` / `Manage user roles between Super Admins (unlimited all-project access) and Simple Users (scoped limits).` · Simple User — `Scoped access. Only sees projects they create themselves, subject to project quotas & limitations.` · Super Admin — `Main administrator. Sees all projects across the platform, manages team accounts, and unlimited quotas.`
- Print tip: `Print tip: PNGs are rendered at 300 DPI, matching the selected page size exactly. For best results, print at **100% (Actual Size)** and turn off any "Fit to Page" scaling.`

### 4.3 Changelog

[lib/changelog-data.ts](lib/changelog-data.ts) holds `CURRENT_VERSION = "v1.2.5"` and **9 releases with 43 individual items**, dated July 15 2026 → August 30 2026. Each has `version`, `title`, `date`, `isLatest`, `summary`, and typed items (`feature` / `improvement` / `fix` / `security` / `ui`). Titles:

`v1.2.5` Dual-Format (PNG & PDF) High-Definition Engine & Vercel Serverless Optimization · `v1.2.4` VeriMoo Modern Blue-Indigo-Purple SaaS Design Architecture · `v1.2.3` Participant Lifecycle Automation & Superadmin Team Intelligence · `v1.2.2` Responsive SaaS Navigation & Design System Foundations · `v1.2.1` High-Resolution 300 DPI Rendering & Custom Font Studio · `v1.2.0` Live QR Verification Engine & Anti-Abuse Protection · `v1.1.5` Bulk Excel Roster Importer & Batch ZIP Export · `v1.1.0` Superadmin Role Permissions, Automated Gmail SMTP & AI Assistant · `v1.0.0` VeriMoo Core Certificate Engine Launch

This is the single richest content asset in the repo and it is already cleanly separated from presentation — the only content in the codebase that is.

> **Note for the revamp:** `package.json` says `"version": "0.2.0"` while the changelog says `v1.2.5`. Two independent version numbers, neither referencing the other.

---

## 5. Design system as it exists today

### Source of truth

[app/globals.css](app/globals.css), 123 lines, Tailwind v4 CSS-first. No `tailwind.config.js` exists.

### Color

`@theme` declares six brand tokens:

```css
--color-primary: #2563eb;   --color-primary-dark: #1d4ed8;   --color-primary-light: #3b82f6;
--color-indigo: #4f46e5;    --color-purple: #7c3aed;         --color-purple-light: #8b5cf6;
```

The signature brand gesture is a three-stop gradient `#2563EB → #4F46E5 → #7C3AED` (buttons, avatars, progress bar, banners, changelog trigger).

**Inconsistency #1 — two parallel color systems.** Measured across `app/` + `components/`:

| Approach | Usage |
|---|---|
| Token utilities (`bg-primary`, `text-primary`, `border-primary`, `ring-primary`) | ~56 occurrences, almost entirely inside the older studio page |
| Hardcoded `#2563EB` in arbitrary-value classes | **103 occurrences** |

So the same blue is written two different ways, and the hardcoded form now outnumbers the token form roughly 2:1. Full hex census: `#2563EB` ×103, `#111827` ×61, `#64748B` ×58, `#F8FAFC` ×56, `#94A3B8` ×56, `#E2E8F0` ×44, `#27272a` ×40, `#7C3AED` ×34, `#3B82F6` ×31, `#18181c` ×24, `#0e0e12` ×16, `#4F46E5` ×14, `#334155` ×11, `#1E293B` ×11, `#8B5CF6` ×9, `#EF4444` ×8, `#141418` ×6, `#111111` ×5, `#10B981` ×5, plus singles.

**Inconsistency #2 — four of the six declared tokens are dead.** `--color-primary-dark`, `--color-primary-light`, `--color-indigo`, and `--color-purple-light` have **zero** utility usages anywhere; their values appear only as hardcoded hex. `--color-purple` has 2. The token layer exists but is not the system.

**Inconsistency #3 — three competing dark-mode neutral palettes.** Dark mode is class-based (`@variant dark (&:where(.dark, .dark *))`) but the neutrals were never unified:

| Palette | Where | Backgrounds | Borders | Text |
|---|---|---|---|---|
| Custom near-black (newest) | `/`, `/about`, `/login`, `/verify`, admin layout, team | 47 | 54 | — |
| Tailwind `gray-*` (oldest) | studio page, parts of dashboard | 18 | 37 | 45 |
| Tailwind `slate-*` | mixed | 10 | 9 | 38 |

Concretely: a card is `dark:bg-[#0e0e12]` on the public pages, `dark:bg-gray-900/60` in the studio, and `dark:bg-slate-900/40` in the team modals. Casing is inconsistent too — brand hexes are uppercase (`#2563EB`), custom neutrals lowercase (`#0e0e12`). `#7C3AED` and `#7c3aed` both appear.

**Semantic status colors** are consistent and worth keeping: Verified/success green `#10B981`, Pending amber `#F59E0B`, Error/Expired red `#EF4444` (hover `#DC2626`), Emailed purple, Processing blue.

### Typography

Inter, loaded **three separate times**:
1. `next/font/google` in the root layout — 7 subsets, weights 300–800, `--font-inter`, `display: swap` (the correct, self-hosted, layout-shift-free path)
2. An `@import` from `fonts.googleapis.com` at the top of `globals.css` — a render-blocking network request that duplicates #1
3. A hand-written `@font-face` for weight 300 pointing at a hardcoded `fonts.gstatic.com` v20 URL with a Cyrillic-only `unicode-range` — a third fetch, for a slice already covered by #1

Separately, `@font-face` declares family `VeriMooEmbedded` from `/fonts/inter-*.woff` (400/700). This one is deliberate and load-bearing: the same two files are read from disk and base64-embedded server-side in `lib/certificate.js`, so the studio preview and the exported certificate use a byte-identical font. The `FONT_OPTIONS` list documents this ("recommended — exact preview match").

The font stack is repeated verbatim three times (in `@theme`, on `html`, on `body`).

Type scale in practice: `text-[10px]` and `text-[11px]` are used liberally for metadata, then `text-xs` / `text-sm` / `text-base` / `text-lg` / `text-xl` / `text-2xl` / `text-3xl` / `text-4xl` / `text-5xl`. Weights run `font-medium` → `font-semibold` → `font-bold` → `font-extrabold`. Headings are consistently `tracking-tight`; uppercase metadata labels consistently pair `text-[11px] font-medium uppercase tracking-wider`.

### Component utilities

Seven `@utility` classes carry the design system: `btn-primary`, `btn-gradient`, `btn-secondary`, `btn-outline`, `btn-danger`, `btn-ghost`, `input`, `card`, `card-hover`. The six button utilities share ~11 identical base declarations (`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none … active:scale-[0.98] … cursor-pointer`) copy-pasted into each — no shared `btn` base.

`btn-secondary` and `btn-ghost` are **declared but never used** as `variant` values anywhere.

### Spacing, radii, elevation

Consistent and idiomatic. Page container `mx-auto max-w-6xl px-4 sm:px-6` (`max-w-4xl` on `/verify` and the hero). Section rhythm `py-12 sm:py-20` / `py-16 sm:py-24`, stacks via `space-y-{3,4,6,16}`, cards `p-4 sm:p-5` / `p-5 sm:p-6` / `p-6 sm:p-8`. Grids step `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`. Radii ladder: `rounded-md` (6) → `rounded-lg` (8, buttons/inputs) → `rounded-xl` (12, cards) → `rounded-2xl` (16, feature panels) → `rounded-full` (pills/avatars). Shadows `shadow-xs` → `shadow-sm` → `shadow-md` → `shadow-lg` → `shadow-xl` → `shadow-2xl`, deliberately light.

### Motion

`framer-motion` throughout. Entrances are `initial={{opacity:0, y:8..14}} → animate={{opacity:1,y:0}}` at `duration: 0.15–0.25`, staggered with small `delay`s (`Math.min(i * 0.03, 0.2)` caps list stagger). `AnimatePresence` handles result states, modals, mobile drawer, and tab transitions. `Button` adds `whileHover: 1.015` / `whileTap: 0.985`. `ThemeToggle` uses a `layoutId` spring pill. `prefers-reduced-motion: reduce` is respected globally in CSS. Per-project `settings.loadingAnimations` gates `ProgressBar` in the import flow only — the ~80 other `motion` usages ignore it.

### Accessibility — genuinely good

`focus-visible:ring-2` on every interactive utility; `role="radiogroup"`/`role="radio"`/`aria-checked` on the theme toggle; `role="dialog" aria-modal aria-labelledby` on both modal implementations; Escape-to-close and body-scroll-lock on both; `aria-label` on icon-only buttons; `aria-hidden` on decorative SVGs; `suppressHydrationWarning` + a pre-paint theme script so there is no flash. Every `<img>` has an `alt`, and each `no-img-element` lint suppression carries a justifying comment.

### Two modal implementations

`components/modal.tsx` and the dialog inlined in `changelog-modal.tsx` independently implement backdrop, Escape handling, scroll lock, and ARIA. The changelog one does not reuse `Modal` — it needs a custom header/toolbar/footer that `Modal`'s fixed `title`-only header cannot express.

---

## 6. Broken, unused, or dead code

Ordered by severity. Everything here was verified, not inferred.

### Broken

**B1 — `xs:` breakpoint does not exist; two UI elements are permanently invisible.** *(confirmed against built CSS)*

Tailwind v4's defaults are `sm`/`md`/`lg`/`xl`/`2xl`. There is **no `xs`**, and `globals.css` defines no `--breakpoint-xs`. An unknown variant generates no CSS, so `hidden xs:flex` reduces to plain `hidden` at every viewport width. I grepped the production CSS bundle: no `xs\:flex` or `xs\:inline-block` rule is emitted.

- [app/page.tsx:138](app/page.tsx#L138) — `hidden xs:flex` on the header's LinkedIn + GitHub icon group. **The social icons never render on the homepage, at any screen size.**
- [app/admin/layout.tsx:87](app/admin/layout.tsx#L87) — `hidden xs:inline-block` on the "Admin" badge next to the brand. **Never renders.**

Fix is one line: add `--breakpoint-xs: 24rem;` to `@theme` (or change to `sm:`).

**B2 — Five project-scoped API routes authenticate but never check ownership.**

`app/api/projects/[id]/route.js`, `.../fonts`, and `.../send-email` all define and call a `canAccess(session, project)` guard. These five do not — they verify a session exists, then act on whatever `[id]` was passed:

| Route | Methods | Consequence for a non-owner "Simple User" |
|---|---|---|
| `.../participants` | POST | Add participants to another admin's project |
| `.../participants/[pid]` | PATCH, DELETE | Modify or delete another admin's participants |
| `.../import` | POST | Bulk-import a roster into another admin's project |
| `.../export` | GET | **Download another admin's full participant roster as `.xlsx` (names, emails, courses, dates, statuses)** |
| `.../certificates/zip` | GET | Bulk-download every certificate in another admin's project |

The role model makes this a real boundary, not a theoretical one: `/api/projects` GET explicitly scopes sub-admins to `{ createdBy: session.user.id }`, and the Team UI sells Simple User as *"Only sees projects they create themselves."* Project ids are plain Mongo ObjectIds visible in the owner's own URLs. The `export` route is the most sensitive — it is a direct PII read. The guard already exists and is three lines to apply.

**B3 — Two of three configurable permissions are never enforced.** The Team UI offers checkboxes for `canDeleteProjects`, `canManageParticipants`, and `canManageTemplates`, and persists all three. Only `canDeleteProjects` is ever read (in `projects/[id]` DELETE). Unchecking "Can add and import participants" or "Can edit templates and custom fonts" has **no effect** — the admin retains both abilities. The `Admin` model comment is candid that these are "scaffolded for future routes," but the UI presents them as active controls.

**B4 — In-process cache and rate limiter don't work on the stated deployment target.** `lib/cache.js` and `lib/rateLimit.js` are module-level `Map`s. On Vercel each serverless instance has its own memory and instances scale/recycle freely, so the 180 req/min limit is *per instance* — actual throughput scales with concurrency, and the limiter is not a reliable brute-force defence on the enumeration vector it was added for (changelog v1.2.0: *"prevent brute-force serial enumeration"*). Likewise the cache's advertised "~1ms repeat retrieval" only lands on a warm instance that already rendered that exact certificate. Both are correct for a single long-lived server; neither matches Vercel.

**B5 — Hardcoded production auth secret fallback.** [lib/auth.js:63](lib/auth.js#L63):

```js
secret: process.env.NEXTAUTH_SECRET || "verimoo-production-secret-key-2026-auth-token",
```

The same literal is also the committed value of `NEXTAUTH_SECRET` in **`.env.example`**, which is tracked in git. A deployment that forgets the env var silently signs session JWTs with a public constant, and the fallback guarantees no startup error surfaces the mistake. `.env` is correctly gitignored and currently byte-identical to `.env.example` (all placeholders) — but the fallback should be removed and the example value replaced with a `<generate-me>` placeholder.

**B6 — Stale comment that flatly contradicts the code.** The header of [app/api/projects/[id]/certificates/zip/route.js](app/api/projects/[id]/certificates/zip/route.js) states:

> *"There's no PDF option anywhere in this app; single-certificate downloads are SVG."*

Both halves are false as of v1.2.5: single downloads are PNG-primary with PDF, and `format=pdf` is a first-class branch in the certificate route. Similarly, [models/Project.js](models/Project.js) points at `MAX_CUSTOM_FONTS in app/api/projects/[id]/route.js` — it actually lives in `.../fonts/route.js`.

**B7 — README.md is a single empty byte.** No setup instructions, no architecture note, nothing. `.env.example` is currently the only onboarding documentation.

### Unused / dead

| Item | Location | Evidence |
|---|---|---|
| `public/loading.gif` — **801 KB** | `public/` | Zero references anywhere in `app/`, `components/`, `lib/`, or CSS |
| Three byte-identical 470 KB copies of the logo — **1.4 MB wasted** | `public/favicon.ico`, `app/favicon.ico`, `app/icon.png` all have the same md5 as `public/verimoo.png`. Both `.ico` files are actually PNGs | md5 comparison |
| `downloadCertificateHD` | [lib/clientCertificateDownload.ts:211](lib/clientCertificateDownload.ts#L211) | "Backward-compatible alias" with no remaining callers |
| `toDateInputValue` | [lib/dateFormat.js:79](lib/dateFormat.js#L79) | Exported, documented, never imported |
| `DELETE /api/text-templates/[id]` | route exists, correctly permission-checked | No client code calls it — the studio can save shared wording blocks but offers no way to remove one |
| `PATCH /api/projects/[id]/participants/[pid]` | route exists | Only DELETE is called; participants cannot be edited after creation |
| `ActivityLog` model | written by 15 `logActivity` call sites | **Never read.** No API route, page, or query surfaces the audit trail — it is a write-only collection |
| `btn-secondary`, `btn-ghost` | [app/globals.css](app/globals.css) | Declared utilities and valid `Button` variants; zero call sites |
| `--color-primary-dark`, `--color-primary-light`, `--color-indigo`, `--color-purple-light` | `@theme` | Zero utility usages |
| `Duplicated Inter web-font loading` | [app/globals.css:1](app/globals.css#L1) and `:17-23` | Two extra network fetches for a font `next/font` already self-hosts |
| `aiTokenLimit` editing | `AdminUser` type + `PATCH /api/admins/[id]` both support it | No UI exposes it; quota is only settable via the model's 20000 default |

### Duplication & code smells (not broken, but revamp-relevant)

- **One 2,207-line component.** ~40 `useState` calls in a single function; canvas, field editor, participants table, import panel, font manager, and settings all inline.
- **Copy-pasted page chrome.** Header + footer are hand-duplicated across `/`, `/about`, `/login`, `/verify/[serial]`. The drift is already visible: `/about`'s footer links to `https://github.com/allen9650/` while `/`, `/login`, and the admin layout link to `https://github.com/allen9650/verimoo`.
- **`/about` is a wrapper with no content of its own** — header + `<WhoWeAreSection />` + footer, the exact block `/` already renders. Two URLs, one body.
- **Fetch-on-mount duplicated against a named reloader.** `/admin`, `/admin/team`, and the studio each define `loadProjects()` / `reload()` / `load()` **and** re-implement the same fetch inline inside a `useEffect` with a `cancelled` flag, rather than calling it.
- **Duplicated triple-decode + escaped-regex + query-fallback lookup** in `verify/[serial]` and `certificate/[serial]`, plus matching client-side "try path, fall back to query-param" logic in three components.
- **Duplicated PNG/PDF pipeline.** `lib/certificate.js` + `lib/pdf.js` (server, resvg/sharp + pdf-lib) and `lib/clientCertificateDownload.ts` (browser, Canvas + pdf-lib) implement the same 300 DPI PNG → PDF flow twice. Deliberate — the client path is the serverless-limit fallback — but the constants (`300/96`, `×72/96`, default `1000×700`) are hardcoded in both.
- **Duplicated font-format-from-mime mapping** in four places: `lib/certificate.js`, `app/api/projects/[id]/fonts/route.js`, and twice inline in the studio page.
- **`className` conflicts.** `max-w-2xl max-w-[calc(100vw-1.5rem)]` in `changelog-modal.tsx:183` and the same pattern in `modal.tsx:62` — two `max-width` declarations where only the last wins.
- **`window.alert()` for validation errors** in the studio's upload handlers, while every other error in the app renders inline.
- **Duplicated font binaries** — `assets/fonts/` and `public/fonts/` hold identical files. This one is *justified*: the server reads `assets/` (falling back to `public/`) for base64 embedding, the browser needs `public/` for `@font-face`. Worth a comment, not a fix.

### What's genuinely well done

Worth preserving through the revamp rather than rewriting:

- **`lib/safeFetch.js`** — a careful SSRF guard for admin-supplied font URLs: protocol allowlist, DNS resolution with *every* returned address checked against private/reserved ranges (explicitly defeating DNS rebinding), cloud-metadata IP blocking, post-redirect re-validation, 8s timeout, and streaming 3MB cap.
- **`lib/sanitizeSvg.js` and `lib/sanitizeFontName.js`** — narrow, well-scoped, and each carries a comment explaining precisely which injection vector it closes and why.
- **`lib/crypto.js`** — AES-256-GCM for the Gmail app password, with the plaintext never stored or returned (`.select("-emailConfig.gmailAppPasswordEncrypted")` on both read paths).
- **`ALLOWED_UPDATE_FIELDS`** in `projects/[id]` — an explicit mass-assignment allowlist with a comment naming the attack it prevents.
- **The timezone handling** in `lib/dateFormat.js` and the import route — exclusively UTC accessors, with a long comment documenting the actual reported bug (a date showing "23" locally and "22" on Vercel) and why UTC-midnight normalization fixes it.
- **`app/theme-provider.tsx`** — `useSyncExternalStore` reading the DOM/localStorage as the source of truth instead of a `useEffect` + `setState` mirror, with a comment explaining the choice.
- **Comment quality generally.** The codebase explains *why* far more often than *what*. That is unusual and valuable.
- `tsc --noEmit`, `eslint`, and `next build` all pass clean.

---

## 7. Summary

**Health:** builds clean, typechecks clean, lints clean. The security-sensitive primitives (SSRF guard, SVG/font-name sanitization, secret encryption, mass-assignment allowlist, timezone normalization) are thoughtfully written and well-commented. The real problems are **B1** (a dead breakpoint hiding two elements), **B2** (five routes missing an ownership check that already exists elsewhere in the codebase), **B3** (two permissions the UI implies but nothing enforces), and a supply chain with one unfixable high-severity dependency (`xlsx`) plus a critical-rated legacy auth library.

**Structurally,** the codebase is mid-migration between two design systems and never finished: token utilities vs. hardcoded hex (56 vs. 103 uses of the same blue), and three dark-mode neutral palettes coexisting. Only 740 lines are extracted into `components/` against ~4,700 lines of page code, 2,207 of which sit in one file.

**Four decisions worth settling before any revamp work starts:**

1. **NextAuth v4 → Auth.js v5?** Touches all 14 authenticated routes. Largest single migration in the tree.
2. **What replaces `xlsx`?** No version bump fixes it — it needs a CDN install or a different library.
3. **Which color system wins** — `@theme` tokens or hardcoded hex — and which dark-mode neutral palette becomes canonical?
4. **Is `/about` meant to be its own page,** or should it fold into the `/` anchor it currently duplicates?

**Three items I'd fix before anything else, independent of the revamp direction** — all small, all verified: the `xs:` breakpoint (one line), the five missing `canAccess` checks (three lines each), and the `NEXTAUTH_SECRET` fallback.
