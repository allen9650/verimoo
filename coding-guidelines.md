# Coding Guidelines — VeriMoo

These are **derived from the existing codebase**, not invented. Where a rule departs from what the majority of current code does, it is marked **⚠ CORRECTION** with the reason and the migration status.

Companion docs: [CLAUDE.md](CLAUDE.md) · [AGENTS.md](AGENTS.md) · [docs/audit.md](docs/audit.md)

---

## 1. File organization

### Where things go

| Kind of code | Location | Extension |
|---|---|---|
| Route pages | `app/**/page.tsx` | `.tsx` |
| Layouts | `app/**/layout.tsx` | `.tsx` |
| API handlers | `app/api/**/route.js` | **`.js`** |
| Reusable components | `components/*.tsx` | `.tsx` |
| Server-side utilities | `lib/*.js` | **`.js`** |
| Browser-side utilities | `lib/*.ts` | `.ts` |
| Shared types | `lib/types.ts` | `.ts` |
| Static content data | `lib/*-data.ts` | `.ts` |
| Mongoose schemas | `models/*.js` | **`.js`** |
| Ambient type declarations | `types/*.d.ts` | `.d.ts` |

The `.js` / `.ts` split is deliberate and consistent: **server-side modules and every API route are plain JavaScript**; anything that carries React types, shared interfaces, or browser-only logic is TypeScript. `tsconfig.json` sets `allowJs: true` to permit this. Follow the split; don't convert files as a drive-by.

### Imports

Always use the `@/*` path alias (mapped to the project root in `tsconfig.json`). Relative imports appear only *inside* `lib/` where modules import their siblings (`lib/certificate.js` → `./dateFormat.js`).

```js
import { Button, Input, Card, Badge } from "@/components/ui";
import { connectDB } from "@/lib/mongodb";
import Project from "@/models/Project";
import type { Project } from "@/lib/types";
```

Import order, as practised throughout:

1. `"use client"` directive (when needed)
2. React / Next core (`react`, `next/link`, `next/image`, `next/navigation`)
3. Third-party (`framer-motion`, `lucide-react`, `next-auth/react`)
4. Local components (`@/components/*`)
5. Local libs (`@/lib/*`), models (`@/models/*`)
6. `import type { ... }` last

### When to extract a component

Current reality: only ~740 lines live in `components/`, against ~4,700 lines of page code. That ratio is a known problem, not a model to copy.

Extract into `components/` when a piece of UI is either **used in more than one place** or **large enough to have its own state**. In particular, **do not add new inline sections to `app/admin/projects/[id]/page.tsx`** — at 2,207 lines and ~40 `useState` hooks it is already past the point where anything new should go in it.

---

## 2. Naming

| Thing | Convention | Examples |
|---|---|---|
| Component files | `kebab-case.tsx` | `theme-toggle.tsx`, `who-we-are-section.tsx`, `progress-bar.tsx` |
| Component exports | `PascalCase` | `ThemeToggle`, `WhoWeAreSection`, `ProgressBar` |
| Lib files | `camelCase.js/.ts` | `sanitizeSvg.js`, `safeFetch.js`, `clientCertificateDownload.ts` |
| Content-data files | `kebab-case-data.ts` | `changelog-data.ts` |
| Model files | `PascalCase.js` (matches the model name) | `Project.js`, `ActivityLog.js` |
| Functions | `camelCase`, verb-first | `buildCertificateSVG`, `formatDate`, `sanitizeFontFamilyName`, `resolveValue` |
| Module-level constants | `UPPER_SNAKE_CASE` | `DEFAULT_FIELDS`, `ALLOWED_UPDATE_FIELDS`, `MAX_CUSTOM_FONTS`, `PAPER_BASE`, `HEADING_PRESETS`, `VERIFICATION_THEMES` |
| Types / interfaces | `PascalCase`, no `I` prefix | `CertificateField`, `VerifyResult`, `ProjectSettings`, `AdminUser` |
| Handler functions | `handle` + Event | `handleSearch`, `handleCreate`, `handleFontUpload`, `handleSendEmails` |
| Boolean state | `is` / `has` / adjective | `isSuperadmin`, `isMobileScreen`, `loading`, `saving`, `deleting`, `importing` |
| Data reloaders | `load` / `reload` / `loadX` | `load()`, `reload()`, `loadProjects()` |

**Roles:** the database and API use `"superadmin"` and `"admin"`. The **UI** labels them "Super Admin" and "Simple User". Keep the code values as-is; the user-facing strings are a presentation concern.

---

## 3. Component patterns

### Client vs. server components

Nearly everything is a **client component** — `"use client"` is the first line of every page except `app/layout.tsx` and `app/about/page.tsx`. This follows from the app being interactive throughout: session state, theming, drag-and-drop, and live fetching.

Use a **server component** when a page has no interactivity of its own and benefits from exported `metadata` — `app/about/page.tsx` is the reference example.

### Component signature style

Destructure props inline in the parameter list with the type annotated there. No separate `Props` interface, no `React.FC`.

```tsx
export function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = "max-w-md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}) { … }
```

Defaults go in the destructuring, not inside the body.

### Extending native elements

Spread the remaining props onto the underlying element and merge `className` with `clsx`:

```tsx
export function Card({
  className,
  hover = false,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { hover?: boolean }) {
  return <div className={clsx("card p-5 sm:p-6", hover && "card-hover", className)} {...props} />;
}
```

The base utility class comes first, caller `className` last, so callers can always override.

### Variants via a lookup map

`Button` maps a variant name to a CSS utility class rather than branching:

```tsx
const map = {
  primary: "btn-primary",
  gradient: "btn-gradient",
  secondary: "btn-secondary",
  outline: "btn-outline",
  danger: "btn-danger",
  ghost: "btn-ghost",
};
```

`Badge` does the same with an 8-key `Record<string, { bg: string; dot: string }>` and a `colors[color] || colors.gray` fallback. Use this pattern for any new multi-variant component.

### Named exports only

Every component in `components/` is a named export. Default exports are reserved for Next.js's own conventions — `page.tsx`, `layout.tsx`, `providers.tsx` — where the framework requires them.

### Presentational data as module constants

Lists that drive UI live as `UPPER_SNAKE_CASE` arrays above the component, not inline in JSX:

```tsx
const SERVICES = [{ icon: Code2, color: "blue", title: "…", description: "…" }, …];
const AGILE_CYCLE = [{ step: "01", name: "Discover", desc: "…" }, …];
const OPTIONS: { value: ThemePreference; label: string; Icon: typeof Sun }[] = [ … ];
```

Note that **icon components are stored directly in the data** and rendered via `const Icon = item.icon; <Icon size={20} />`.

### Icons

`lucide-react`, sized explicitly with the `size` prop (`size={14}`, `size={16}`, `size={20}`), never with width/height classes. Brand icons (LinkedIn, GitHub) are hand-rolled inline SVGs in `who-we-are-section.tsx` because lucide dropped them — reuse those, don't add a brand-icon dependency.

### Accessibility — this is a strength, maintain it

The existing standard, which new code should meet:

- `focus-visible:ring-2` on every interactive utility class (already baked into the `btn-*` and `input` utilities)
- `aria-label` on every icon-only button
- `aria-hidden="true"` on decorative SVGs
- `role="dialog"` + `aria-modal` + `aria-labelledby` on modals, with Escape-to-close and body-scroll lock
- `role="radiogroup"` / `role="radio"` / `aria-checked` for segmented controls
- an `alt` on every image
- every `@next/next/no-img-element` lint suppression carries a comment justifying why a raw `<img>` is required (data URIs, dynamically generated SVG)

---

## 4. Styling

### The system lives in one file

`app/globals.css`. **There is no `tailwind.config.js`** — Tailwind v4 is configured CSS-first via `@theme`, `@utility`, and `@variant`. Add design tokens and component classes there, not in a JS config.

### Color — ⚠ CORRECTION

**Current state:** the same blue is written two ways — token utilities (`bg-primary`, ~56 uses) and hardcoded `#2563EB` in arbitrary-value classes (**103 uses**). Four of the six declared `@theme` tokens have zero usages. Three dark-mode neutral palettes coexist (custom near-blacks, Tailwind `gray-*`, Tailwind `slate-*`).

**The rule going forward:**

1. **Use token utilities. Never write a raw hex in a `className`.**
   ```tsx
   ✅ <div className="bg-primary text-white">
   ❌ <div className="bg-[#2563EB] text-white">
   ```
2. **Dark mode standardises on the custom near-black scale**, not `gray-*` or `slate-*`:

   | Role | Value |
   |---|---|
   | Page background | `black` |
   | Surface / card | `#0e0e12` |
   | Raised surface | `#141418` |
   | Hover / subtle fill | `#18181c` |
   | Active fill | `#23232a` |
   | Border | `#27272a` |
   | Body text | `#F8FAFC` |
   | Muted text | `#94A3B8` |

3. **Prerequisite:** `@theme` currently only covers the six brand colors. The light neutrals (`#F8FAFC`, `#111827`, `#64748B`, `#E2E8F0`) and the dark scale above **still need to be added as tokens** before rule 1 can be applied to them. Until that lands, keep using the values in the table — just don't introduce *new* neutral values outside it.
4. **Existing hardcoded hex is documented tech debt**, not a bug. Convert it opportunistically when you are already editing a file. Do not open a repo-wide find-and-replace as a standalone change.
5. **Semantic status colors are settled** and should be reused as-is: Verified/success `#10B981` · Pending/warning `#F59E0B` · Error/expired `#EF4444` (hover `#DC2626`) · Emailed purple · Processing blue.
6. **The brand gradient** is `#2563EB → #4F46E5 → #7C3AED`, applied via the `btn-gradient` utility or `bg-gradient-to-r from-… via-… to-…`. It's the product's signature gesture — buttons, avatars, the progress bar, banners.
7. **Hex casing:** uppercase (`#2563EB`, not `#2563eb`). The codebase is inconsistent here; uppercase is the majority and the standard.

### Component utilities over repeated class strings

When a visual pattern recurs, add an `@utility` in `globals.css` rather than copy-pasting a long class string. Existing set: `btn-primary`, `btn-gradient`, `btn-secondary`, `btn-outline`, `btn-danger`, `btn-ghost`, `input`, `card`, `card-hover`.

Note `btn-secondary` and `btn-ghost` are currently declared but unused — they're valid `Button` variants and available if a design needs them.

### Dark mode

Class-based, via `@variant dark (&:where(.dark, .dark *))` and a `.dark` class on `<html>`. Every color utility needs its `dark:` counterpart:

```tsx
className="border-[#E2E8F0] bg-white dark:border-[#27272a] dark:bg-[#0e0e12]"
```

The class is set **before paint** by `themeInitScript` (an inline `<head>` script), so there's no flash of the wrong theme — including for the `system` preference. Don't move theme resolution into a `useEffect`.

### Responsive

Mobile-first. Breakpoints in use: `sm:` (640) · `md:` (768) · `lg:` (1024). Typical progression:

```tsx
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
className="text-xl sm:text-2xl"
className="p-4 sm:p-6"
className="flex flex-col sm:flex-row"
```

**⚠ There is no `xs:` breakpoint.** Tailwind v4 doesn't ship one and none is defined. `xs:` classes generate no CSS, so `hidden xs:flex` is permanently `hidden` — this is an active bug in two files (see [CLAUDE.md](CLAUDE.md) Known Issues). Either add `--breakpoint-xs: 24rem;` to `@theme` or use `sm:`.

The Certificate Studio deliberately degrades on mobile: drag is disabled below 768px and an advisory banner explains why. Preserve that behaviour when touching the canvas.

### Spacing, radii, elevation — already consistent, keep it

- Page container: `mx-auto max-w-6xl px-4 sm:px-6` (`max-w-4xl` for `/verify` and the hero)
- Section rhythm: `py-12 sm:py-20` or `py-16 sm:py-24`
- Vertical stacks: `space-y-3` / `space-y-4` / `space-y-6`
- Card padding: `p-4 sm:p-5` / `p-5 sm:p-6` / `p-6 sm:p-8`
- Radii ladder: `rounded-md` (6) → `rounded-lg` (8, buttons/inputs) → `rounded-xl` (12, cards) → `rounded-2xl` (16, feature panels) → `rounded-full` (pills, avatars)
- Shadows stay light: `shadow-xs` → `shadow-sm` → `shadow-md` → `shadow-lg` → `shadow-xl` → `shadow-2xl`
- Uppercase metadata labels are always `text-[11px] font-medium uppercase tracking-wider`
- Headings are always `tracking-tight`

**Watch for conflicting utilities.** `max-w-2xl max-w-[calc(100vw-1.5rem)]` appears in both modal implementations — two `max-width` declarations where only the last applies. Don't replicate it.

### Motion

`framer-motion`. The established vocabulary:

```tsx
initial={{ opacity: 0, y: 8 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.2 }}
```

- Entrance durations: `0.15`–`0.25`
- List stagger: `delay: Math.min(i * 0.03, 0.2)` — capped so long lists don't crawl
- `AnimatePresence` for anything conditionally mounted (result states, modals, drawers, tabs)
- `whileHover: 1.015` / `whileTap: 0.985` for buttons — subtle, not bouncy
- `layoutId` for shared-element transitions (the theme toggle's sliding pill)
- `prefers-reduced-motion: reduce` is honoured globally in `globals.css` — don't bypass it

---

## 5. State management

**There is no global state library** — no Redux, Zustand, or Jotai. Don't add one without a specific reason.

### The four mechanisms in use

| Mechanism | Used for |
|---|---|
| `useState` (local) | Everything by default |
| React Context | Exactly two: `SessionProvider` (next-auth) and `ThemeProvider` |
| `useSyncExternalStore` | Theme only — reads the DOM/`localStorage` as the source of truth |
| `useRef` | Non-rendering mutable values — drag state, DOM element refs |

### Local state conventions

Grouped and commented by concern, with a `DEFAULT_FORM` constant for resettable forms:

```tsx
const DEFAULT_FORM = { name: "", organizationName: "", serialPrefix: "CERT", … };

// Create Modal
const [modalOpen, setModalOpen] = useState(false);
const [form, setForm] = useState(DEFAULT_FORM);
const [saving, setSaving] = useState(false);
const [createError, setCreateError] = useState("");

// Delete Modal
const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
const [deleting, setDeleting] = useState(false);
```

**Patterns worth copying:**

- **Union-typed status** instead of multiple booleans: `useState<"idle" | "loading" | "found" | "notfound">("idle")`, `useState<"png" | "pdf" | false>(false)`.
- **Nullable object as an open/target flag** — `deleteTarget` holds both "is the modal open" and "which row", opened via `open={!!deleteTarget}`.
- **Derived values are computed, never stored.** `useMemo` for filtered lists and totals; plain computation for layout maths (zoom, scale, fit dimensions).
- **`useRef` for drag state** (`dragField`, `dragOffset`) so pointer-move doesn't re-render per frame.

### Data fetching

Plain `fetch` in `useEffect`. No SWR, React Query, or server actions.

The established mount-fetch shape uses a `cancelled` flag rather than `AbortController`:

```tsx
useEffect(() => {
  let cancelled = false;
  (async () => {
    try {
      const res = await fetch("/api/projects");
      const data = await res.json();
      if (!cancelled) { setProjects(data.projects || []); setLoading(false); }
    } catch {
      if (!cancelled) { setProjects([]); setLoading(false); }
    }
  })();
  return () => { cancelled = true; };
}, []);
```

Always default to a safe empty value (`data.projects || []`) — never assume a shape.

**⚠ CORRECTION.** All three admin pages currently define a named reloader (`load()` / `reload()` / `loadProjects()`) **and** duplicate the same fetch inline in `useEffect`. Define the reloader once and call it from the effect. Don't copy the duplication.

**Optimistic updates** are used for status transitions — e.g. `markParticipantIssued()` flips local status immediately while the server catches up asynchronously.

### The theme provider is a deliberate exception

`app/theme-provider.tsx` uses `useSyncExternalStore` with a module-level listener set, reading `localStorage` and the `<html>` class directly. This is intentional: the DOM is the source of truth (set pre-hydration by the inline script), and mirroring it into `useEffect` + `setState` would both cause a flash and trip the `react-hooks` set-state-in-effect rule. The file documents this. Don't "simplify" it into a `useEffect`.

---

## 6. API route patterns

### The standard spine

Every authenticated route follows this order. Deviating from it is how the five missing-ownership-check bugs happened.

```js
export async function PATCH(req, { params }) {
  const { id } = await params;                                    // 1. Next 16: params is a Promise

  const session = await getServerSession(authOptions);            // 2. Authenticate
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();                                              // 3. Connect

  const existing = await Project.findById(id);                    // 4. Load
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!canAccess(session, existing))                              // 5. Authorize — DO NOT SKIP
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();                                  // 6. Validate + act
  const update = pickAllowedFields(body);
  const project = await Project.findByIdAndUpdate(id, update, { returnDocument: "after" })
    .select("-emailConfig.gmailAppPasswordEncrypted");

  await logActivity({ project: project._id, admin: session.user.id, action: "updated_project" });  // 7. Audit

  return NextResponse.json({ project });                          // 8. Respond
}
```

### Authorization helpers

Defined per route file, deliberately small:

```js
// Sub-admins may only touch projects they created; superadmins can touch any.
function canAccess(session, project) {
  return session.user.role === "superadmin" || String(project.createdBy) === session.user.id;
}
```

Superadmin-only routes use a `requireSuperadmin()` helper returning `{ session }` or `{ error }`.

**Any new route touching a project-scoped resource must call `canAccess`.** Five existing routes don't — treat those as bugs to fix, not precedent.

### Response shapes

| Case | Shape |
|---|---|
| Success | The resource under a named key — `{ project }`, `{ participants }`, `{ admins }`, `{ template }` |
| Trivial success | `{ ok: true }` |
| Error | `{ error: "Human-readable sentence." }` + HTTP status |
| Public verification (only) | `{ valid: boolean, message?: string, …fields }` |
| Binary | `new Response(buffer, { headers })` with explicit `Content-Type`, `Content-Length`, `Content-Disposition` |

Status codes in use: `200` · `201` (create) · `400` · `401` · `403` · `404` · `409` (duplicate serial) · `413` (payload too large) · `429` (rate limited) · `500` · `501` (feature not configured) · `502` (upstream failure).

**Error messages are written for the end user, not the developer** — full sentences, actionable, no stack traces or internal identifiers:

> `"You've reached your limit of 3 projects. Ask a superadmin to raise it."`
> `"That URL points to a private or reserved network address, which isn't allowed."`
> `"AI suggestions aren't configured yet — add GEMINI_API_KEY to .env.local."`

Match that voice.

### Input validation

Validate at the boundary. The established techniques:

- **Allowlist before update** — `ALLOWED_UPDATE_FIELDS` + `pickAllowedFields(body)` prevents mass assignment. Extend the array to permit a new field.
- **Cap and clamp** — `String(x || "").trim().slice(0, 200)`, `Math.max(50, Math.min(10000, n))`
- **Size limits before processing** — 5MB templates, 3MB fonts, ~2MB SVG (returns `413`)
- **Sanitize before storing** — `sanitizeSvg()` on uploaded SVG, `sanitizeFontFamilyName()` on font names
- **Escape user input used in a regex**:
  ```js
  const safeRegex = new RegExp(`^${serial.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&")}$`, "i");
  ```
- **Verify file type by magic bytes**, not by the supplied extension or MIME (`detectFontDetails()` in the fonts route)

### Query-param alias routes

`/api/verify` and `/api/certificate` exist purely as production-reliability fallbacks for their `[serial]` counterparts, re-exporting the handler:

```js
import { GET as getVerify } from "./[serial]/route.js";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const serial = (searchParams.get("serial") || searchParams.get("s") || "").trim();
  return getVerify(req, { params: Promise.resolve({ serial }) });
}
```

Because of this, public route handlers must use `await Promise.resolve(params)` rather than `await params`. Clients mirror the pattern: try the path route, fall back to the query route on `!res.ok`.

---

## 7. Data layer

### Connection

Always `await connectDB()` before any query. `lib/mongodb.js` caches the connection on `global._mongoose` — required for serverless, where module state is reused across invocations but not guaranteed.

### Model definition

```js
const XSchema = new mongoose.Schema({ … }, { timestamps: true });
export default mongoose.models.X || mongoose.model("X", XSchema);
```

The `mongoose.models.X ||` guard prevents "Cannot overwrite model" errors on hot reload. Never omit it. `{ timestamps: true }` everywhere — `updatedAt` is load-bearing for cache invalidation.

### Query conventions

- **`.lean()`** for read-only paths that render or serialize (the certificate route) — meaningfully faster
- **`.select("-heavyField")`** to exclude large blobs. The dashboard list uses `.select("-templateSvg -templateImage.data")` because those are multi-megabyte base64 strings
- **`.select("-passwordHash")`** on every admin read; **`.select("-emailConfig.gmailAppPasswordEncrypted")`** on every project read. Secrets must never round-trip to the client
- **`{ returnDocument: "after" }`** on `findByIdAndUpdate` / `findOneAndUpdate` (not the deprecated `new: true`)
- **`.populate("createdBy", "name email")`** with an explicit field list, never a bare `populate`
- **Scope by role** at the query level: `const filter = session.user.role === "superadmin" ? {} : { createdBy: session.user.id };`
- **Handle duplicate-key errors explicitly**: `if (e.code === 11000) return NextResponse.json({ error: … }, { status: 409 });`

### Dates — non-negotiable

Certificate dates are **calendar dates with no time-of-day meaning**. Local-time handling silently produces off-by-one-day bugs between a developer machine and the UTC serverless runtime — this actually happened in production (a date showing "23" locally and "22" deployed).

```js
✅ new Date(Date.UTC(y, m - 1, d))     d.getUTCDate()     d.getUTCFullYear()
❌ new Date(y, m, d)                    d.getDate()        d.getFullYear()
```

Route everything through `lib/dateFormat.js` (`formatDate`, `parseDateInputValue`). Formatting is manual rather than `Intl`-based so patterns are guaranteed regardless of server locale.

---

## 8. Security patterns

These are the strongest part of the codebase. Match this standard.

| Concern | Approach |
|---|---|
| Passwords | `bcryptjs`, 10 rounds; only `passwordHash` stored |
| Sessions | NextAuth JWT; `id` + `role` injected via `jwt`/`session` callbacks; typed in `types/next-auth.d.ts` |
| Stored secrets | AES-256-GCM (`lib/crypto.js`); plaintext never stored or returned |
| Mass assignment | Explicit `ALLOWED_UPDATE_FIELDS` allowlist |
| Uploaded SVG | `sanitizeSvg()` strips `<script>`, `<foreignObject>`, `on*=` handlers, `javascript:` URIs |
| CSS injection | `sanitizeFontFamilyName()` reduces font names to safe identifiers before use in `<style>` |
| SSRF | `safeFetch()` — protocol allowlist, DNS resolution with **every** returned address checked against private/reserved ranges, cloud-metadata IPs blocked, post-redirect re-validation, timeout, streaming size cap |
| ReDoS / regex injection | User input escaped before `new RegExp()` |
| Brute force | IP-based sliding window on public endpoints (**note: per-instance only on serverless**) |
| File types | Magic-byte detection, not extension or client-supplied MIME |

**When adding security-relevant code, write a comment explaining the specific attack it prevents.** Every module above does this, and it's why the intent survives. Example from `lib/safeFetch.js`:

> *"Fetching a font from an admin-supplied URL means the server makes an outbound request to wherever that URL points — without guardrails, this is a classic SSRF vector: a malicious or compromised admin account could point it at an internal service or a cloud metadata endpoint (e.g. 169.254.169.254 …)"*

---

## 9. Comments

The prevailing standard is **explain why, not what** — and it is unusually well maintained. Comments here document:

- **The attack a guard prevents** (`safeFetch.js`, `sanitizeSvg.js`, `sanitizeFontName.js`)
- **The production bug a rule exists to stop** (`dateFormat.js`, the import route's `toUtcMidnight`)
- **Why an unusual approach was chosen** (`theme-provider.tsx` on `useSyncExternalStore`)
- **The performance reason behind a query** (`projects/route.js` on excluding template blobs; `cache.js` on what it fixes)
- **What is deliberately not yet wired up** (`models/Admin.js` on scaffolded permissions)

Section markers in long JSX are `{/* Title Case Label */}`.

Keep this up. Also: **when you change behaviour, update the comment above it.** Two comments have already gone stale and now state the opposite of what the code does (the ZIP route's PDF claim, and `Project.js`'s pointer to `MAX_CUSTOM_FONTS`).

---

## 10. Before you call it done

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm run build       # next build
```

All three must pass. **There is no test suite** — no framework, runner, or test files exist. Don't claim tests pass, and don't add a test framework as part of unrelated work.

Lint suppressions are permitted only with an inline justification, matching existing practice:

```tsx
{/* eslint-disable-next-line @next/next/no-img-element -- Dynamic SVG Certificate Fallback */}
```
