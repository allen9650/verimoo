import mongoose from "mongoose";

const TextTemplateSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    content: { type: String, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
  },
  { timestamps: true }
);

export default mongoose.models.TextTemplate || mongoose.model("TextTemplate", TextTemplateSchema);
