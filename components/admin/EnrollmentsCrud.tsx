"use client"

import { useState, useEffect } from "react"
import { 
  Search, Trash2,
  X, CheckCircle, AlertCircle,
  Mail, Phone, Users, BookOpen
} from "lucide-react"

// Types
type EnrollmentStatus = "pending" | "contacted" | "confirmed"

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

// ---- UI primitives (matching CoursesCrud style) ----
function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 6, letterSpacing: "0.02em" }}>
      {children}
    </label>
  )

}

function Input({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ width: "100%", padding: "10px 14px", background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 13, color: "#0f172a", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
      onFocus={e => { e.target.style.borderColor = "var(--accent,#6366f1)"; e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.12)"; e.target.style.background = "#fff" }}
      onBlur={e => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none"; e.target.style.background = "#f8fafc" }}
    />
  )
}

function SelectField({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <div style={{ position: "relative" }}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ width: "100%", padding: "10px 36px 10px 14px", background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 13, color: "#0f172a", outline: "none", appearance: "none", cursor: "pointer", fontFamily: "inherit" }}
        onFocus={e => { e.target.style.borderColor = "var(--accent,#6366f1)"; e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.12)" }}
        onBlur={e => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none" }}
      >
        {children}
      </select>
      <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%) rotate(90deg)", width: 14, height: 14, color: "#94a3b8", pointerEvents: "none" }}>&gt;</div>
    </div>
  )
}

function IconBtn({ onClick, title, color = "#64748b", hoverBg = "#f1f5f9", children }: {
  onClick: (e: React.MouseEvent) => void; title?: string; color?: string; hoverBg?: string; children: React.ReactNode
}) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ padding: 7, borderRadius: 8, border: "none", background: hover ? hoverBg : "transparent", color, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.15s" }}
    >
      {children}
    </button>
  )
}

function FormCard({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", borderRadius: 18, border: "1px solid #e8ecf3", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
      <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 8, background: "linear-gradient(180deg,#fafbfd 0%,#fff 100%)" }}>
        <div style={{ width: 30, height: 30, borderRadius: 9, background: "linear-gradient(135deg,rgba(99,102,241,0.12),rgba(129,140,248,0.06))", color: "var(--accent,#6366f1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {icon}
        </div>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: 0 }}>{title}</h3>
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  )
}

const STATUS_OPTIONS: { value: EnrollmentStatus; label: string; color: string; bgColor: string }[] = [
  { value: "pending", label: "En attente", color: "#b45309", bgColor: "rgba(251,191,36,0.2)" },
  { value: "contacted", label: "Contacté", color: "#2563eb", bgColor: "rgba(59,130,246,0.15)" },
  { value: "confirmed", label: "Confirmé", color: "#16a34a", bgColor: "rgba(34,197,94,0.15)" },
]

export default function EnrollmentsCrud({
  initialEnrollments = [],
  onUpdateStatus,
  onDelete,
  onExport
}: EnrollmentsCrudProps) {
  // State
  const [enrollments, setEnrollments] = useState<AdminEnrollment[]>(initialEnrollments)
  const [selectedStatus, setSelectedStatus] = useState<EnrollmentStatus | "all">("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedEnrollment, setSelectedEnrollment] = useState<AdminEnrollment | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sortField, setSortField] = useState<keyof AdminEnrollment>('created')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  // Load enrollments on mount
  useEffect(() => {
    if (initialEnrollments.length) {
      setEnrollments(initialEnrollments)
    }
  }, [initialEnrollments])

  // Sort enrollments
  const sortedEnrollments = [...enrollments].sort((a, b) => {
    const aValue = a[sortField]
    const bValue = b[sortField]
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue)
    }
    
    return 0
  })

  // Filter enrollments
  const filteredEnrollments = sortedEnrollments.filter(enrollment => {
    const matchesStatus = selectedStatus === "all" || enrollment.status === selectedStatus
    const matchesSearch = 
      enrollment.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      enrollment.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      enrollment.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      enrollment.phone.includes(searchTerm) ||
      (enrollment.courseTitle?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (enrollment.bootcampTitle?.toLowerCase().includes(searchTerm.toLowerCase()))
    
    return matchesStatus && matchesSearch
  })

  // Status counts
  const statusCounts = {
    pending: enrollments.filter(e => e.status === "pending").length,
    contacted: enrollments.filter(e => e.status === "contacted").length,
    confirmed: enrollments.filter(e => e.status === "confirmed").length,
  }

  // Handlers
  const handleUpdateStatus = async (id: string, status: EnrollmentStatus) => {
    try {
      if (onUpdateStatus) {
        await onUpdateStatus(id, status)
      }
      
      setEnrollments(prev => prev.map(e => 
        e.id === id ? { ...e, status } : e
      ))
      
      if (selectedEnrollment?.id === id) {
        setSelectedEnrollment(prev => prev ? { ...prev, status } : null)
      }
    } catch (err: any) {
      setError(err.message || "Erreur lors de la mise à jour")
    }
  }

  const handleDeleteEnrollment = async (id: string) => {
    if (!confirm("Supprimer cette inscription ? Cette action est irréversible.")) return
    
    try {
      if (onDelete) {
        await onDelete(id)
      }
      
      setEnrollments(prev => prev.filter(e => e.id !== id))
      if (selectedEnrollment?.id === id) {
        setSelectedEnrollment(null)
      }
    } catch (err: any) {
      setError(err.message || "Erreur lors de la suppression")
    }
  }

  const handleExport = () => {
    if (onExport) {
      onExport()
    } else {
      // Default export behavior
      const csv = convertToCSV(filteredEnrollments)
      downloadCSV(csv, 'enrollments.csv')
    }
  }

  const handleSort = (field: keyof AdminEnrollment) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  // Get status badge
  const getStatusBadge = (status: EnrollmentStatus) => {
    const statusOption = STATUS_OPTIONS.find(s => s.value === status)
    return (
      <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 8px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: statusOption?.bgColor ?? "#f1f5f9", color: statusOption?.color ?? "#475569" }}>
        {statusOption?.label}
      </span>
    )
  }

  // Stats
  const totalEnrollments = enrollments.length
  const conversionRate = totalEnrollments > 0 
    ? ((statusCounts.confirmed / totalEnrollments) * 100).toFixed(1)
    : "0.0"

  // CSV helpers
  const convertToCSV = (data: AdminEnrollment[]) => {
    const headers = ['Nom', 'Prénom', 'Email', 'Téléphone', 'Programme', 'Statut', 'Date']
    const rows = data.map(e => [
      e.lastName,
      e.firstName,
      e.email,
      e.phone,
      e.courseTitle || e.bootcampTitle || '',
      e.status,
      formatDate(e.created)
    ])
    
    return [headers, ...rows].map(row => row.join(',')).join('\n')
  }

  const downloadCSV = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    window.URL.revokeObjectURL(url)
  }

type StatCardProps = {
  title: string
  value: string | number
  icon: React.ReactNode
  gradient: string
  accent: string
}

function StatCard({ title, value, icon, gradient, accent }: StatCardProps) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br ${gradient} p-5 shadow-sm`}>
      
      {/* Accent glow */}
      <div className={`absolute -top-10 -right-10 w-24 h-24 rounded-full ${accent} opacity-20`} />

      <div className="relative flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-700">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
        </div>

        <div className="p-3 rounded-xl bg-white/70 backdrop-blur shadow">
          {icon}
        </div>
      </div>
    </div>
  )
}



  return (
    <div style={{ height: "100vh", display: "flex", background: "#f0f2f8", fontFamily: "'DM Sans','Inter',sans-serif", overflow: "hidden" }}>

      {/* Left panel */}
      <div style={{ width: 420, minWidth: 420, background: "#fff", borderRight: "1px solid #e8ecf3", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "24px 22px 16px", borderBottom: "1px solid #f1f5f9" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#94a3b8", marginBottom: 2 }}>Gestion</p>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", margin: 0 }}>Inscriptions</h1>
            </div>
            <div style={{ background: "linear-gradient(135deg,var(--accent,#6366f1),#818cf8)", color: "#fff", borderRadius: 12, padding: "6px 16px", fontSize: 22, fontWeight: 800 }}>{totalEnrollments}</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ position: "relative" }}>
              <Search style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 15, height: 15, color: "#94a3b8" }} />
              <input
                type="text"
                placeholder="Rechercher une inscription..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ width: "100%", padding: "9px 12px 9px 36px", background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 13, outline: "none", boxSizing: "border-box", color: "#0f172a", fontFamily: "inherit" }}
                onFocus={e => { e.currentTarget.style.borderColor = "var(--accent,#6366f1)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.1)" }}
                onBlur={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.boxShadow = "none" }}
              />
            </div>

            <SelectField value={selectedStatus} onChange={v => setSelectedStatus(v as EnrollmentStatus | "all")}> 
              <option value="all">Tous les statuts</option>
              {STATUS_OPTIONS.map(status => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </SelectField>

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button
                onClick={() => setSelectedStatus("all")}
                style={{ padding: "5px 10px", borderRadius: 999, border: "1px solid #e2e8f0", background: selectedStatus === "all" ? "rgba(99,102,241,0.12)" : "#f8fafc", color: selectedStatus === "all" ? "var(--accent,#6366f1)" : "#475569", fontSize: 11, cursor: "pointer" }}
              >
                Tous ({enrollments.length})
              </button>
              {STATUS_OPTIONS.map(status => (
                <button
                  key={status.value}
                  onClick={() => setSelectedStatus(status.value)}
                  style={{ padding: "5px 10px", borderRadius: 999, border: "1px solid #e2e8f0", background: selectedStatus === status.value ? status.bgColor : "#f8fafc", color: selectedStatus === status.value ? status.color : "#475569", fontSize: 11, cursor: "pointer" }}
                >
                  {status.label} ({statusCounts[status.value]})
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div style={{ background: "#f8fafc", border: "1px solid #e8ecf3", borderRadius: 12, padding: "10px 12px" }}>
            <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>En attente</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginTop: 4 }}>{statusCounts.pending}</div>
          </div>
          <div style={{ background: "#f8fafc", border: "1px solid #e8ecf3", borderRadius: 12, padding: "10px 12px" }}>
            <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>Confirmes</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginTop: 4 }}>{statusCounts.confirmed}</div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "8px 8px" }}>
          {filteredEnrollments.length === 0 ? (
            <div style={{ padding: "48px 24px", textAlign: "center" }}>
              <Users style={{ width: 40, height: 40, color: "#cbd5e1", margin: "0 auto 12px" }} />
              <p style={{ fontSize: 13, color: "#94a3b8" }}>Aucune inscription trouvee</p>
            </div>
          ) : filteredEnrollments.map(enrollment => {
            const isActive = selectedEnrollment?.id === enrollment.id
            return (
              <div
                key={enrollment.id}
                onClick={() => setSelectedEnrollment(enrollment)}
                style={{ padding: "13px 14px", borderRadius: 12, cursor: "pointer", marginBottom: 4, background: isActive ? "linear-gradient(135deg,rgba(99,102,241,0.08),rgba(129,140,248,0.05))" : "transparent", border: isActive ? "1.5px solid rgba(99,102,241,0.2)" : "1.5px solid transparent", transition: "all 0.15s", position: "relative" }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = "#f8fafc" }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = "transparent" }}
              >
                {isActive && <div style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", width: 3, height: 28, background: "var(--accent,#6366f1)", borderRadius: "0 3px 3px 0" }} />}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: isActive ? "var(--accent,#6366f1)" : "#0f172a", margin: "0 0 3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {enrollment.firstName} {enrollment.lastName}
                    </p>
                    <p style={{ fontSize: 12, color: "#94a3b8", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{enrollment.courseTitle || enrollment.bootcampTitle || "Non specifie"}</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 7 }}>
                      {getStatusBadge(enrollment.status)}
                      <span style={{ fontSize: 11, color: "#64748b" }}>{formatDate(enrollment.created)}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                    <IconBtn onClick={e => { e.stopPropagation(); handleDeleteEnrollment(enrollment.id) }} color="#f43f5e" hoverBg="rgba(244,63,94,0.08)"><Trash2 style={{ width: 13, height: 13 }} /></IconBtn>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Right panel */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {selectedEnrollment ? (
          <>
            <div style={{ background: "#fff", borderBottom: "1px solid #e8ecf3", padding: "14px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#94a3b8", margin: 0 }}>Details</p>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: "2px 0 0" }}>Inscription</h2>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setSelectedEnrollment(null)}
                  style={{ padding: "8px 16px", borderRadius: 10, border: "1.5px solid #e2e8f0", background: "#fff", fontSize: 13, fontWeight: 600, color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "all 0.15s" }}
                >
                  <X style={{ width: 14, height: 14 }} /> Fermer
                </button>
                <button onClick={() => handleDeleteEnrollment(selectedEnrollment.id)}
                  style={{ padding: "8px 16px", borderRadius: 10, border: "1.5px solid #fecdd3", background: "#fff1f2", fontSize: 13, fontWeight: 600, color: "#e11d48", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                >
                  <Trash2 style={{ width: 14, height: 14 }} /> Supprimer
                </button>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "28px" }}>
              <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", flexDirection: "column", gap: 28 }}>

                {error && (
                  <div style={{ padding: "12px 14px", borderRadius: 12, background: "#fff1f2", border: "1px solid #fecdd3", color: "#9f1239", fontSize: 13, fontWeight: 600 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <AlertCircle style={{ width: 16, height: 16 }} />
                      <span>{error}</span>
                    </div>
                  </div>
                )}

                <FormCard title="Informations personnelles" icon={<Users style={{ width: 16, height: 16 }} />}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div style={{ background: "#f8fafc", borderRadius: 12, padding: "10px 12px", border: "1px solid #e8ecf3" }}>
                      <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>Nom complet</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginTop: 4 }}>{selectedEnrollment.firstName} {selectedEnrollment.lastName}</div>
                    </div>
                    <div style={{ background: "#f8fafc", borderRadius: 12, padding: "10px 12px", border: "1px solid #e8ecf3" }}>
                      <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>Date de naissance</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginTop: 4 }}>{selectedEnrollment.birthDate.split(" ")[0]}</div>
                    </div>
                    <div style={{ background: "#f8fafc", borderRadius: 12, padding: "10px 12px", border: "1px solid #e8ecf3" }}>
                      <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>Experience</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: selectedEnrollment.hasExperience ? "#16a34a" : "#b45309", marginTop: 4 }}>{selectedEnrollment.hasExperience ? "Oui" : "Non"}</div>
                    </div>
                  </div>
                </FormCard>

                <FormCard title="Coordonnees" icon={<Mail style={{ width: 16, height: 16 }} />}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Mail style={{ width: 16, height: 16, color: "#94a3b8" }} />
                      <div>
                        <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>Email</div>
                        <div style={{ fontSize: 13, color: "#0f172a" }}>{selectedEnrollment.email}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Phone style={{ width: 16, height: 16, color: "#94a3b8" }} />
                      <div>
                        <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>Telephone</div>
                        <div style={{ fontSize: 13, color: "#0f172a" }}>{selectedEnrollment.phone}</div>
                      </div>
                    </div>
                  </div>
                </FormCard>

                <FormCard title="Programme" icon={<BookOpen style={{ width: 16, height: 16 }} />}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div style={{ background: "#f8fafc", borderRadius: 12, padding: "10px 12px", border: "1px solid #e8ecf3" }}>
                      <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>{selectedEnrollment.courseTitle ? "Formation" : "Bootcamp"}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginTop: 4 }}>{selectedEnrollment.courseTitle || selectedEnrollment.bootcampTitle}</div>
                    </div>
                    <div style={{ background: "#f8fafc", borderRadius: 12, padding: "10px 12px", border: "1px solid #e8ecf3" }}>
                      <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>Date d'inscription</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginTop: 4 }}>{formatDate(selectedEnrollment.created)}</div>
                    </div>
                  </div>
                </FormCard>

                <FormCard title="Statut" icon={<CheckCircle style={{ width: 16, height: 16 }} />}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div>{getStatusBadge(selectedEnrollment.status)}</div>
                    <SelectField value={selectedEnrollment.status} onChange={v => handleUpdateStatus(selectedEnrollment.id, v as EnrollmentStatus)}>
                      {STATUS_OPTIONS.map(status => (
                        <option key={status.value} value={status.value}>{status.label}</option>
                      ))}
                    </SelectField>
                  </div>
                </FormCard>

                {selectedEnrollment.note && (
                  <FormCard title="Notes" icon={<AlertCircle style={{ width: 16, height: 16 }} />}>
                    <div style={{ padding: "12px", borderRadius: 10, background: "#fff7ed", border: "1px solid #fed7aa", fontSize: 13, color: "#9a3412" }}>
                      {selectedEnrollment.note}
                    </div>
                  </FormCard>
                )}
              </div>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
            <div style={{ width: 80, height: 80, borderRadius: 24, background: "linear-gradient(135deg,rgba(99,102,241,0.12),rgba(129,140,248,0.06))", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Users style={{ width: 36, height: 36, color: "var(--accent,#6366f1)" }} />
            </div>
            <div style={{ textAlign: "center" }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", margin: "0 0 6px" }}>Aucune inscription selectionnee</h3>
              <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>Choisissez une inscription dans la liste pour voir les details.</p>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        ::-webkit-scrollbar{width:5px;height:5px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:#e2e8f0;border-radius:99px}
        ::-webkit-scrollbar-thumb:hover{background:#cbd5e1}
      `}</style>
    </div>
  )

}
