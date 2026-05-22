"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Search, Trash2, X,
  AlertCircle, Mail, Phone, Users, BookOpen,
  CheckCircle, Clock, PhoneCall, Ban, UserPlus
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

type EnrollmentStatus = "pending" | "contacted" | "confirmed" | "cancelled"

type AdminEnrollment = {
  id: string
  firstName: string
  lastName: string
  phone: string
  email: string
  birthDate: string
  hasExperience: boolean
  note: string
  courseTitle?: string
  bootcampTitle?: string
  created: string
  status: EnrollmentStatus
}

type EnrollmentsCrudProps = {
  initialEnrollments?: AdminEnrollment[]
  onUpdateStatus?: (id: string, status: EnrollmentStatus) => Promise<void>
  onDelete?: (id: string) => Promise<void>
  onExport?: () => void
}

// ─── UI primitives (matching UsersCrud / GroupsCrud) ─────────────────────────

function SelectField({ value, onChange, children }: {
  value: string; onChange: (v: string) => void; children: React.ReactNode
}) {
  return (
    <div style={{ position: "relative" }}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          width: "100%", padding: "10px 36px 10px 14px",
          background: "#f8fafc", border: "1.5px solid #e2e8f0",
          borderRadius: 10, fontSize: 13, color: "#0f172a",
          outline: "none", appearance: "none", cursor: "pointer", fontFamily: "inherit",
          transition: "border-color 0.15s",
        }}
        onFocus={e => { e.target.style.borderColor = "var(--accent,#6366f1)"; e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.12)" }}
        onBlur={e => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none" }}
      >
        {children}
      </select>
      <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#475569", pointerEvents: "none", fontSize: 11 }}>▾</div>
    </div>
  )
}

function IconBtn({ onClick, title, color = "#475569", hoverBg = "#f1f5f9", children }: {
  onClick: (e: React.MouseEvent) => void; title?: string; color?: string; hoverBg?: string; children: React.ReactNode
}) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: 7, borderRadius: 8, border: "none",
        background: hover ? hoverBg : "transparent",
        color, cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "background 0.15s",
      }}
    >
      {children}
    </button>
  )
}

function FormCard({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", borderRadius: 18, border: "1px solid #e8ecf3", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
      <div style={{
        padding: "14px 20px", borderBottom: "1px solid #f1f5f9",
        display: "flex", alignItems: "center", gap: 8,
        background: "linear-gradient(180deg,#fafbfd 0%,#fff 100%)",
      }}>
        <div style={{
          width: 30, height: 30, borderRadius: 9,
          background: "linear-gradient(135deg,rgba(99,102,241,0.12),rgba(129,140,248,0.06))",
          color: "var(--accent,#6366f1)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {icon}
        </div>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: 0 }}>{title}</h3>
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  )
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_OPTIONS: {
  value: EnrollmentStatus; label: string; color: string; bgColor: string; icon: React.ElementType
}[] = [
  { value: "pending",   label: "En attente", color: "#b45309", bgColor: "rgba(251,191,36,0.18)",  icon: Clock      },
  { value: "contacted", label: "Contacté",   color: "#2563eb", bgColor: "rgba(59,130,246,0.14)",  icon: PhoneCall  },
  { value: "confirmed", label: "Confirmé",   color: "#16a34a", bgColor: "rgba(34,197,94,0.14)",   icon: CheckCircle },
  { value: "cancelled", label: "Annulé",     color: "#dc2626", bgColor: "rgba(239,68,68,0.12)",   icon: Ban        },
]

function StatusBadge({ status }: { status: EnrollmentStatus }) {
  const opt = STATUS_OPTIONS.find(s => s.value === status)
  if (!opt) return null
  const Icon = opt.icon
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 9px", borderRadius: 999,
      fontSize: 11, fontWeight: 600,
      background: opt.bgColor, color: opt.color,
    }}>
      <Icon size={10} />
      {opt.label}
    </span>
  )
}

// ─── Info row ─────────────────────────────────────────────────────────────────

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderBottom: "1px solid #f8fafc" }}>
      <div style={{
        width: 32, height: 32, borderRadius: 9, flexShrink: 0,
        background: "#f8fafc", border: "1px solid #e8ecf3",
        display: "flex", alignItems: "center", justifyContent: "center", color: "#475569",
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#475569", letterSpacing: "0.04em", textTransform: "uppercase" }}>{label}</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", marginTop: 1 }}>{value || "—"}</div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function EnrollmentsCrud({
  initialEnrollments = [],
  onUpdateStatus,
  onDelete,
  onExport,
}: EnrollmentsCrudProps) {

  const router = useRouter()

  const [enrollments, setEnrollments]           = useState<AdminEnrollment[]>(initialEnrollments)
  const [selectedEnrollment, setSelectedEnrollment] = useState<AdminEnrollment | null>(null)
  const [selectedStatus, setSelectedStatus]     = useState<EnrollmentStatus | "all">("all")
  const [searchTerm, setSearchTerm]             = useState("")
  const [error, setError]                       = useState<string | null>(null)

  useEffect(() => { setEnrollments(initialEnrollments) }, [initialEnrollments])

  // ── Derived ──
  const statusCounts = {
    pending:   enrollments.filter(e => e.status === "pending").length,
    contacted: enrollments.filter(e => e.status === "contacted").length,
    confirmed: enrollments.filter(e => e.status === "confirmed").length,
    cancelled: enrollments.filter(e => e.status === "cancelled").length,
  }

  const filtered = enrollments.filter(e => {
    const q = searchTerm.toLowerCase()
    const matchSearch = !q
      || e.firstName.toLowerCase().includes(q)
      || e.lastName.toLowerCase().includes(q)
      || e.email.toLowerCase().includes(q)
      || e.phone.includes(q)
      || e.courseTitle?.toLowerCase().includes(q)
      || e.bootcampTitle?.toLowerCase().includes(q)
    const matchStatus = selectedStatus === "all" || e.status === selectedStatus
    return matchSearch && matchStatus
  })

  const formatDate = (s: string) =>
    new Date(s).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })

  // ── Handlers ──
  const handleUpdateStatus = async (id: string, status: EnrollmentStatus) => {
    try {
      await onUpdateStatus?.(id, status)
      setEnrollments(prev => prev.map(e => e.id === id ? { ...e, status } : e))
      setSelectedEnrollment(prev => prev?.id === id ? { ...prev, status } : prev)
      setError(null)
    } catch (err: any) {
      setError(err.message || "Erreur lors de la mise à jour")
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette inscription ? Cette action est irréversible.")) return
    try {
      await onDelete?.(id)
      setEnrollments(prev => prev.filter(e => e.id !== id))
      if (selectedEnrollment?.id === id) setSelectedEnrollment(null)
      setError(null)
    } catch (err: any) {
      setError(err.message || "Erreur lors de la suppression")
    }
  }

  const handleCreateAccount = (e: AdminEnrollment) => {
    sessionStorage.setItem("user_prefill", JSON.stringify({
      name:    e.firstName,
      surname: e.lastName,
      email:   e.email,
      phone:   e.phone,
    }))
    router.push("/admin-dashboard/users")
  }

  const handleExport = () => {
    if (onExport) { onExport(); return }
    const headers = ["Nom", "Prénom", "Email", "Téléphone", "Programme", "Statut", "Date"]
    const rows = filtered.map(e => [
      e.lastName, e.firstName, e.email, e.phone,
      e.courseTitle || e.bootcampTitle || "",
      e.status, formatDate(e.created),
    ])
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n")
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(new Blob([csv], { type: "text/csv" })),
      download: "inscriptions.csv",
    })
    a.click()
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{
      height: "100vh", display: "flex", overflow: "hidden",
      background: "#f8fafc", fontFamily: "'DM Sans','Inter',sans-serif",
    }}>

      {/* ── Left panel ── */}
      <div style={{
        width: 400, minWidth: 400,
        background: "#fff", borderRight: "1px solid #e8ecf3",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>

        {/* Header */}
        <div style={{ padding: "22px 20px 16px", borderBottom: "1px solid #f1f5f9" }}>
          <div style={{ marginBottom: 14 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#475569", margin: "0 0 2px" }}>Gestion</p>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", margin: 0 }}>Inscriptions</h1>
          </div>

          {/* Search */}
          <div style={{ position: "relative", marginBottom: 12 }}>
            <Search style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "#475569" }} />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                width: "100%", padding: "9px 12px 9px 34px",
                background: "#f8fafc", border: "1.5px solid #e2e8f0",
                borderRadius: 10, fontSize: 13, outline: "none",
                boxSizing: "border-box", color: "#0f172a", fontFamily: "inherit",
              }}
              onFocus={e => { e.currentTarget.style.borderColor = "var(--accent,#6366f1)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.1)" }}
              onBlur={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.boxShadow = "none" }}
            />
          </div>

        </div>

        {/* Stats strip */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", borderBottom: "1px solid #f1f5f9" }}>
          {STATUS_OPTIONS.map((s, idx) => {
            const Icon = s.icon
            return (
              <div
                key={s.value}
                style={{
                  padding: "10px 0", textAlign: "center",
                  borderRight: idx < 3 ? "1px solid #f1f5f9" : "none",
                  cursor: "pointer",
                  background: selectedStatus === s.value ? s.bgColor : "transparent",
                  transition: "background 0.15s",
                }}
                onClick={() => setSelectedStatus(prev => prev === s.value ? "all" : s.value)}
              >
                <Icon size={13} color={s.color} style={{ margin: "0 auto 3px" }} />
                <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>{statusCounts[s.value]}</div>
                <div style={{ fontSize: 9, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {s.label.split(" ")[0]}
                </div>
              </div>
            )
          })}
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: "48px 24px", textAlign: "center" }}>
              <Users style={{ width: 36, height: 36, color: "#e2e8f0", margin: "0 auto 10px" }} />
              <p style={{ fontSize: 13, color: "#475569", margin: 0 }}>Aucune inscription trouvée</p>
            </div>
          ) : filtered.map(e => {
            const isActive = selectedEnrollment?.id === e.id
            return (
              <div
                key={e.id}
                onClick={() => setSelectedEnrollment(e)}
                style={{
                  padding: "13px 14px", borderRadius: 12, cursor: "pointer", marginBottom: 3,
                  background: isActive ? "linear-gradient(135deg,rgba(99,102,241,0.08),rgba(129,140,248,0.05))" : "transparent",
                  border: isActive ? "1.5px solid rgba(99,102,241,0.2)" : "1.5px solid transparent",
                  transition: "all 0.15s", position: "relative",
                }}
                onMouseEnter={ev => { if (!isActive) (ev.currentTarget as HTMLDivElement).style.background = "#f8fafc" }}
                onMouseLeave={ev => { if (!isActive) (ev.currentTarget as HTMLDivElement).style.background = "transparent" }}
              >
                {isActive && (
                  <div style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", width: 3, height: 28, background: "var(--accent,#6366f1)", borderRadius: "0 3px 3px 0" }} />
                )}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: 13, fontWeight: 600, margin: "0 0 2px",
                      color: isActive ? "var(--accent,#6366f1)" : "#0f172a",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {e.firstName} {e.lastName}
                    </p>
                    <p style={{ fontSize: 11, color: "#475569", margin: "0 0 7px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {e.courseTitle || e.bootcampTitle || "—"}
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <StatusBadge status={e.status} />
                      <span style={{ fontSize: 11, color: "#475569" }}>{formatDate(e.created)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Export */}
        <div style={{ padding: "12px 16px", borderTop: "1px solid #f1f5f9" }}>
          <button
            onClick={handleExport}
            style={{
              width: "100%", padding: "9px 0", borderRadius: 10,
              border: "1.5px solid #e2e8f0", background: "#f8fafc",
              fontSize: 12, fontWeight: 600, color: "#475569", cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "#cbd5e1" }}
            onMouseLeave={e => { e.currentTarget.style.background = "#f8fafc"; e.currentTarget.style.borderColor = "#e2e8f0" }}
          >
            Exporter CSV
          </button>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {selectedEnrollment ? (
          <>
            {/* Right header */}
            <div style={{
              background: "#fff", borderBottom: "1px solid #e8ecf3",
              padding: "14px 28px",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              flexShrink: 0,
            }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#475569", margin: 0 }}>Détails</p>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: "2px 0 0" }}>
                  {selectedEnrollment.firstName} {selectedEnrollment.lastName}
                </h2>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => setSelectedEnrollment(null)}
                  style={{
                    padding: "8px 16px", borderRadius: 10, border: "1.5px solid #e2e8f0",
                    background: "#fff", fontSize: 13, fontWeight: 600, color: "#475569",
                    cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                  }}
                >
                  <X style={{ width: 14, height: 14 }} /> Fermer
                </button>
                <button
                  onClick={() => handleCreateAccount(selectedEnrollment)}
                  style={{
                    padding: "8px 16px", borderRadius: 10,
                    border: "1.5px solid rgba(99,102,241,0.3)",
                    background: "rgba(99,102,241,0.08)", fontSize: 13, fontWeight: 600,
                    color: "var(--accent,#6366f1)",
                    cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                    transition: "all 0.15s",
                  }}
                >
                  <UserPlus style={{ width: 14, height: 14 }} /> Créer un compte
                </button>
              </div>
            </div>

            {/* Right body */}
            <div style={{ flex: 1, overflowY: "auto", padding: "28px" }}>
              <div style={{ maxWidth: 780, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>

                {error && (
                  <div style={{ padding: "12px 14px", borderRadius: 12, background: "#fff1f2", border: "1px solid #fecdd3", color: "#9f1239", fontSize: 13, fontWeight: 600 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <AlertCircle style={{ width: 15, height: 15 }} />
                      <span>{error}</span>
                    </div>
                  </div>
                )}

                {/* Personal info */}
                <FormCard title="Informations personnelles" icon={<Users style={{ width: 15, height: 15 }} />}>
                  <InfoRow icon={<Users size={14} />} label="Nom complet" value={`${selectedEnrollment.firstName} ${selectedEnrollment.lastName}`} />
                  <InfoRow icon={<Mail size={14} />} label="Date de naissance" value={selectedEnrollment.birthDate?.split(" ")[0] || "—"} />
                  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0" }}>
                    <div style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, background: "#f8fafc", border: "1px solid #e8ecf3", display: "flex", alignItems: "center", justifyContent: "center", color: "#475569" }}>
                      <CheckCircle size={14} />
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "#475569", letterSpacing: "0.04em", textTransform: "uppercase" }}>Expérience préalable</div>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 4, marginTop: 3,
                        padding: "2px 8px", borderRadius: 999, fontSize: 12, fontWeight: 600,
                        background: selectedEnrollment.hasExperience ? "rgba(34,197,94,0.12)" : "rgba(251,191,36,0.18)",
                        color: selectedEnrollment.hasExperience ? "#16a34a" : "#b45309",
                      }}>
                        {selectedEnrollment.hasExperience ? "Oui" : "Non"}
                      </span>
                    </div>
                  </div>
                </FormCard>

                {/* Contact */}
                <FormCard title="Coordonnées" icon={<Phone style={{ width: 15, height: 15 }} />}>
                  <InfoRow icon={<Mail size={14} />}  label="Email"     value={selectedEnrollment.email} />
                  <InfoRow icon={<Phone size={14} />} label="Téléphone" value={selectedEnrollment.phone} />
                </FormCard>

                {/* Programme */}
                <FormCard title="Programme" icon={<BookOpen style={{ width: 15, height: 15 }} />}>
                  <InfoRow
                    icon={<BookOpen size={14} />}
                    label={selectedEnrollment.courseTitle ? "Formation" : "Bootcamp"}
                    value={selectedEnrollment.courseTitle || selectedEnrollment.bootcampTitle || "—"}
                  />
                  <InfoRow icon={<CheckCircle size={14} />} label="Date d'inscription" value={formatDate(selectedEnrollment.created)} />
                </FormCard>

                {/* Status */}
                <FormCard title="Statut" icon={<CheckCircle style={{ width: 15, height: 15 }} />}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div><StatusBadge status={selectedEnrollment.status} /></div>
                    <SelectField
                      value={selectedEnrollment.status}
                      onChange={v => handleUpdateStatus(selectedEnrollment.id, v as EnrollmentStatus)}
                    >
                      {STATUS_OPTIONS.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </SelectField>
                  </div>
                </FormCard>

                {/* Notes */}
                {selectedEnrollment.note && (
                  <FormCard title="Notes" icon={<AlertCircle style={{ width: 15, height: 15 }} />}>
                    <div style={{ padding: 12, borderRadius: 10, background: "#fff7ed", border: "1px solid #fed7aa", fontSize: 13, color: "#9a3412", lineHeight: 1.6 }}>
                      {selectedEnrollment.note}
                    </div>
                  </FormCard>
                )}

              </div>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
            <div style={{
              width: 80, height: 80, borderRadius: 24,
              background: "linear-gradient(135deg,rgba(99,102,241,0.12),rgba(129,140,248,0.06))",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Users style={{ width: 36, height: 36, color: "var(--accent,#6366f1)" }} />
            </div>
            <div style={{ textAlign: "center" }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", margin: "0 0 6px" }}>Aucune inscription sélectionnée</h3>
              <p style={{ fontSize: 13, color: "#475569", margin: 0 }}>Choisissez une inscription dans la liste pour voir les détails.</p>
            </div>
          </div>
        )}
      </div>

      <style>{`
        ::-webkit-scrollbar { width: 5px; height: 5px }
        ::-webkit-scrollbar-track { background: transparent }
        ::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 99px }
        ::-webkit-scrollbar-thumb:hover { background: #cbd5e1 }
      `}</style>
    </div>
  )
}
