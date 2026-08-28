import mongoose from "mongoose";

const FieldSchema = new mongoose.Schema(
  {
    id: String,
    key: String, // e.g. participantName, serialNumber, courseTitle, date, orgName, qrCode, static, custom_1
    label: String,
    type: { type: String, enum: ["text", "qr", "image"], default: "text" },
    x: { type: Number, default: 50 }, // percentage of width
    y: { type: Number, default: 50 }, // percentage of height
    fontSize: { type: Number, default: 24 },
    fontFamily: { type: String, default: "Helvetica" },
    letterSpacing: { type: Number, default: 0 }, // px, applied as SVG letter-spacing
    color: { type: String, default: "#111111" },
    align: { type: String, enum: ["left", "center", "right"], default: "center" },
    bold: { type: Boolean, default: false },
    italic: { type: Boolean, default: false },
    underline: { type: Boolean, default: false },
    // Literal text for static/heading fields (key: "static"), e.g. "Certificate
    // of Appreciation" — rendered as-is, not resolved from participant data.
    content: { type: String, default: "" },
    size: { type: Number, default: 100 }, // for qr/image, box size in px
  },
  { _id: false }
);

// The certificate "type" drives the verification page's headline wording,
// icon, and color accent (see lib/verificationThemes.js) — one well-built
// themeable layout rather than ten disconnected one-off designs.
const CERTIFICATE_TYPES = [
  "course_completion",
  "webinar",
  "appreciation",
  "attendance",
  "workshop",
  "training",
  "achievement",
  "participation",
  "internship",
  "excellence_award",
];

const CustomFontSchema = new mongoose.Schema(
  {
    // Sanitized to a safe CSS identifier before storage — see
    // sanitizeFontFamilyName in the projects/[id] route — since this value
    // is used directly as a CSS font-family name in a <style> block on both
    // the server (generation) and client (preview), and an unsanitized name
    // would be a CSS/HTML injection vector in the preview's
    // dangerouslySetInnerHTML style tag.
    name: { type: String, required: true },
    data: { type: String, required: true }, // base64 data URI of the font file
    mimeType: String,
  },
  { _id: false }
);

const ProjectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: String,
    organizationName: String,
    templateSvg: { type: String, default: "" }, // raw SVG markup of an uploaded *vector* template
    templateImage: {
      data: String, // base64 data URI of an uploaded *raster* template (png/jpg/etc)
      mimeType: String,
    },
    templateWidth: { type: Number, default: 1000 },
    templateHeight: { type: Number, default: 700 },
    fields: { type: [FieldSchema], default: [] },
    serialPrefix: { type: String, default: "CERT" },
    serialCounter: { type: Number, default: 0 },
    dateFormat: { type: String, default: "DD-MM-YYYY" },
    aiSuggestionsEnabled: { type: Boolean, default: true },
    // Up to 3 per project (enforced in the API route, not just the schema —
    // see MAX_CUSTOM_FONTS in app/api/projects/[id]/route.js), embedded into
    // every generated certificate and the editor preview under their own
    // font-family name (lib/certificate.js, app/admin/projects/[id]/page.tsx).
    customFonts: { type: [CustomFontSchema], default: [] },
    branding: {
      logoUrl: String,
      primaryColor: { type: String, default: "#4f46e5" },
    },

    verificationTemplate: { type: String, enum: CERTIFICATE_TYPES, default: "course_completion" },
    footer: {
      companyName: String,
      contactEmail: String,
    },

    emailConfig: {
      enabled: { type: Boolean, default: false },
      gmailAddress: String,
      // AES-256-GCM encrypted Gmail app password — see lib/crypto.js. Never
      // store or return the plaintext password once set.
      gmailAppPasswordEncrypted: String,
    },

    // Per-project optional feature toggles, so different clients on the same
    // install can each have a different configuration without affecting one
    // another. Everything here defaults on except email (which requires
    // explicit credentials anyway).
    settings: {
      emailSending: { type: Boolean, default: false },
      verificationFooter: { type: Boolean, default: true },
      verificationTemplates: { type: Boolean, default: true }, // themed vs. plain verification page
      logoDisplay: { type: Boolean, default: true },
      creatorInfo: { type: Boolean, default: true },
      fontCustomization: { type: Boolean, default: true },
      locationTracking: { type: Boolean, default: true }, // shows org/issuing-location line on verify page
      certificateVerificationPage: { type: Boolean, default: true }, // fully enable/disable public /verify
      qrCode: { type: Boolean, default: true },
      customBranding: { type: Boolean, default: true },
      importValidation: { type: Boolean, default: true }, // strict vs. lenient Excel import
      loadingAnimations: { type: Boolean, default: true }, // Framer Motion in the admin UI
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
  },
  { timestamps: true }
);

ProjectSchema.index({ createdBy: 1 });

export default mongoose.models.Project || mongoose.model("Project", ProjectSchema);
