// One well-built, responsive verification page layout, themed per
// certificate type — rather than ten disconnected one-off designs of
// inconsistent quality. Each entry drives the headline, icon, and color
// accent shown on /verify/[serial].
export const VERIFICATION_THEMES = {
  course_completion: { label: "Course Completion", headline: "has successfully completed the course", icon: "🎓", accent: "#4f46e5", gradient: ["#4f46e5", "#7c3aed"] },
  webinar: { label: "Webinar", headline: "attended the webinar", icon: "💻", accent: "#0891b2", gradient: ["#0891b2", "#0ea5e9"] },
  appreciation: { label: "Appreciation", headline: "is recognized with appreciation", icon: "🌟", accent: "#d97706", gradient: ["#d97706", "#f59e0b"] },
  attendance: { label: "Attendance", headline: "is confirmed in attendance", icon: "📋", accent: "#0d9488", gradient: ["#0d9488", "#14b8a6"] },
  workshop: { label: "Workshop", headline: "participated in the workshop", icon: "🛠️", accent: "#7c3aed", gradient: ["#7c3aed", "#a855f7"] },
  training: { label: "Training", headline: "completed the training program", icon: "📈", accent: "#2563eb", gradient: ["#2563eb", "#3b82f6"] },
  achievement: { label: "Achievement", headline: "has achieved a milestone", icon: "🏆", accent: "#ca8a04", gradient: ["#ca8a04", "#eab308"] },
  participation: { label: "Participation", headline: "participated in", icon: "🤝", accent: "#059669", gradient: ["#059669", "#10b981"] },
  internship: { label: "Internship", headline: "completed the internship", icon: "💼", accent: "#475569", gradient: ["#475569", "#64748b"] },
  excellence_award: { label: "Excellence Award", headline: "is awarded for excellence", icon: "🏅", accent: "#be123c", gradient: ["#be123c", "#e11d48"] },
};

export const VERIFICATION_THEME_OPTIONS = Object.entries(VERIFICATION_THEMES).map(([value, t]) => ({
  value,
  label: t.label,
}));
