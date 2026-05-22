"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { CheckCircle2, Monitor, MapPin, HelpCircle, XCircle, Clock, Calendar, ArrowLeft, Loader2 } from "lucide-react"

type SessionInfo = {
  id: string
  groupTitle: string
  date: string
  start_time: string
  duration: number
  title: string | null
  mode: string
}

type PresenceStatus = "presentiel" | "en_ligne" | "pas_sur" | "absent" | null

const STATUS_CONFIG = [
  {
    key: "presentiel" as const,
    label: "Présentiel",
    sub: "Je serai sur place",
    icon: MapPin,
    color: "#16A34A",
    bg: "#F0FDF4",
    border: "#BBF7D0",
    activeBg: "#16A34A",
    activeText: "#FFFFFF",
  },
  {
    key: "en_ligne" as const,
    label: "En ligne",
    sub: "Je rejoins à distance",
    icon: Monitor,
    color: "#2563EB",
    bg: "#EFF6FF",
    border: "#BFDBFE",
    activeBg: "#2563EB",
    activeText: "#FFFFFF",
  },
  {
    key: "pas_sur" as const,
    label: "Pas sûr",
    sub: "Je ne sais pas encore",
    icon: HelpCircle,
    color: "#D97706",
    bg: "#FFFBEB",
    border: "#FDE68A",
    activeBg: "#D97706",
    activeText: "#FFFFFF",
  },
  {
    key: "absent" as const,
    label: "Absent",
    sub: "Je ne serai pas là",
    icon: XCircle,
    color: "#DC2626",
    bg: "#FEF2F2",
    border: "#FECACA",
    activeBg: "#DC2626",
    activeText: "#FFFFFF",
  },
]

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h${m}` : `${h}h`
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00")
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
}

export default function SeancePresencePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [session, setSession] = useState<SessionInfo | null>(null)
  const [status, setStatus] = useState<PresenceStatus>(null)
  const [saved, setSaved] = useState<PresenceStatus>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") ?? "null")
    if (!user) { router.push("/login"); return }

    fetch(`/api/student/sessions/${id}/presence?studentId=${user.id}`)
      .then(r => r.json())
      .then(d => {
        if (d.session) setSession(d.session)
        if (d.presence?.status) {
          setStatus(d.presence.status)
          setSaved(d.presence.status)
        }
      })
      .catch(() => setError("Impossible de charger la séance."))
      .finally(() => setLoading(false))
  }, [id, router])

  async function confirm(choice: NonNullable<PresenceStatus>) {
    const user = JSON.parse(localStorage.getItem("user") ?? "null")
    if (!user) return

    setStatus(choice)
    setSaving(true)
    try {
      const res = await fetch(`/api/student/sessions/${id}/presence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: user.id, status: choice }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      setSaved(choice)
      setDone(true)
    } catch (err: any) {
      setError(err?.message || "Erreur lors de la confirmation.")
      setStatus(saved)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
        <Loader2 size={28} className="animate-spin text-violet-500" />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
        <div className="text-center">
          <p className="text-[15px] text-gray-600 font-medium">Séance introuvable.</p>
          <button onClick={() => router.back()} className="mt-4 text-[13px] text-violet-600 hover:underline">
            Retour
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col">

      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <span className="text-[14px] font-semibold text-gray-800">Confirmation de présence</span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm space-y-5">

          {/* Session card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Accent bar */}
            <div className="h-1 bg-gradient-to-r from-violet-500 to-violet-400" />
            <div className="px-5 py-4">
              <p className="text-[11px] font-bold text-violet-500 uppercase tracking-widest mb-1">
                {session.groupTitle}
              </p>
              <p className="text-[17px] font-bold text-gray-900 leading-tight">
                {session.title || session.groupTitle}
              </p>
              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-1.5 text-[12px] text-gray-500">
                  <Calendar size={13} />
                  <span className="capitalize">{formatDate(session.date)}</span>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-1.5">
                <div className="flex items-center gap-1.5 text-[12px] text-gray-500">
                  <Clock size={13} />
                  <span>{session.start_time} · {formatDuration(session.duration)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Done state */}
          {done && (
            <div className="flex items-center gap-2.5 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
              <CheckCircle2 size={16} className="text-green-600 shrink-0" />
              <p className="text-[13px] text-green-700 font-medium">Réponse enregistrée !</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2.5 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              <XCircle size={16} className="text-red-500 shrink-0" />
              <p className="text-[13px] text-red-600 font-medium">{error}</p>
            </div>
          )}

          {/* Prompt */}
          <p className="text-[13px] font-semibold text-gray-600 text-center">
            Serez-vous présent(e) à cette séance ?
          </p>

          {/* Choice buttons */}
          <div className="grid grid-cols-2 gap-3">
            {STATUS_CONFIG.map((cfg) => {
              const isSelected = status === cfg.key
              const Icon = cfg.icon
              return (
                <button
                  key={cfg.key}
                  onClick={() => !saving && confirm(cfg.key)}
                  disabled={saving}
                  className="relative flex flex-col items-center gap-2 rounded-2xl px-3 py-4 border-2 transition-all duration-150
                    disabled:opacity-60 active:scale-[0.97]"
                  style={{
                    background: isSelected ? cfg.activeBg : cfg.bg,
                    borderColor: isSelected ? cfg.activeBg : cfg.border,
                    boxShadow: isSelected ? `0 4px 16px ${cfg.color}33` : "none",
                  }}
                >
                  {saving && isSelected && (
                    <Loader2 size={14} className="absolute top-2 right-2 animate-spin" style={{ color: cfg.activeText }} />
                  )}
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{
                      background: isSelected ? "rgba(255,255,255,0.2)" : `${cfg.color}18`,
                    }}
                  >
                    <Icon size={20} style={{ color: isSelected ? cfg.activeText : cfg.color }} />
                  </div>
                  <div className="text-center">
                    <p
                      className="text-[13px] font-bold leading-tight"
                      style={{ color: isSelected ? cfg.activeText : cfg.color }}
                    >
                      {cfg.label}
                    </p>
                    <p
                      className="text-[10px] mt-0.5 leading-tight"
                      style={{ color: isSelected ? `${cfg.activeText}cc` : "#9CA3AF" }}
                    >
                      {cfg.sub}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Back to dashboard */}
          <button
            onClick={() => router.push("/student-dashboard/overview")}
            className="w-full text-center text-[12px] text-gray-400 hover:text-gray-600 transition-colors py-1"
          >
            Retour au tableau de bord
          </button>
        </div>
      </div>
    </div>
  )
}
