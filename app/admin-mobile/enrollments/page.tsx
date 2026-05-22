"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, CalendarDays, CheckCircle2, ClipboardList, Phone, UserRound } from "lucide-react"

type EnrollmentStatus = "pending" | "contacted" | "confirmed" | "cancelled"

type Enrollment = {
  id: string
  firstName: string
  lastName: string
  phone: string
  birthDate: string
  courseTitle?: string
  bootcampTitle?: string
  created: string
  status: EnrollmentStatus
}

const STATUS_LABELS: Record<EnrollmentStatus, string> = {
  pending: "En attente",
  contacted: "Contacté",
  confirmed: "Confirmé",
  cancelled: "Annulé",
}

const STATUS_STYLES: Record<EnrollmentStatus, { bg: string; color: string; border: string }> = {
  pending: { bg: "#fffbeb", color: "#b45309", border: "#fde68a" },
  contacted: { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
  confirmed: { bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0" },
  cancelled: { bg: "#fef2f2", color: "#b91c1c", border: "#fecaca" },
}

function formatDate(value: string) {
  if (!value) return "-"
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function normalizeStatus(status: unknown): EnrollmentStatus {
  return typeof status === "string" && status in STATUS_LABELS ? status as EnrollmentStatus : "pending"
}

export default function MobileEnrollmentsPage() {
  const router = useRouter()
  const [focusId, setFocusId] = useState<string | null>(null)
  const [authorized, setAuthorized] = useState(false)
  const [loading, setLoading] = useState(true)
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)

  useEffect(() => {
    const focus = new URLSearchParams(window.location.search).get("focus")
    setFocusId(focus)
    setActiveId(focus)

    try {
      const user = JSON.parse(localStorage.getItem("user") || "null")
      if (!user || (user.role !== "admin" && user.role !== "admin_agent")) {
        router.replace("/login")
        return
      }
      setAuthorized(true)
    } catch {
      router.replace("/login")
    }
  }, [router])

  useEffect(() => {
    if (!authorized) return

    async function loadEnrollments() {
      setLoading(true)
      try {
        const res = await fetch("/api/admin/enrollments")
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.error || "Erreur de chargement.")

        const items = Array.isArray(data?.enrollments) ? data.enrollments : []
        setEnrollments(items.map((item: Enrollment) => ({
          ...item,
          status: normalizeStatus(item.status),
        })))
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    loadEnrollments()
  }, [authorized])

  const sortedEnrollments = useMemo(() => {
    return [...enrollments].sort((a, b) => {
      if (a.id === focusId) return -1
      if (b.id === focusId) return 1
      return new Date(b.created).getTime() - new Date(a.created).getTime()
    })
  }, [enrollments, focusId])

  async function updateStatus(id: string, status: EnrollmentStatus) {
    setSavingId(id)
    try {
      const res = await fetch(`/api/admin/enrollments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Erreur de mise à jour.")

      setEnrollments((prev) => prev.map((item) => item.id === id ? { ...item, status } : item))
      setActiveId(null)
    } catch (err) {
      console.error(err)
    } finally {
      setSavingId(null)
    }
  }

  if (!authorized) return null

  return (
    <main style={{ minHeight: "100vh", background: "#fafafa", fontFamily: "'DM Sans','Inter',sans-serif" }}>
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          height: 58,
          padding: "0 16px",
          background: "#ffffff",
          borderBottom: "1px solid #e2e8f0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Link
          href="/admin-dashboard/overview"
          style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#0f172a", textDecoration: "none", fontWeight: 800 }}
        >
          <ArrowLeft size={18} />
          <span><span style={{ color: "#8b0f82" }}>BI</span> GEEK</span>
        </Link>
        <span style={{ fontSize: 12, fontWeight: 800, color: "#64748b" }}>Inscriptions</span>
      </nav>

      <section style={{ padding: "16px 14px 28px", maxWidth: 560, margin: "0 auto" }}>
        <div style={{ marginBottom: 14 }}>
          <h1 style={{ margin: 0, fontSize: 22, lineHeight: 1.15, color: "#0f172a", fontWeight: 900 }}>
            Nouvelles inscriptions
          </h1>
          <p style={{ margin: "5px 0 0", color: "#64748b", fontSize: 13, fontWeight: 600 }}>
            Touchez une inscription pour changer uniquement son statut.
          </p>
        </div>

        {loading ? (
          <div style={{ padding: "36px 16px", textAlign: "center", color: "#64748b", fontWeight: 700 }}>
            Chargement...
          </div>
        ) : sortedEnrollments.length === 0 ? (
          <div style={{ padding: "36px 16px", border: "1px solid #e2e8f0", borderRadius: 14, background: "#fff", textAlign: "center" }}>
            <ClipboardList size={28} color="#94a3b8" style={{ margin: "0 auto 8px" }} />
            <p style={{ margin: 0, color: "#475569", fontWeight: 800 }}>Aucune inscription.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {sortedEnrollments.map((enrollment) => {
              const fullName = `${enrollment.firstName} ${enrollment.lastName}`.trim() || "Candidat"
              const program = enrollment.courseTitle || enrollment.bootcampTitle || "-"
              const statusStyle = STATUS_STYLES[enrollment.status]
              const isActive = activeId === enrollment.id
              const isSaving = savingId === enrollment.id

              return (
                <article
                  key={enrollment.id}
                  onClick={() => setActiveId((current) => current === enrollment.id ? null : enrollment.id)}
                  style={{
                    border: `1.5px solid ${isActive ? "#8b0f82" : "#e2e8f0"}`,
                    borderRadius: 14,
                    background: "#fff",
                    padding: 14,
                    boxShadow: isActive ? "0 12px 26px rgba(139,15,130,0.12)" : "0 1px 3px rgba(15,23,42,0.04)",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, display: "flex", alignItems: "center", gap: 7, color: "#0f172a", fontSize: 15, fontWeight: 900 }}>
                        <UserRound size={16} color="#8b0f82" />
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fullName}</span>
                      </p>
                      <p style={{ margin: "7px 0 0", color: "#334155", fontSize: 14, lineHeight: 1.25, fontWeight: 800 }}>
                        {program}
                      </p>
                    </div>
                    <span
                      style={{
                        flexShrink: 0,
                        borderRadius: 999,
                        padding: "5px 9px",
                        background: statusStyle.bg,
                        border: `1px solid ${statusStyle.border}`,
                        color: statusStyle.color,
                        fontSize: 11,
                        fontWeight: 900,
                      }}
                    >
                      {STATUS_LABELS[enrollment.status]}
                    </span>
                  </div>

                  <div style={{ display: "grid", gap: 7, marginTop: 12, color: "#475569", fontSize: 13, fontWeight: 700 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <Phone size={14} /> {enrollment.phone || "-"}
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <CalendarDays size={14} /> Date naissance: {formatDate(enrollment.birthDate)}
                    </span>
                  </div>

                  {isActive && (
                    <div onClick={(event) => event.stopPropagation()} style={{ marginTop: 13, display: "grid", gap: 8 }}>
                      <label htmlFor={`status-${enrollment.id}`} style={{ fontSize: 12, color: "#64748b", fontWeight: 900 }}>
                        Changer le statut
                      </label>
                      <select
                        id={`status-${enrollment.id}`}
                        value={enrollment.status}
                        disabled={isSaving}
                        onChange={(event) => updateStatus(enrollment.id, event.target.value as EnrollmentStatus)}
                        style={{
                          width: "100%",
                          minHeight: 44,
                          borderRadius: 10,
                          border: "1.5px solid #cbd5e1",
                          background: "#fff",
                          color: "#0f172a",
                          padding: "0 12px",
                          fontSize: 15,
                          fontWeight: 800,
                        }}
                      >
                        {(Object.keys(STATUS_LABELS) as EnrollmentStatus[]).map((status) => (
                          <option key={status} value={status}>{STATUS_LABELS[status]}</option>
                        ))}
                      </select>
                      <div style={{ display: "flex", alignItems: "center", gap: 7, color: "#64748b", fontSize: 12, fontWeight: 700 }}>
                        <CheckCircle2 size={14} color="#8b0f82" />
                        {isSaving ? "Mise à jour..." : "Le changement est enregistré immédiatement."}
                      </div>
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}
