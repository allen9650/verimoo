import mongoose from "mongoose";

const AdminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["superadmin", "admin"], default: "admin" },
    // Sub-admins (role "admin") are created by a superadmin and can be
    // capped on how many projects they're allowed to create. `null` means
    // unlimited (always true for superadmins, optionally true for sub-admins).
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
    maxProjects: { type: Number, default: null },
    // Only "canDeleteProjects" is actually enforced today (see
    // app/api/projects/[id]/route.js) — the others are scaffolded for future
    // routes to check, so the shape of permission management is in place
    // without pretending every permission is wired up yet.
    permissions: {
      canDeleteProjects: { type: Boolean, default: true },
      canManageParticipants: { type: Boolean, default: true },
      canManageTemplates: { type: Boolean, default: true },
    },
    // Simple lifetime cap on Gemini AI-suggestion usage per admin, measured
    // in tokens reported back by the Gemini API's usageMetadata.
    aiTokenLimit: { type: Number, default: 20000 },
    aiTokensUsed: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.models.Admin || mongoose.model("Admin", AdminSchema);
