import mongoose from "mongoose";

const ParticipantSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    serialNumber: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: String,
    courseTitle: String,
    date: Date,
    customFields: { type: Map, of: String, default: {} },
    status: { type: String, enum: ["pending", "issued", "generated", "emailed"], default: "pending" },
    emailedAt: Date,
  },
  { timestamps: true }
);

ParticipantSchema.index({ project: 1, name: 1 });

export default mongoose.models.Participant ||
  mongoose.model("Participant", ParticipantSchema);
