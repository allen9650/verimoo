import ActivityLog from "@/models/ActivityLog";

export async function logActivity({ project, admin, action, details }) {
  try {
    await ActivityLog.create({ project, admin, action, details });
  } catch (e) {
    console.error("Failed to log activity", e);
  }
}
