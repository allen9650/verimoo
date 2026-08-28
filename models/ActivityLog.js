import mongoose from "mongoose";

const ActivityLogSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
    admin: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
    action: String, // e.g. "created_project", "imported_participants", "generated_certificate"
    details: String,
  },
  { timestamps: true }
);

export default mongoose.models.ActivityLog ||
  mongoose.model("ActivityLog", ActivityLogSchema);
