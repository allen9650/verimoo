export interface ChangelogItem {
  type: "feature" | "improvement" | "fix" | "security" | "ui";
  text: string;
}

export interface ChangelogRelease {
  version: string;
  title: string;
  date: string;
  isLatest?: boolean;
  summary: string;
  items: ChangelogItem[];
}

export const CURRENT_VERSION = "v1.2.5";

export const CHANGELOGS: ChangelogRelease[] = [
  {
    version: "v1.2.5",
    title: "Dual-Format (PNG & PDF) High-Definition Engine & Vercel Serverless Optimization",
    date: "August 30, 2026",
    isLatest: true,
    summary:
      "A complete optimization of the certificate generation, verification, and download pipeline with dedicated 300 DPI PNG and PDF outputs.",
    items: [
      {
        type: "feature",
        text: "Dual-Format Download System: Replaced user-facing SVG options with high-resolution Download PNG (image/png) and printable Download PDF (application/pdf).",
      },
      {
        type: "improvement",
        text: "Zero-Dependency PDF Compilation: Integrated pdf-lib to compile crisp, standard PDF documents matching exact certificate dimensions and aspect ratios.",
      },
      {
        type: "fix",
        text: "Vercel 4.5MB Serverless Limit Fix: Optimized raster background templates and active custom font embedding to keep generated payload under 1MB.",
      },
      {
        type: "improvement",
        text: "Strict Database Validation & 404 Handling: Verifies participant existence in MongoDB before rendering, returning proper 404 status on invalid serial numbers.",
      },
      {
        type: "improvement",
        text: "Multi-Tier Caching: In-memory caching for SVG, PNG, and PDF outputs reduces repeat retrieval times to ~1ms.",
      },
    ],
  },
  {
    version: "v1.2.4",
    title: "VeriMoo Modern Blue-Indigo-Purple SaaS Design Architecture",
    date: "August 28, 2026",
    isLatest: false,
    summary:
      "A complete UI/UX modernization engineered around the VeriMoo brand gradient, 70/20/10 SaaS dashboard ratio, and instant client-side performance.",
    items: [
      {
        type: "ui",
        text: "Implemented the official VeriMoo SaaS Color System (#2563EB Blue → #4F46E5 Indigo → #7C3AED Purple) with clean 70% slate neutral foundation.",
      },
      {
        type: "feature",
        text: "Added dedicated Interactive Floating Changelog system with full release timeline from v1.0.0 to v1.2.4.",
      },
      {
        type: "ui",
        text: "Integrated official transparent VeriMoo branding logo across headers, login card, modals, and certificate verification seals.",
      },
      {
        type: "improvement",
        text: "Enhanced status badges with strict color semantic mappings (Verified: Green, Pending: Amber, Expired: Red, Emailed: Purple, Processing: Blue).",
      },
      {
        type: "feature",
        text: "Team Role Architecture: Added primary selection between Super Admin (unlimited platform-wide project view and administration) and Simple User (scoped project view with custom creation limits and permissions).",
      },
      {
        type: "feature",
        text: "Added 'Who We Are' Ahsan & Team Showcase & Engineering Quote with direct LinkedIn and GitHub links.",
      },
      {
        type: "improvement",
        text: "Mobile View Protection: Added desktop editing recommendation banner and locked canvas component positions as fixed in mobile view to prevent displacement.",
      },
      {
        type: "feature",
        text: "HD PNG Default Download Engine: Made ultra high-definition 300 DPI PNG the primary default format for single certificate downloads across the public portal, verification page, and admin management, with optional vector SVG download.",
      },
      {
        type: "improvement",
        text: "Production Rendering: Added cross-platform font fallbacks, XML namespace safeguards (xmlns:xlink), and programmatic blob streaming to guarantee seamless preview and downloads in all environments.",
      },
      {
        type: "improvement",
        text: "Updated ProgressBar to animate with the VeriMoo tri-color brand gradient with zero layout delay.",
      },
    ],
  },
  {
    version: "v1.2.3",
    title: "Participant Lifecycle Automation & Superadmin Team Intelligence",
    date: "August 27, 2026",
    isLatest: false,
    summary:
      "Automated certificate status tracking from Pending to Issued, added live superadmin team analytics, and integrated the Inter variable font engine.",
    items: [
      {
        type: "feature",
        text: "Automatic participant status progression: records automatically transition from 'Pending' to 'Issued' upon certificate generation, single SVG download, or bulk ZIP export.",
      },
      {
        type: "feature",
        text: "Superadmin Team Count Metrics: added real-time team member counter card on Admin Dashboard and dedicated 3-metric overview on Team page.",
      },
      {
        type: "improvement",
        text: "Integrated Google Font Inter with full weight spectrum (300 to 800) and international unicode subset support (Latin, Cyrillic, Greek, Vietnamese).",
      },
      {
        type: "fix",
        text: "Fixed Mongoose 7/8 deprecation warning by upgrading findOneAndUpdate queries to use returnDocument: 'after'.",
      },
    ],
  },
  {
    version: "v1.2.2",
    title: "Responsive SaaS Navigation & Design System Foundations",
    date: "August 25, 2026",
    isLatest: false,
    summary:
      "Engineered adaptive multi-breakpoint navbar layout, standardized reusable component tokens, and implemented WCAG AA accessibility.",
    items: [
      {
        type: "ui",
        text: "Responsive header architecture with sticky backdrop-blur, active route indicator pills, user avatar, and smooth mobile sliding drawer.",
      },
      {
        type: "improvement",
        text: "Standardized reusable UI component library: Button micro-interactions, dark mode Card elevations, and Accessible Modals with Escape dismissal.",
      },
      {
        type: "improvement",
        text: "High-contrast focus-visible outlines and automatic animation reduction for users with prefers-reduced-motion: reduce.",
      },
      {
        type: "ui",
        text: "Upgraded verification result views with dynamic gradient themes, credential metadata cards, and direct SVG export links.",
      },
    ],
  },
  {
    version: "v1.2.1",
    title: "High-Resolution 300 DPI Rendering & Custom Font Studio",
    date: "August 20, 2026",
    isLatest: false,
    summary:
      "Vector-sharp 300 DPI print rendering, custom font uploads with metric locking, and canvas drag-and-drop studio upgrades.",
    items: [
      {
        type: "feature",
        text: "300 DPI Print-Ready PNG engine rendered directly from SVG vectors without browser rasterization blur at 100% scale.",
      },
      {
        type: "feature",
        text: "Custom Font Uploader supporting TTF, OTF, WOFF, and WOFF2 with automatic font sanitization and embedded base64 storage.",
      },
      {
        type: "improvement",
        text: "Locked font metrics in studio canvas to guarantee 1:1 identical preview rendering with exported certificates.",
      },
      {
        type: "improvement",
        text: "Added canvas Zoom-to-Fit mode and paper size presets (A4 Landscape, A4 Portrait, US Letter Landscape, US Letter Portrait).",
      },
    ],
  },
  {
    version: "v1.2.0",
    title: "Live QR Verification Engine & Anti-Abuse Protection",
    date: "August 14, 2026",
    isLatest: false,
    summary:
      "Public verification portal, dynamic vector QR codes with cryptographic serial lookup, and IP rate limiting.",
    items: [
      {
        type: "feature",
        text: "Public verification portal at /verify/[serial] with instant authenticity check, organization logos, and issued credential parameters.",
      },
      {
        type: "feature",
        text: "Vector QR Code Generation embedded directly into SVG certificates linking to live verification URLs.",
      },
      {
        type: "security",
        text: "Implemented IP-based sliding window rate limiter on verification endpoints to prevent brute-force serial enumeration.",
      },
      {
        type: "feature",
        text: "Live certificate search bar on homepage with real-time feedback and dynamic SVG preview modal.",
      },
    ],
  },
  {
    version: "v1.1.5",
    title: "Bulk Excel Roster Importer & Batch ZIP Export",
    date: "August 08, 2026",
    isLatest: false,
    summary:
      "Process hundreds of participant records simultaneously via Excel spreadsheets and export all certificates in bulk ZIP archives.",
    items: [
      {
        type: "feature",
        text: "Excel (.xlsx) and CSV spreadsheet importer with automatic column detection for Name, Email, Course, Date, and Custom Fields.",
      },
      {
        type: "feature",
        text: "Batch ZIP Exporter that streams high-resolution PNG certificates for an entire cohort into a single compressed archive.",
      },
      {
        type: "improvement",
        text: "Detailed import error reports with downloadable skip-row CSV logs for mismatched or duplicate serial records.",
      },
      {
        type: "improvement",
        text: "Added real-time participant search and instant pagination filtering in the Studio dashboard.",
      },
    ],
  },
  {
    version: "v1.1.0",
    title: "Superadmin Role Permissions, Automated Gmail SMTP & AI Assistant",
    date: "August 01, 2026",
    isLatest: false,
    summary:
      "Multi-tenant administrator management with role quotas, automated Gmail dispatch, and AI text suggestions.",
    items: [
      {
        type: "feature",
        text: "Superadmin Team Management portal with role assignments (Superadmin vs Admin), project limits, and granular permission controls.",
      },
      {
        type: "feature",
        text: "Automated Gmail SMTP Integration: Dispatch personalized certificates directly to participant inboxes with encrypted credentials.",
      },
      {
        type: "feature",
        text: "AI Field Assistant: Gemini AI integration for generating compelling certificate titles, completion descriptions, and commendation texts.",
      },
      {
        type: "security",
        text: "AES-256 encrypted storage for third-party Gmail application passwords in MongoDB.",
      },
    ],
  },
  {
    version: "v1.0.0",
    title: "VeriMoo Core Certificate Engine Launch",
    date: "July 15, 2026",
    isLatest: false,
    summary:
      "Initial launch of the VeriMoo Digital Certificate Management and Verification Platform.",
    items: [
      {
        type: "feature",
        text: "Full Next.js App Router full-stack web application with MongoDB/Mongoose data models.",
      },
      {
        type: "feature",
        text: "Dynamic Vector SVG Certificate Builder with drag-and-drop text fields, variable font sizing, colors, and alignments.",
      },
      {
        type: "security",
        text: "NextAuth.js authentication system with bcrypt password hashing and secure session cookies.",
      },
      {
        type: "feature",
        text: "Serial number auto-increment generator with customizable project prefixes (e.g., CERT-00001).",
      },
    ],
  },
];

