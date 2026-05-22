// Shared constants and helpers for group detail pages

export type GroupStatus = "not_started" | "in_progress" | "completed"

export const STATUS_META: Record<GroupStatus, { label: string; dot: string; text: string; bg: string; border: string }> = {
  not_started: { label: "Pas commencé", dot: "#94a3b8", text: "#475569", bg: "#f1f5f9",  border: "#e2e8f0" },
  in_progress:  { label: "En cours",    dot: "var(--accent)", text: "color-mix(in oklch, var(--accent) 85%, black)", bg: "color-mix(in oklch, var(--accent) 12%, white)",  border: "color-mix(in oklch, var(--accent) 45%, white)" },
  completed:    { label: "Terminé",     dot: "#22c55e", text: "#15803d", bg: "#dcfce7",  border: "#86efac" },
}

export const AVATAR_COLORS = ["var(--accent)","#8b5cf6","#7c3aed","#10b981","#f59e0b","#ef4444","#ec4899","#a78bfa"]

export function fmtDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })
}

export function initials(name: string, surname: string) {
  return ((name?.[0] || "") + (surname?.[0] || "")).toUpperCase() || "?"
}

export function avatarColor(id: string) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffffffff
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}
