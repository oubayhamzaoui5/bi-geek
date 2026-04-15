"use client"

import { useEffect, useState, useCallback, useMemo, useRef } from "react"
import { useSearchParams } from "next/navigation"
import {
  ChevronLeft, ChevronRight, Calendar, List, Grid3X3,
  Wifi, MapPin, MonitorSmartphone, HelpCircle,
  X, Save, Trash2, Clock, Users, AlertCircle,
  Plus, Check, Loader2,
} from "lucide-react"
import { AdminPageHeader } from "@/components/admin/AdminPageHeader"

// ── Types ──────────────────────────────────────────────────────────────────────

type SessionMode = "live" | "presentiel" | "live_presentiel" | "not_set"

type Session = {
  id: string | null
  group: string
  groupTitle: string
  date: string          // YYYY-MM-DD
  start_time: string    // HH:MM
  duration: number      // minutes
  mode: SessionMode
  title: string | null
  notes: string
  is_cancelled: boolean
  instructor: string | null
  virtual: boolean
}

type ScheduleSlot = {
  day: string
  start_time: string
  duration: number
}

type Group = {
  id: string
  title: string
  status: "not_started" | "in_progress" | "completed"
  schedules: ScheduleSlot[]
  schedule_start_date?: string
  schedule_end_date?: string
}

// ── Constants ──────────────────────────────────────────────────────────────────

const DAYS_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]
const DAYS_FULL_FR = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]
const MONTHS_FR = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"]

const HOUR_START = 7
const HOUR_END = 22
const SLOT_HEIGHT = 64 // px per hour

const MODE_META: Record<SessionMode, {
  label: string; color: string; bg: string; border: string; icon: React.ElementType
}> = {
  live: {
    label: "Live", color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe",
    icon: Wifi,
  },
  presentiel: {
    label: "Présentiel", color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0",
    icon: MapPin,
  },
  live_presentiel: {
    label: "Live + Présentiel", color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe",
    icon: MonitorSmartphone,
  },
  not_set: {
    label: "Non défini", color: "#64748b", bg: "#f8fafc", border: "#e2e8f0",
    icon: HelpCircle,
  },
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay() // 0=Sun
  const diff = day === 0 ? -6 : 1 - day // Monday-based
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function toYMD(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function parseTime(time: string): number {
  // Returns total minutes from midnight
  if (!time) return 9 * 60
  const [h, m] = time.split(":").map(Number)
  return (h || 0) * 60 + (m || 0)
}

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h${m}` : `${h}h`
}

// Returns {col, totalCols} for each session so overlapping ones sit side-by-side.
function computeColumns(sessions: Session[]): Map<string, { col: number; totalCols: number }> {
  const indexed = sessions.map((s, i) => ({
    key: s.id ?? `__v${i}`,
    start: parseTime(s.start_time),
    end: parseTime(s.start_time) + Math.max(s.duration, 1),
  }))

  // Greedy column assignment: find first column whose last session has already ended
  const cols: number[] = new Array(indexed.length).fill(0)
  const colEnd: number[] = []

  for (let i = 0; i < indexed.length; i++) {
    let col = 0
    while (colEnd[col] !== undefined && colEnd[col] > indexed[i].start) col++
    cols[i] = col
    colEnd[col] = indexed[i].end
  }

  // totalCols for a session = max col among all sessions it time-overlaps + 1
  const result = new Map<string, { col: number; totalCols: number }>()
  for (let i = 0; i < indexed.length; i++) {
    let maxCol = cols[i]
    for (let j = 0; j < indexed.length; j++) {
      if (i !== j && indexed[i].start < indexed[j].end && indexed[j].start < indexed[i].end) {
        maxCol = Math.max(maxCol, cols[j])
      }
    }
    result.set(indexed[i].key, { col: cols[i], totalCols: maxCol + 1 })
  }
  return result
}

// ── Toast ─────────────────────────────────────────────────────────────────────

type ToastMsg = { id: string; type: "ok" | "err"; text: string }

function useToast() {
  const [toasts, setToasts] = useState<ToastMsg[]>([])
  const push = useCallback((type: "ok" | "err", text: string) => {
    const id = Math.random().toString(36).slice(2)
    setToasts(p => [...p, { id, type, text }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3200)
  }, [])
  return { toasts, push }
}

// ── Session Edit Panel ────────────────────────────────────────────────────────

function SessionPanel({
  session,
  groups,
  onClose,
  onSave,
  onDelete,
}: {
  session: Session
  groups: Group[]
  onClose: () => void
  onSave: (s: Session, updateMode: "single" | "all_following") => Promise<void>
  onDelete: (s: Session) => Promise<void>
}) {
  const [draft, setDraft] = useState<Session>({ ...session })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [updateMode, setUpdateMode] = useState<"single" | "all_following">("single")
  const isPast = session.date < toYMD(new Date())

  const group = groups.find(g => g.id === draft.group)
  const dateFmt = (() => {
    const d = new Date(draft.date + "T12:00:00")
    return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
  })()

  const meta = MODE_META[draft.mode]
  const ModeIcon = meta.icon

  async function save() {
    setSaving(true)
    try { await onSave(draft, updateMode) } finally { setSaving(false) }
  }

  async function del() {
    if (!session.id) return
    setDeleting(true)
    try { await onDelete(draft) } finally { setDeleting(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end pointer-events-none">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-[2px] pointer-events-auto"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="relative pointer-events-auto w-full max-w-[420px] bg-white shadow-2xl
          flex flex-col border-l border-gray-100 animate-in slide-in-from-right-8 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: meta.bg, border: `1px solid ${meta.border}` }}
            >
              <ModeIcon size={16} style={{ color: meta.color }} />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-gray-900">
                {draft.title || group?.title || "Session"}
              </p>
              <p className="text-[11px] text-gray-400 capitalize">{dateFmt}</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400
              hover:bg-gray-100 hover:text-gray-600 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className={`flex-1 overflow-y-auto px-6 py-5 space-y-5 ${isPast ? "pointer-events-none" : ""}`}>

          {/* Past session banner */}
          {isPast && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-100">
              <AlertCircle size={14} className="text-amber-500 shrink-0" />
              <span className="text-[12px] text-amber-700 font-medium">Session passée – non modifiable</span>
            </div>
          )}

          {/* Cancelled banner */}
          {draft.is_cancelled && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-100">
              <AlertCircle size={14} className="text-red-500 shrink-0" />
              <span className="text-[12px] text-red-600 font-medium">Session annulée</span>
            </div>
          )}

          {/* Group info */}
          <div className="flex items-center gap-2 text-[12px] text-gray-500">
            <Users size={13} />
            <span className="font-medium text-gray-700">{group?.title || draft.group}</span>
          </div>

          {/* Time / Duration */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                Heure de début
              </label>
              <input
                type="time"
                value={draft.start_time}
                onChange={e => setDraft(d => ({ ...d, start_time: e.target.value }))}
                className="w-full h-9 px-3 rounded-lg border border-gray-200 text-[13px]
                  text-gray-800 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400/20"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                Durée (min)
              </label>
              <input
                type="number"
                min={15}
                max={480}
                step={15}
                value={draft.duration}
                onChange={e => setDraft(d => ({ ...d, duration: parseInt(e.target.value) || 120 }))}
                className="w-full h-9 px-3 rounded-lg border border-gray-200 text-[13px]
                  text-gray-800 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400/20"
              />
            </div>
          </div>

          {/* Mode */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
              Mode de session
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(MODE_META) as SessionMode[]).map((m) => {
                const mm = MODE_META[m]
                const MIcon = mm.icon
                const active = draft.mode === m
                return (
                  <button
                    key={m}
                    onClick={() => setDraft(d => ({ ...d, mode: m }))}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg border text-[12px]
                      font-medium transition-all"
                    style={{
                      background: active ? mm.bg : "#fff",
                      borderColor: active ? mm.color : "#e5e7eb",
                      color: active ? mm.color : "#6b7280",
                    }}
                  >
                    <MIcon size={13} />
                    <span>{mm.label}</span>
                    {active && <Check size={12} className="ml-auto" />}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Cancel toggle */}
          <div className="flex items-center justify-between py-3 px-3 rounded-lg bg-gray-50 border border-gray-100">
            <div>
              <p className="text-[12px] font-semibold text-gray-700">Annuler la session</p>
              <p className="text-[11px] text-gray-400">Marquer comme annulée</p>
            </div>
            <button
              onClick={() => setDraft(d => ({ ...d, is_cancelled: !d.is_cancelled }))}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors
                ${draft.is_cancelled ? "bg-red-500" : "bg-gray-200"}`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform
                  ${draft.is_cancelled ? "translate-x-4" : "translate-x-0.5"}`}
              />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 space-y-3">
          {/* Update scope — only for existing, non-past sessions */}
          {!isPast && session.id && (
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setUpdateMode("single")}
                className={`flex-1 h-7 rounded-md text-[11px] font-medium transition-all
                  ${updateMode === "single"
                    ? "bg-white text-gray-800 shadow-sm"
                    : "text-gray-400 hover:text-gray-600"}`}
              >
                Cette session
              </button>
              <button
                onClick={() => setUpdateMode("all_following")}
                className={`flex-1 h-7 rounded-md text-[11px] font-medium transition-all
                  ${updateMode === "all_following"
                    ? "bg-white text-gray-800 shadow-sm"
                    : "text-gray-400 hover:text-gray-600"}`}
              >
                Toutes les suivantes
              </button>
            </div>
          )}
          <div className="flex items-center gap-2">
            {session.id && !isPast && (
              <button
                onClick={del}
                disabled={deleting}
                className="flex items-center gap-1.5 h-9 px-3 rounded-lg text-[12px] font-medium
                  text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100
                  transition-all disabled:opacity-50"
              >
                {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                Supprimer
              </button>
            )}
            <button
              onClick={onClose}
              className="h-9 px-4 rounded-lg border border-gray-200 text-[12px] font-medium
                text-gray-500 hover:bg-gray-50 transition-colors ml-auto"
            >
              Fermer
            </button>
            {!isPast && (
              <button
                onClick={save}
                disabled={saving}
                className="flex items-center gap-1.5 h-9 px-4 rounded-lg text-[12px] font-semibold
                  text-white bg-violet-600 hover:bg-violet-700 transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                Enregistrer
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Schedule Edit Modal (multi-slot per group) ────────────────────────────────

const DAYS_OPTIONS = [
  { val: "monday",    short: "Lun", label: "Lundi" },
  { val: "tuesday",   short: "Mar", label: "Mardi" },
  { val: "wednesday", short: "Mer", label: "Mercredi" },
  { val: "thursday",  short: "Jeu", label: "Jeudi" },
  { val: "friday",    short: "Ven", label: "Vendredi" },
  { val: "saturday",  short: "Sam", label: "Samedi" },
  { val: "sunday",    short: "Dim", label: "Dimanche" },
]

function emptySlot(): ScheduleSlot {
  return { day: "monday", start_time: "09:00", duration: 120 }
}

function SlotRow({
  slot,
  index,
  onChange,
  onRemove,
}: {
  slot: ScheduleSlot
  index: number
  onChange: (i: number, s: ScheduleSlot) => void
  onRemove: (i: number) => void
}) {
  const set = (patch: Partial<ScheduleSlot>) => onChange(index, { ...slot, ...patch })

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
          Séance {index + 1}
        </span>
        <button
          onClick={() => onRemove(index)}
          className="w-6 h-6 flex items-center justify-center rounded-md text-gray-300
            hover:text-red-400 hover:bg-red-50 transition-colors"
        >
          <X size={13} />
        </button>
      </div>

      {/* Day picker */}
      <div className="flex flex-wrap gap-1">
        {DAYS_OPTIONS.map(d => (
          <button
            key={d.val}
            onClick={() => set({ day: d.val })}
            className={`px-2 py-1 rounded-md text-[11px] font-semibold border transition-all
              ${slot.day === d.val
                ? "bg-violet-600 text-white border-violet-600"
                : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
              }`}
          >
            {d.short}
          </button>
        ))}
      </div>

      {/* Time + Duration */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">
            Heure
          </label>
          <input
            type="time"
            value={slot.start_time}
            onChange={e => set({ start_time: e.target.value })}
            className="w-full h-8 px-2 rounded-lg border border-gray-200 text-[12px]
              focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400/20 bg-white"
          />
        </div>
        <div>
          <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">
            Durée (min)
          </label>
          <input
            type="number"
            min={15} max={480} step={15}
            value={slot.duration}
            onChange={e => set({ duration: parseInt(e.target.value) || 120 })}
            className="w-full h-8 px-2 rounded-lg border border-gray-200 text-[12px]
              focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400/20 bg-white"
          />
        </div>
      </div>
    </div>
  )
}

function GroupScheduleModal({
  group,
  onClose,
  onSave,
}: {
  group: Group
  onClose: () => void
  onSave: (g: Group) => Promise<void>
}) {
  const [slots, setSlots] = useState<ScheduleSlot[]>(
    group.schedules.length > 0 ? group.schedules.map(s => ({ ...s })) : [emptySlot()]
  )
  const [startDate, setStartDate] = useState(group.schedule_start_date || "")
  const [endDate, setEndDate] = useState(group.schedule_end_date || "")
  const [saving, setSaving] = useState(false)

  function handleChange(i: number, s: ScheduleSlot) {
    setSlots(prev => prev.map((p, idx) => idx === i ? s : p))
  }

  function handleRemove(i: number) {
    setSlots(prev => prev.filter((_, idx) => idx !== i))
  }

  async function save() {
    setSaving(true)
    try {
      await onSave({
        ...group,
        schedules: slots.filter(s => s.day && s.start_time),
        schedule_start_date: startDate || undefined,
        schedule_end_date: endDate || undefined,
      })
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-lg mx-4
        animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-[14px] font-bold text-gray-900">Planning hebdomadaire</h2>
            <p className="text-[12px] text-gray-400 mt-0.5">{group.title}</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

          {/* Period — shared by all séances */}
          <div className="rounded-xl border border-violet-100 bg-violet-50/40 p-4 space-y-3">
            <p className="text-[11px] font-bold text-violet-500 uppercase tracking-wider">
              Période du groupe
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                  Date de début
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-gray-200 text-[12px]
                    focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400/20 bg-white"
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                  Date de fin
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-gray-200 text-[12px]
                    focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400/20 bg-white"
                />
              </div>
            </div>
          </div>

          {/* Séances */}
          <div className="space-y-3">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Séances hebdomadaires
            </p>

            {slots.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Clock size={28} className="text-gray-200 mb-2" />
                <p className="text-[12px] text-gray-400">Aucune séance définie</p>
                <p className="text-[11px] text-gray-300 mt-0.5">Ajoutez une séance pour générer les sessions automatiquement</p>
              </div>
            )}

            {slots.map((slot, i) => (
              <SlotRow
                key={i}
                slot={slot}
                index={i}
                onChange={handleChange}
                onRemove={handleRemove}
              />
            ))}

            <button
              onClick={() => setSlots(prev => [...prev, emptySlot()])}
              className="w-full flex items-center justify-center gap-2 h-10 rounded-xl border border-dashed
                border-gray-300 text-[12px] font-medium text-gray-400 hover:border-violet-400
                hover:text-violet-600 hover:bg-violet-50/50 transition-all"
            >
              <Plus size={14} />
              Ajouter une séance
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-between items-center shrink-0">
          <p className="text-[11px] text-gray-400">
            {slots.length} séance{slots.length > 1 ? "s" : ""} / semaine
          </p>
          <div className="flex gap-2">
            <button onClick={onClose}
              className="h-9 px-4 rounded-lg border border-gray-200 text-[12px] font-medium text-gray-500 hover:bg-gray-50 transition-colors">
              Annuler
            </button>
            <button onClick={save} disabled={saving}
              className="flex items-center gap-1.5 h-9 px-4 rounded-lg text-[12px] font-semibold text-white bg-violet-600 hover:bg-violet-700 transition-colors disabled:opacity-50">
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Week Grid View ─────────────────────────────────────────────────────────────

function WeekGrid({
  weekStart,
  sessions,
  onSessionClick,
  groupColorMap,
}: {
  weekStart: Date
  sessions: Session[]
  onSessionClick: (s: Session) => void
  groupColorMap: Map<string, string>
}) {
  const today = toYMD(new Date())
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const hours = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i)
  const [hoveredKey, setHoveredKey] = useState<string | null>(null)
  const hoverExitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (hoverExitTimeoutRef.current) {
        clearTimeout(hoverExitTimeoutRef.current)
      }
    }
  }, [])

  const handleSessionMouseEnter = (sessionKey: string) => {
    if (hoverExitTimeoutRef.current) {
      clearTimeout(hoverExitTimeoutRef.current)
      hoverExitTimeoutRef.current = null
    }
    setHoveredKey(sessionKey)
  }

  const handleSessionMouseLeave = () => {
    if (hoverExitTimeoutRef.current) {
      clearTimeout(hoverExitTimeoutRef.current)
    }
    hoverExitTimeoutRef.current = setTimeout(() => {
      setHoveredKey(null)
      hoverExitTimeoutRef.current = null
    }, 300)
  }

  function getSessionsForDay(date: Date): Session[] {
    const ymd = toYMD(date)
    return sessions.filter(s => s.date === ymd)
  }

  function positionForSession(s: Session) {
    const startMin = parseTime(s.start_time)
    const top = ((startMin - HOUR_START * 60) / 60) * SLOT_HEIGHT
    const height = Math.max((s.duration / 60) * SLOT_HEIGHT, 24)
    return { top, height }
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Day headers */}
      <div className="flex border-b border-gray-100 bg-white shrink-0">
        {/* Time gutter label */}
        <div className="w-16 shrink-0 border-r border-gray-100" />
        {days.map((d, i) => {
          const ymd = toYMD(d)
          const isToday = ymd === today
          return (
            <div
              key={i}
              className="flex-1 min-w-0 flex flex-col items-center py-2.5 gap-0.5 border-r border-gray-100 last:border-r-0"
            >
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                {DAYS_FR[i]}
              </span>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-[14px] font-bold transition-colors
                  ${isToday ? "bg-violet-600 text-white" : "text-gray-700"}`}
              >
                {d.getDate()}
              </div>
            </div>
          )
        })}
      </div>

      {/* Scrollable grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex" style={{ minHeight: `${(HOUR_END - HOUR_START) * SLOT_HEIGHT}px` }}>
          {/* Hour labels */}
          <div className="w-16 shrink-0 border-r border-gray-100 relative">
            {hours.map(h => (
              <div
                key={h}
                className="absolute right-2 text-[10px] text-gray-400 font-medium leading-none"
                style={{ top: (h - HOUR_START) * SLOT_HEIGHT - 6 }}
              >
                {String(h).padStart(2, "0")}:00
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((d, di) => {
            const daySessions = getSessionsForDay(d)
            return (
              <div
                key={di}
                className="flex-1 min-w-0 relative border-r border-gray-100 last:border-r-0"
              >
                {/* Hour lines */}
                {hours.map(h => (
                  <div
                    key={h}
                    className="absolute left-0 right-0 border-t border-gray-100"
                    style={{ top: (h - HOUR_START) * SLOT_HEIGHT }}
                  />
                ))}

                {/* Half-hour lines */}
                {hours.map(h => (
                  <div
                    key={`h-${h}`}
                    className="absolute left-0 right-0 border-t border-gray-50"
                    style={{ top: (h - HOUR_START) * SLOT_HEIGHT + SLOT_HEIGHT / 2 }}
                  />
                ))}

                {/* Sessions — side-by-side when overlapping */}
                {(() => {
                  const colMap = computeColumns(daySessions)
                  const hoveredSession = hoveredKey
                    ? daySessions.find((hs, hsi) => (hs.id ?? `__v${hsi}`) === hoveredKey)
                    : null
                  const hoveredMeta = hoveredKey ? colMap.get(hoveredKey) : undefined
                  const hoveredStart = hoveredSession ? parseTime(hoveredSession.start_time) : null
                  const hoveredEnd = hoveredSession
                    ? hoveredStart! + Math.max(hoveredSession.duration, 1)
                    : null
                  return daySessions.map((s, si) => {
                  const { top, height } = positionForSession(s)
                  const gc = groupColorMap.get(s.group) ?? "#475569"
                  const isCancelled = s.is_cancelled
                  const cardBg = isCancelled ? "#f3f4f6" : gc
                  const cardBorder = isCancelled ? "#fecaca" : gc
                  const primaryText = isCancelled ? "#dc2626" : "#ffffff"
                  const secondaryText = isCancelled ? "#ef4444" : "#ffffff"
                  const sessionKey = s.id ?? `__v${si}`
                  const { col, totalCols } = colMap.get(sessionKey) ?? { col: 0, totalCols: 1 }
                  const colWidthPct = 100 / totalCols
                  const leftPct = col * colWidthPct
                  const isHovered = hoveredKey === sessionKey
                  const start = parseTime(s.start_time)
                  const end = start + Math.max(s.duration, 1)

                  let widthPct = colWidthPct
                  let shiftLeftPct = leftPct

                  const overlapsHovered =
                    hoveredSession &&
                    hoveredStart !== null &&
                    hoveredEnd !== null &&
                    start < hoveredEnd &&
                    hoveredStart < end

                  if (overlapsHovered && hoveredMeta && totalCols > 1 && hoveredMeta.totalCols === totalCols) {
                    const hoveredCol = hoveredMeta.col
                    const expandedPct = Math.min(70, Math.max(52, 100 - (totalCols - 1) * 14))
                    const otherPct = (100 - expandedPct) / (totalCols - 1)

                    if (isHovered) {
                      widthPct = expandedPct
                      shiftLeftPct = hoveredCol * otherPct
                    } else {
                      widthPct = otherPct
                      shiftLeftPct = col < hoveredCol
                        ? col * otherPct
                        : col * otherPct + (expandedPct - otherPct)
                    }
                  }
                  return (
                    <button
                      key={si}
                      onClick={() => onSessionClick(s)}
                      onMouseEnter={() => handleSessionMouseEnter(sessionKey)}
                      onMouseLeave={handleSessionMouseLeave}
                      className="absolute rounded-lg px-2 py-1 text-left
                        hover:brightness-95 hover:shadow-md group overflow-hidden cursor-pointer"
                      style={{
                        top: top + 1,
                        height: Math.max(height - 2, 22),
                        left: `calc(${shiftLeftPct}% + 2px)`,
                        width: `calc(${widthPct}% - 4px)`,
                        zIndex: isHovered ? 20 : 1,
                        transition: "left 120ms ease, width 120ms ease, box-shadow 120ms ease",
                        background: cardBg,
                        border: `1.5px solid ${cardBorder}`,
                        opacity: 1,
                      }}
                    >
                      <div className="flex items-start gap-1 h-full">
                        <div className="min-w-0 flex-1">
                          <p
                            className="text-[11px] font-bold leading-tight break-words"
                            style={{
                              color: primaryText,
                              overflow: "hidden",
                              maxHeight: isHovered ? "7.2em" : "1.2em",
                              transition: "max-height 180ms ease",
                            }}
                          >
                            {s.title || s.groupTitle}
                          </p>
                          {height > 36 && (
                            <p className="text-[10px] leading-tight font-semibold  mt-0.5" style={{ color: secondaryText, opacity: 0.95 }}>
                              {s.start_time} · {formatDuration(s.duration)}
                            </p>
                          )}
                        </div>
                      </div>
                      {s.virtual && (
                        <div
                          className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full"
                          style={{ background: isCancelled ? "#ef4444" : gc, opacity: 0.4 }}
                          title="Généré automatiquement"
                        />
                      )}
                    </button>
                  )
                  })
                })()}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Month Grid View ────────────────────────────────────────────────────────────

function MonthGrid({
  year,
  month,
  sessions,
  onSessionClick,
  onDayClick,
  groupColorMap,
}: {
  year: number
  month: number
  sessions: Session[]
  onSessionClick: (s: Session) => void
  onDayClick: (date: Date) => void
  groupColorMap: Map<string, string>
}) {
  const today = toYMD(new Date())
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  // Calendar starts on Monday
  let startDay = firstDay.getDay()
  startDay = startDay === 0 ? 6 : startDay - 1

  const cells: (Date | null)[] = []
  for (let i = 0; i < startDay; i++) cells.push(null)
  for (let d = 1; d <= lastDay.getDate(); d++) cells.push(new Date(year, month, d))

  const weeks: (Date | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-gray-100 bg-white shrink-0">
        {DAYS_FR.map(d => (
          <div key={d} className="py-2 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            {d}
          </div>
        ))}
      </div>

      {/* Weeks */}
      <div className="flex-1 overflow-y-auto">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7" style={{ minHeight: 120 }}>
            {week.map((day, di) => {
              const ymd = day ? toYMD(day) : null
              const isToday = ymd === today
              const daySessions = ymd ? sessions.filter(s => s.date === ymd) : []

              return (
                <div
                  key={di}
                  className={`border-b border-r border-gray-100 p-1.5 last:border-r-0
                    ${day ? "cursor-pointer hover:bg-gray-50 transition-colors" : "bg-gray-50/50"}
                    ${di === 6 ? "border-r-0" : ""}`}
                  onClick={() => day && onDayClick(day)}
                >
                  {day && (
                    <>
                      <div className="flex justify-end mb-1">
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-medium
                            ${isToday ? "bg-violet-600 text-white" : "text-gray-600"}`}
                        >
                          {day.getDate()}
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        {daySessions.slice(0, 3).map((s, si) => {
                          const gc = groupColorMap.get(s.group) ?? "#475569"
                          const isCancelled = s.is_cancelled
                          const chipBg = isCancelled ? "#f3f4f6" : gc
                          const chipBorder = isCancelled ? "#fecaca" : gc
                          const chipText = isCancelled ? "#dc2626" : "#ffffff"
                          const chipAccent = isCancelled ? "#ef4444" : "#ffffff"
                          const ModeIcon = MODE_META[s.mode].icon
                          return (
                            <button
                              key={si}
                              onClick={(e) => { e.stopPropagation(); onSessionClick(s) }}
                              title={`${s.title || s.groupTitle}${s.start_time ? `  ·  ${s.start_time} – ${formatTime(parseTime(s.start_time) + s.duration)}` : ""}`}
                              className="w-full flex items-center gap-1 px-1.5 py-0.5 rounded text-left
                                hover:brightness-95 transition-all cursor-pointer"
                              style={{
                                background: chipBg,
                                border: `1px solid ${chipBorder}`,
                              }}
                            >
                                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: chipAccent, opacity: 0.9 }} />
                              
                              <span className="text-[10px] font-medium truncate" style={{ color: chipText }}>
                                {s.start_time} {s.title || s.groupTitle}
                              </span>
                            </button>
                          )
                        })}
                        {daySessions.length > 3 && (
                          <p className="text-[10px] text-gray-400 pl-1">+{daySessions.length - 3} autres</p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── List View ─────────────────────────────────────────────────────────────────

function ListView({
  sessions,
  onSessionClick,
  groupColorMap,
}: {
  sessions: Session[]
  onSessionClick: (s: Session) => void
  groupColorMap: Map<string, string>
}) {
  const todayYMD = toYMD(new Date())
  const upcomingSessions = sessions.filter(s => s.date >= todayYMD)
  const grouped: Record<string, Session[]> = {}
  for (const s of upcomingSessions) {
    if (!grouped[s.date]) grouped[s.date] = []
    grouped[s.date].push(s)
  }

  const sortedDates = Object.keys(grouped).sort()

  if (sortedDates.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Calendar size={40} className="text-gray-200 mx-auto mb-3" />
          <p className="text-[13px] text-gray-400">Aucune session à venir</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
      {sortedDates.map(date => {
        const d = new Date(date + "T12:00:00")
        const dayLabel = d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })
        const today = toYMD(new Date())
        const isToday = date === today

        return (
          <div key={date}>
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`text-[12px] font-bold capitalize
                  ${isToday ? "text-violet-600" : "text-gray-500"}`}
              >
                {dayLabel}
              </span>
              {isToday && (
                <span className="text-[10px] bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded font-semibold">
                  Aujourd'hui
                </span>
              )}
            </div>
            <div className="space-y-2">
              {grouped[date].map((s, i) => {
                const ModeIcon = MODE_META[s.mode].icon
                const gc = groupColorMap.get(s.group) ?? "#475569"
                const isCancelled = s.is_cancelled
                const cardBg = isCancelled ? "#f3f4f6" : gc
                const cardBorder = isCancelled ? "#fecaca" : gc
                const primaryText = isCancelled ? "#dc2626" : "#ffffff"
                const secondaryText = isCancelled ? "#ef4444" : "rgba(255,255,255,0.92)"
                return (
                  <button
                    key={i}
                    onClick={() => onSessionClick(s)}
                    title={`${s.title || s.groupTitle}${s.start_time ? `  ·  ${s.start_time} – ${formatTime(parseTime(s.start_time) + s.duration)}` : ""}`}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border
                      hover:shadow-sm hover:brightness-95 transition-all text-left cursor-pointer"
                    style={{
                      background: cardBg,
                      borderColor: cardBorder,
                      opacity: 1,
                    }}
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: isCancelled ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.18)" }}
                    >
                      {isCancelled ? (
                        <AlertCircle size={16} style={{ color: "#dc2626" }} />
                      ) : s.mode === "not_set" ? (
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#ffffff", opacity: 0.92 }} />
                      ) : (
                        <ModeIcon size={16} style={{ color: "#ffffff" }} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold truncate" style={{ color: primaryText }}>
                        {s.title || s.groupTitle}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-1 text-[11px]" style={{ color: secondaryText }}>
                          <Clock size={10} />
                          {s.start_time} · {formatDuration(s.duration)}
                        </span>
                        <span className="text-[10px] font-medium" style={{ color: isCancelled ? "#ef4444" : "#ffffff", opacity: 0.92 }}>
                          {MODE_META[s.mode].label}
                        </span>
                      </div>
                    </div>
                    {s.is_cancelled && (
                      <span className="text-[10px] bg-red-50 text-red-500 border border-red-100 px-2 py-0.5 rounded font-medium shrink-0">
                        Annulée
                      </span>
                    )}
                    {s.virtual && !s.is_cancelled && (
                      <span className="text-[10px] bg-gray-50 text-gray-400 border border-gray-100 px-2 py-0.5 rounded font-medium shrink-0">
                        Auto
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

type ViewMode = "week" | "month" | "list"

export default function AgendaPage() {
  const searchParams = useSearchParams()
  const [view, setView] = useState<ViewMode>("week")
  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(new Date()))
  const [monthYear, setMonthYear] = useState(() => {
    const n = new Date()
    return { year: n.getFullYear(), month: n.getMonth() }
  })

  const [sessions, setSessions] = useState<Session[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const [scheduleGroup, setScheduleGroup] = useState<Group | null>(null)
  const [focusedGroupId, setFocusedGroupId] = useState<string | null>(null)
  const [calendarGroupFilterId, setCalendarGroupFilterId] = useState<string | null>(null)
  const [isSwitchingGroup, setIsSwitchingGroup] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const openedFromQueryRef = useRef<string | null>(null)
  const groupSwitchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { toasts, push } = useToast()
  const targetGroupId = searchParams.get("group")
  const targetDate = searchParams.get("date")
  const targetStartTime = searchParams.get("start_time")
  const targetKey = useMemo(
    () => (targetGroupId && targetDate ? `${targetGroupId}|${targetDate}|${targetStartTime || ""}` : null),
    [targetGroupId, targetDate, targetStartTime]
  )

  // When opened from /groups, jump to the week containing the target date.
  useEffect(() => {
    if (!targetDate) return
    const d = new Date(`${targetDate}T12:00:00`)
    if (Number.isNaN(d.getTime())) return
    setView("week")
    setWeekStart(getWeekStart(d))
    setMonthYear({ year: d.getFullYear(), month: d.getMonth() })
  }, [targetDate])

  // Fetch groups once
  useEffect(() => {
    fetch("/api/admin/groups")
      .then(r => r.json())
      .then(d => {
        const STATUS_ORDER: Record<string, number> = { in_progress: 0, not_started: 1 }
        const g: Group[] = (d.groups || [])
          .map((g: any) => ({
            id: g.id,
            title: g.title,
            status: g.status || "not_started",
            schedules: Array.isArray(g.schedules) ? g.schedules : [],
            schedule_start_date: g.schedule_start_date || undefined,
            schedule_end_date: g.schedule_end_date || undefined,
          }))
          .filter((g: Group) => g.status !== "completed")
          .sort((a: Group, b: Group) => (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99))
        setGroups(g)
      })
      .catch(() => {})
  }, [])

  // Compute date range to fetch (list view fetches everything)
  const { from, to } = (() => {
    if (view === "month") {
      const start = new Date(monthYear.year, monthYear.month, 1)
      const end = new Date(monthYear.year, monthYear.month + 1, 0)
      return { from: toYMD(start), to: toYMD(end) }
    }
    if (view === "list") return { from: null, to: null }
    // week
    return { from: toYMD(weekStart), to: toYMD(addDays(weekStart, 6)) }
  })()

  // Fetch sessions when range changes
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    const url = from && to
      ? `/api/admin/sessions?from=${from}&to=${to}`
      : `/api/admin/sessions`
    fetch(url, { signal: controller.signal })
      .then(r => r.json())
      .then(d => {
        setSessions(d.sessions || [])
        setLoading(false)
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.error(err)
          setLoading(false)
        }
      })
    return () => controller.abort()
  }, [from, to])

  // Auto-open the target session panel when landing from /groups.
  useEffect(() => {
    if (!targetGroupId || !targetDate || !targetKey) return
    if (openedFromQueryRef.current === targetKey) return
    if (loading) return

    const sameSlot = (s: Session) =>
      s.group === targetGroupId &&
      s.date === targetDate &&
      !s.is_cancelled &&
      (!targetStartTime || s.start_time === targetStartTime)

    const candidates = sessions
      .filter(sameSlot)
      .sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""))

    const target = candidates[0]
    if (!target) return

    setSelectedSession(target)
    openedFromQueryRef.current = targetKey
    window.history.replaceState(null, "", "/admin-dashboard/agenda")
  }, [sessions, loading, targetGroupId, targetDate, targetStartTime, targetKey])

  useEffect(() => {
    return () => {
      if (groupSwitchTimeoutRef.current) {
        clearTimeout(groupSwitchTimeoutRef.current)
      }
    }
  }, [])

  const activeGroupIds = new Set(groups.map(g => g.id))
  const visibleSessions = sessions.filter(s => {
    if (!activeGroupIds.has(s.group)) return false
    if (isSwitchingGroup) return false
    return calendarGroupFilterId ? s.group === calendarGroupFilterId : true
  })

  function prevPeriod() {
    if (view === "month") {
      setMonthYear(p => {
        const m = p.month - 1
        return m < 0 ? { year: p.year - 1, month: 11 } : { year: p.year, month: m }
      })
    } else {
      setWeekStart(p => addDays(p, view === "list" ? -28 : -7))
    }
  }

  function nextPeriod() {
    if (view === "month") {
      setMonthYear(p => {
        const m = p.month + 1
        return m > 11 ? { year: p.year + 1, month: 0 } : { year: p.year, month: m }
      })
    } else {
      setWeekStart(p => addDays(p, view === "list" ? 28 : 7))
    }
  }

  function goToday() {
    const n = new Date()
    setWeekStart(getWeekStart(n))
    setMonthYear({ year: n.getFullYear(), month: n.getMonth() })
  }

  function periodLabel() {
    if (view === "month") {
      return `${MONTHS_FR[monthYear.month]} ${monthYear.year}`
    }
    const end = addDays(weekStart, view === "list" ? 27 : 6)
    if (weekStart.getMonth() === end.getMonth()) {
      return `${weekStart.getDate()} – ${end.getDate()} ${MONTHS_FR[weekStart.getMonth()]} ${weekStart.getFullYear()}`
    }
    return `${weekStart.getDate()} ${MONTHS_FR[weekStart.getMonth()]} – ${end.getDate()} ${MONTHS_FR[end.getMonth()]} ${weekStart.getFullYear()}`
  }

  async function handleSaveSession(draft: Session, updateMode: "single" | "all_following" = "single") {
    try {
      if (!draft.id) {
        // Create new session record
        const res = await fetch("/api/admin/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(draft),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)

        const saved: Session = { ...data.session, groupTitle: draft.groupTitle, virtual: false }
        setSessions(prev => {
          // Replace any virtual placeholder with the real record
          const filtered = prev.filter(
            s => !(s.group === saved.group && s.date === saved.date && s.start_time === saved.start_time)
          )
          return [...filtered, saved].sort((a, b) => {
            if (a.date !== b.date) return a.date < b.date ? -1 : 1
            return (a.start_time || "").localeCompare(b.start_time || "")
          })
        })
      } else {
        // Update existing session(s)
        const res = await fetch(`/api/admin/sessions/${draft.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...draft, updateMode }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)

        const updatedSessions: Session[] = (data.sessions || []).map((s: any) => ({
          ...s,
          groupTitle: draft.groupTitle,
          virtual: false,
        }))
        setSessions(prev => {
          const updatedIds = new Set(updatedSessions.map(s => s.id))
          const filtered = prev.filter(s => !updatedIds.has(s.id))
          return [...filtered, ...updatedSessions].sort((a, b) => {
            if (a.date !== b.date) return a.date < b.date ? -1 : 1
            return (a.start_time || "").localeCompare(b.start_time || "")
          })
        })
      }

      push("ok", "Session enregistrée")
      setSelectedSession(null)
    } catch (err: any) {
      push("err", err?.message || "Erreur lors de la sauvegarde")
    }
  }

  async function handleDeleteSession(draft: Session) {
    if (!draft.id) return
    try {
      const res = await fetch(`/api/admin/sessions/${draft.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Erreur suppression")

      const group = groups.find(g => g.id === draft.group)
      setSessions(prev => {
        const filtered = prev.filter(s => s.id !== draft.id)
        // Re-add as virtual if this date+time matches one of the group's schedule slots
        if (group && group.schedules.length > 0) {
          const d = new Date(draft.date + "T12:00:00")
          const dayName = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"][d.getDay()]
          const matchingSlot = group.schedules.find(slot => slot.day === dayName && slot.start_time === draft.start_time)
          if (matchingSlot) {
            const virtual: Session = {
              id: null,
              group: draft.group,
              groupTitle: draft.groupTitle,
              date: draft.date,
              start_time: matchingSlot.start_time,
              duration: matchingSlot.duration,
              mode: "not_set",
              title: null,
              notes: "",
              is_cancelled: false,
              instructor: null,
              virtual: true,
            }
            return [...filtered, virtual]
          }
        }
        return filtered
      })

      push("ok", "Session supprimée")
      setSelectedSession(null)
    } catch {
      push("err", "Erreur lors de la suppression")
    }
  }

  async function handleSaveGroupSchedule(draft: Group) {
    try {
      // Fetch current group data to preserve required fields
      const groupData = await fetch("/api/admin/groups").then(r => r.json())
      const existing = (groupData.groups || []).find((g: any) => g.id === draft.id)
      if (!existing) throw new Error("Groupe introuvable")

      const res = await fetch("/api/admin/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: draft.id,
          title: existing.title,
          status: existing.status,
          programType: existing.programType,
          courseId: existing.courseId,
          bootcampId: existing.bootcampId,
          studentIds: existing.studentIds,
          lockedModules: existing.lockedModules,
          unlockedModules: existing.unlockedModules,
          lockedLessons: existing.lockedLessons,
          unlockedLessons: existing.unlockedLessons,
          schedules: draft.schedules,
          schedule_start_date: draft.schedule_start_date || null,
          schedule_end_date: draft.schedule_end_date || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      // Update local groups
      setGroups(prev => prev.map(g => g.id === draft.id ? {
        ...g,
        schedules: draft.schedules,
        schedule_start_date: draft.schedule_start_date,
        schedule_end_date: draft.schedule_end_date,
      } : g))
      // Generate all session records from the new schedule (skips existing ones)
      await fetch("/api/admin/sessions/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId: draft.id }),
      })

      // Reload sessions for the current view
      const sessRes = await fetch(`/api/admin/sessions?from=${from}&to=${to}`)
      const sessData = await sessRes.json()
      setSessions(sessData.sessions || [])

      push("ok", "Planning mis à jour")
      setScheduleGroup(null)
    } catch (err: any) {
      push("err", err?.message || "Erreur lors de la sauvegarde")
    }
  }

  const toggleGroup = (id: string) => {
    const nextFocusedGroupId = focusedGroupId === id ? null : id
    setFocusedGroupId(nextFocusedGroupId)
    setIsSwitchingGroup(true)
    setCalendarGroupFilterId(null)

    if (groupSwitchTimeoutRef.current) {
      clearTimeout(groupSwitchTimeoutRef.current)
    }

    groupSwitchTimeoutRef.current = setTimeout(() => {
      setCalendarGroupFilterId(nextFocusedGroupId)
      setIsSwitchingGroup(false)
      groupSwitchTimeoutRef.current = null
    }, 160)
  }

  // Bright, high-contrast categorical palette with large hue gaps, no red tones.
  const GROUP_COLORS = [
    "#2563EB", // blue
    "#F59E0B", // amber
    "#16A34A", // green
    "#8B5CF6", // violet
    "#EAB308", // yellow
    "#0D9488", // teal
    "#A16207", // brown
    "#4B5563", // slate
    "#65A30D", // lime
    "#0369A1", // deep cyan-blue
  ]

  const groupColorMap = new Map(
    groups.map((g, idx) => [g.id, GROUP_COLORS[idx % GROUP_COLORS.length]])
  )

  const groupColor = (id: string) => groupColorMap.get(id) ?? "#475569"

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#fafafa]">
      <AdminPageHeader
        title="Agenda"
        description="Planning des sessions par groupe"
        breadcrumbs={[{ label: "Agenda" }]}
      />

      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-100 bg-white shrink-0">
        {/* Nav — hidden in list view */}
        {view !== "list" && (
          <>
            <div className="flex items-center gap-1">
              <button
                onClick={prevPeriod}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={nextPeriod}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <button
              onClick={goToday}
              className="h-8 px-3 rounded-lg text-[12px] font-medium text-gray-600
                border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              Aujourd'hui
            </button>

            <span className="text-[14px] font-semibold text-gray-800 capitalize ml-1">
              {periodLabel()}
            </span>
          </>
        )}
        {view === "list" && (
          <span className="text-[14px] font-semibold text-gray-800">Toutes les sessions</span>
        )}

        {loading && <Loader2 size={14} className="text-gray-400 animate-spin ml-1" />}

        {/* View switcher */}
        <div className="ml-auto flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {([
            { val: "week", icon: Grid3X3, label: "Semaine" },
            { val: "month", icon: Calendar, label: "Mois" },
            { val: "list", icon: List, label: "Liste" },
          ] as const).map(({ val, icon: Icon, label }) => (
            <button
              key={val}
              onClick={() => setView(val)}
              className={`flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[11px] font-medium transition-all
                ${view === val
                  ? "bg-white text-gray-800 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"}`}
            >
              <Icon size={12} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Groups sidebar */}
        <div
          className={`shrink-0 border-r border-gray-100 bg-white flex flex-col transition-all duration-200
            ${sidebarOpen ? "w-52" : "w-0 overflow-hidden"}`}
        >
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Groupes</span>
          </div>
          <div className="flex-1 overflow-y-auto py-2 px-2">
            {(["in_progress", "not_started"] as const).map(status => {
              const statusGroups = groups.filter(g => g.status === status)
              if (statusGroups.length === 0) return null
              const label = status === "in_progress" ? "En cours" : "Pas commencé"
              return (
                <div key={status} className="mb-3">
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest px-1.5 mb-1">{label}</p>
                  <div className="space-y-0.5">
                  {statusGroups.map(g => {
              const hidden = focusedGroupId !== null && focusedGroupId !== g.id
              const color = groupColor(g.id)
              const hasSchedule = g.schedules.length > 0
              return (
                <div key={g.id} className="group/item flex items-center gap-1.5 rounded-lg px-1.5 py-1.5 hover:bg-gray-50 transition-colors ">
                  <button
                    onClick={() => toggleGroup(g.id)}
                    className="flex items-center gap-2 flex-1 min-w-0 text-left"
                  >
                    <span
                      className="w-3 h-3 rounded-sm shrink-0 border transition-all cursor-pointer"
                      style={{
                        background: hidden ? "transparent" : color,
                        borderColor: color,
                      }}
                    />
                    <span className={`text-[12px] font-medium truncate ${hidden ? "text-gray-300" : "text-gray-700"}`}>
                      {g.title}
                    </span>
                  </button>
                  <button
                    onClick={() => setScheduleGroup(g)}
                    className="w-5 h-5 flex items-center justify-center rounded text-gray-300
                      opacity-0 group-hover/item:opacity-100 hover:text-gray-600 hover:bg-gray-100 transition-all"
                    title="Modifier le planning"
                  >
                    <Clock size={11} />
                  </button>
                  {hasSchedule ? (
                    <span className="text-[9px] font-bold text-gray-300 shrink-0"
                      title={`${g.schedules.length} séance${g.schedules.length > 1 ? "s" : ""}/semaine`}>
                      ×{g.schedules.length}
                    </span>
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" title="Pas de planning" />
                  )}
                </div>
              )
                  })}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div className="px-3 py-3 border-t border-gray-100 space-y-1.5">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Modes</p>
            {(Object.keys(MODE_META) as SessionMode[]).filter(m => m !== "not_set").map(m => {
              const mm = MODE_META[m]
              const MIcon = mm.icon
              return (
                <div key={m} className="flex items-center gap-1.5">
                  <MIcon size={11} style={{ color: mm.color }} />
                  <span className="text-[11px] text-gray-500">{mm.label}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Toggle sidebar button */}
        <button
          onClick={() => setSidebarOpen(p => !p)}
          className="shrink-0 w-4 flex items-center justify-center border-r border-gray-100
            bg-white text-gray-300 hover:text-gray-500 hover:bg-gray-50 transition-colors cursor-pointer"
        >
          <div className="flex flex-col gap-0.5">
            <span className="w-1 h-1 rounded-full bg-current" />
            <span className="w-1 h-1 rounded-full bg-current" />
            <span className="w-1 h-1 rounded-full bg-current" />
          </div>
        </button>

        {/* Calendar */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden bg-white">
          {view === "week" && (
            <WeekGrid
              weekStart={weekStart}
              sessions={visibleSessions}
              onSessionClick={setSelectedSession}
              groupColorMap={groupColorMap}
            />
          )}
          {view === "month" && (
            <MonthGrid
              year={monthYear.year}
              month={monthYear.month}
              sessions={visibleSessions}
              onSessionClick={setSelectedSession}
              onDayClick={(d) => { setWeekStart(getWeekStart(d)); setView("week") }}
              groupColorMap={groupColorMap}
            />
          )}
          {view === "list" && (
            <ListView
              sessions={visibleSessions}
              onSessionClick={setSelectedSession}
              groupColorMap={groupColorMap}
            />
          )}
        </div>
      </div>

      {/* Session edit panel */}
      {selectedSession && (
        <SessionPanel
          session={selectedSession}
          groups={groups}
          onClose={() => setSelectedSession(null)}
          onSave={handleSaveSession}
          onDelete={handleDeleteSession}
        />
      )}

      {/* Group schedule modal */}
      {scheduleGroup && (
        <GroupScheduleModal
          group={scheduleGroup}
          onClose={() => setScheduleGroup(null)}
          onSave={handleSaveGroupSchedule}
        />
      )}

      {/* Toasts */}
      <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-[13px] font-medium
              animate-in slide-in-from-bottom-2 duration-200
              ${t.type === "ok" ? "bg-gray-900 text-white" : "bg-red-600 text-white"}`}
          >
            {t.type === "ok" ? <Check size={14} /> : <AlertCircle size={14} />}
            {t.text}
          </div>
        ))}
      </div>
    </div>
  )
}
