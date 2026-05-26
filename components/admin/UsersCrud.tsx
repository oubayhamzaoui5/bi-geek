"use client"

import { useState, useEffect } from "react"
import {
  Search, Plus, Edit, Trash2,
  Save, X, User, Camera,
  Key, AlertCircle, CheckCircle, Copy,
  Mail, Phone, Loader2
} from "lucide-react"
import { AdminPageHeader } from "@/components/admin/AdminPageHeader"

// ─── Types ──────────────────────────────────────────────────────────────────────

type ToastType = "success" | "error"
type Toast = { id: string; type: ToastType; message: string; duration: number; createdAt: number }

export type AdminUser = {
  id?: string
  avatar: string | null
  username: string
  name?: string
  surname?: string
  email: string
  phone: string
  role: "admin" | "admin_agent" | "student" | "instructor"
  verified: boolean
  usePassword?: boolean
  password?: string
  plainPassword?: string | null
}

type UsersCrudProps = {
  initialUsers?: AdminUser[]
  onSave?: (user: AdminUser, avatarFile?: File) => Promise<AdminUser | void>
  onDelete?: (id: string) => Promise<void>
  onView?: (id: string) => void
  currentUserRole?: string
}

// ─── Constants ──────────────────────────────────────────────────────────────────

const AVATAR_PALETTES = [
  { from: "#6366f1", to: "#818cf8" }, // indigo
  { from: "#8b5cf6", to: "#a78bfa" }, // violet
  { from: "#ec4899", to: "#f472b6" }, // pink
  { from: "#f59e0b", to: "#fbbf24" }, // amber
  { from: "#10b981", to: "#34d399" }, // emerald
  { from: "#3b82f6", to: "#60a5fa" }, // blue
  { from: "#ef4444", to: "#f87171" }, // red
  { from: "#14b8a6", to: "#2dd4bf" }, // teal
]

function avatarColor(name: string): { from: string; to: string } {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_PALETTES[Math.abs(hash) % AVATAR_PALETTES.length]
}

// ─── UI primitives (matching CoursesCrud / GroupsCrud) ───────────────────────────

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6, letterSpacing: "0.02em" }}>
      {children}{required && <span style={{ color: "#f43f5e", marginLeft: 3 }}>*</span>}
    </label>
  )
}

function Input({ value, onChange, placeholder, type = "text", readOnly, disabled, style }: {
  value: string; onChange?: (v: string) => void; placeholder?: string; type?: string; readOnly?: boolean; disabled?: boolean; style?: React.CSSProperties
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange?.(e.target.value)}
      placeholder={placeholder}
      readOnly={readOnly}
      disabled={disabled}
      style={{
        width: "100%", padding: "10px 14px",
        background: readOnly || disabled ? "#f1f5f9" : "#f8fafc",
        border: "1.5px solid #e2e8f0", borderRadius: 10,
        fontSize: 14, color: readOnly || disabled ? "#475569" : "#0f172a",
        outline: "none", boxSizing: "border-box", fontFamily: "inherit",
        transition: "border-color 0.15s, box-shadow 0.15s",
        ...style
      }}
      onFocus={e => { if (readOnly || disabled) return; e.target.style.borderColor = "var(--accent,#6366f1)"; e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.12)"; e.target.style.background = "#fff" }}
      onBlur={e => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none"; e.target.style.background = readOnly || disabled ? "#f1f5f9" : "#f8fafc" }}
    />
  )
}

function SelectField({ value, onChange, children, disabled }: {
  value: string; onChange: (v: string) => void; children: React.ReactNode; disabled?: boolean
}) {
  return (
    <div style={{ position: "relative" }}>
      <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled}
        style={{ width: "100%", padding: "10px 36px 10px 14px", background: disabled ? "#f1f5f9" : "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 14, color: disabled ? "#475569" : "#0f172a", outline: "none", appearance: "none", cursor: disabled ? "not-allowed" : "pointer", fontFamily: "inherit", transition: "border-color 0.15s" }}
        onFocus={e => { if (!disabled) { e.target.style.borderColor = "var(--accent,#6366f1)"; e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.12)" } }}
        onBlur={e => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none" }}
      >{children}</select>
      <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#475569", pointerEvents: "none", fontSize: 11 }}>▾</div>
    </div>
  )
}

function IconBtn({ onClick, title, color = "#475569", hoverBg = "#f1f5f9", children }: {
  onClick: (e: React.MouseEvent) => void; title?: string; color?: string; hoverBg?: string; children: React.ReactNode
}) {
  const [hover, setHover] = useState(false)
  return (
    <button onClick={onClick} title={title}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ padding: 8, borderRadius: 8, border: "none", background: hover ? hoverBg : "transparent", color, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.15s" }}
    >{children}</button>
  )
}

function FormCard({ title, icon, children, action }: { title: string; icon?: React.ReactNode; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", borderRadius: 18, border: "1px solid #e8ecf3", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
      <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(180deg,#fafbfd 0%,#fff 100%)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: "var(--accent,#6366f1)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</div>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: 0 }}>{title}</h3>
        </div>
        {action}
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────────

const ADMIN_ROLES = ["admin", "admin_agent"]

export default function UsersCrud({ initialUsers = [], onSave, onDelete, onView, currentUserRole }: UsersCrudProps) {
  const isAdmin = currentUserRole === "admin"
  const isAdminAgent = currentUserRole === "admin_agent"
  const canAssignRole = (role: AdminUser["role"]) => {
    if (isAdmin) return role !== "admin"
    if (isAdminAgent) return !ADMIN_ROLES.includes(role)
    return false
  }
  const canManageUser = (user: AdminUser) => canAssignRole(user.role)

  // ── State ──
  const [users, setUsers] = useState<AdminUser[]>(initialUsers)
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterRole, setFilterRole] = useState("student")
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generatedPassword, setGeneratedPassword] = useState("")
  const [passwordCopied, setPasswordCopied] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [usernamePreview, setUsernamePreview] = useState("")
  const [usernamePreviewLoading, setUsernamePreviewLoading] = useState(false)
  const [newUserAvatarColor, setNewUserAvatarColor] = useState<{ from: string; to: string } | null>(null)

  const showToast = (type: ToastType, message: string, duration = 4500) => {
    const id = `toast_${Date.now()}_${Math.random()}`
    setToasts(prev => [...prev, { id, type, message, duration, createdAt: Date.now() }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration)
  }
  const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id))

  // ── Normalise ──
  const normalizeUser = (user: AdminUser): AdminUser => {
    const fb = user as AdminUser & { firstName?: string; lastName?: string }
    return {
      ...user,
      name: user.name ?? fb.firstName ?? "",
      surname: user.surname ?? fb.lastName ?? "",
      phone: user.phone ?? "",
      username: user.username ?? "",
      plainPassword: user.plainPassword ?? null,
      usePassword: user.usePassword ?? false,
      verified: typeof user.verified === "boolean" ? user.verified : true,
    }
  }

  const getDisplayName = (user: AdminUser) => {
    const full = [user.name, user.surname].filter(Boolean).join(" ").trim()
    return full || user.username || user.email
  }

  useEffect(() => { setUsers(initialUsers.map(normalizeUser)) }, [initialUsers])

  // Pre-fill form from enrollment "Créer un compte"
  useEffect(() => {
    const raw = sessionStorage.getItem("user_prefill")
    if (!raw) return
    sessionStorage.removeItem("user_prefill")
    try {
      const prefill = JSON.parse(raw)
      setEditingUser({
        avatar: null,
        name:    prefill.name    ?? "",
        surname: prefill.surname ?? "",
        email:   prefill.email   ?? "",
        phone:   prefill.phone   ?? "",
        username: "",
        role: "student",
        verified: true,
        usePassword: false,
        plainPassword: null,
      })
      setIsCreating(true)
      setAvatarFile(null)
      setAvatarPreview(null)
      setNewUserAvatarColor(AVATAR_PALETTES[Math.floor(Math.random() * AVATAR_PALETTES.length)])
      setGeneratedPassword("")
      setPasswordCopied(false)
      setError(null)
    } catch { /* ignore malformed data */ }
  }, [])

  useEffect(() => {
    if (avatarFile) {
      const reader = new FileReader()
      reader.onloadend = () => setAvatarPreview(reader.result as string)
      reader.readAsDataURL(avatarFile)
    } else {
      setAvatarPreview(null)
    }
  }, [avatarFile])

  // ── Filters ──
  const visibleUsers = users.filter(canManageUser)

  const filteredUsers = visibleUsers.filter(user => {
    const q = searchTerm.toLowerCase()
    const matchSearch = !q ||
      user.username.toLowerCase().includes(q) ||
      (user.name || "").toLowerCase().includes(q) ||
      (user.surname || "").toLowerCase().includes(q) ||
      user.email.toLowerCase().includes(q) ||
      user.phone.toLowerCase().includes(q)
    const matchRole = user.role === filterRole
    return matchSearch && matchRole
  })

  const stats = {
    total: visibleUsers.length,
    admin: visibleUsers.filter(u => u.role === "admin").length,
    admin_agent: visibleUsers.filter(u => u.role === "admin_agent").length,
    instructor: visibleUsers.filter(u => u.role === "instructor").length,
    student: visibleUsers.filter(u => u.role === "student").length,
  }

  // ── Handlers ──
  const createBlankUser = (): AdminUser => ({
    avatar: null, name: "", surname: "", username: "",
    email: "", phone: "", role: "student", verified: true,
    usePassword: false, plainPassword: null,
  })

  const handleSelectUser = (user: AdminUser) => {
    if (!canManageUser(user)) {
      setError("Permission refusée : ce compte ne peut pas être modifié.")
      return
    }
    setEditingUser(normalizeUser(user)); setAvatarFile(null)
    setAvatarPreview(user.avatar || null); setGeneratedPassword("")
    setNewUserAvatarColor(null)
    setPasswordCopied(false); setIsCreating(false); setError(null)
  }

  const handleNewUser = () => {
    setEditingUser(createBlankUser()); setAvatarFile(null)
    setAvatarPreview(null); setGeneratedPassword("")
    setNewUserAvatarColor(AVATAR_PALETTES[Math.floor(Math.random() * AVATAR_PALETTES.length)])
    setPasswordCopied(false); setIsCreating(true); setError(null)
  }

  const handleCancelEdit = () => {
    setEditingUser(null); setAvatarFile(null)
    setAvatarPreview(null); setGeneratedPassword("")
    setNewUserAvatarColor(null)
    setPasswordCopied(false); setIsCreating(false); setError(null)
  }

  const generatePassword = (length = 12) => {
    const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ", lower = "abcdefghijkmnopqrstuvwxyz"
    const nums = "23456789", symbols = "!@#$%*?", all = upper + lower + nums + symbols
    const pick = (s: string) => s[Math.floor(Math.random() * s.length)]
    let pwd = pick(upper) + pick(lower) + pick(nums) + pick(symbols)
    for (let i = pwd.length; i < length; i++) pwd += all[Math.floor(Math.random() * all.length)]
    return pwd.split("").sort(() => Math.random() - 0.5).join("")
  }

  const generateUniqueUsername = (name: string, surname: string, email: string, currentId?: string) => {
    const base = [name, surname].filter(Boolean).join("_")
    let bu = base.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")
    if (!bu && email.includes("@")) bu = email.split("@")[0].toLowerCase()
    if (!bu) bu = `user${Date.now()}`
    const existing = new Set(users.filter(u => u.id !== currentId).map(u => (u.username || "").toLowerCase()).filter(Boolean))
    if (!existing.has(bu)) return bu
    let c = 2, cand = `${bu}_${c}`
    while (existing.has(cand)) { c++; cand = `${bu}_${c}` }
    return cand
  }

  useEffect(() => {
    if (!editingUser) {
      setUsernamePreview("")
      setUsernamePreviewLoading(false)
      return
    }

    if (!isCreating) {
      setUsernamePreview(editingUser.username || "")
      setUsernamePreviewLoading(false)
      return
    }

    const hasIdentity = !!(editingUser.name?.trim() || editingUser.surname?.trim() || editingUser.email?.trim())
    setUsernamePreview("")
    setUsernamePreviewLoading(hasIdentity)
    if (!hasIdentity) return

    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          usernamePreview: "1",
          name: editingUser.name || "",
          surname: editingUser.surname || "",
          email: editingUser.email || "",
        })
        if (editingUser.id) params.set("currentId", editingUser.id)
        const res = await fetch(`/api/admin/users?${params.toString()}`, { signal: controller.signal })
        const data = await res.json().catch(() => ({}))
        if (res.ok && data?.username) setUsernamePreview(data.username)
      } catch (err: any) {
        if (err?.name !== "AbortError") setUsernamePreview("")
      } finally {
        if (!controller.signal.aborted) setUsernamePreviewLoading(false)
      }
    }, 250)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [editingUser?.id, editingUser?.name, editingUser?.surname, editingUser?.email, editingUser?.username, isCreating])

  const handleCopyPassword = async () => {
    const pwd = isCreating
      ? (editingUser?.usePassword ? (editingUser?.plainPassword ?? "") : generatedPassword)
      : (editingUser?.plainPassword ?? "")
    if (!pwd) return
    try { await navigator.clipboard.writeText(pwd); setPasswordCopied(true); setTimeout(() => setPasswordCopied(false), 2000) }
    catch { setError("Impossible de copier le mot de passe") }
  }

  useEffect(() => {
    if (!isCreating || !editingUser) return
    if (!editingUser.usePassword && editingUser.email.trim() && !generatedPassword) {
      setGeneratedPassword(generatePassword()); setPasswordCopied(false)
    }
  }, [editingUser?.email, editingUser?.usePassword, isCreating, generatedPassword])

  const handleSaveUser = async () => {
    if (!editingUser) return
    if (!canAssignRole(editingUser.role)) return setError("Permission refusée : vous ne pouvez pas créer ou modifier ce type de compte.")
    if (!editingUser.name?.trim() || !editingUser.surname?.trim()) return setError("Le prénom et le nom sont obligatoires")
    if (!editingUser.email.trim()) return setError("L'email est obligatoire")
    if (!editingUser.phone.trim()) return setError("Le téléphone est obligatoire")
    if (isCreating && !editingUser.usePassword && !generatedPassword) return setError("Le mot de passe est obligatoire")
    setLoading(true); setError(null)
    try {
      const username = usernamePreview || generateUniqueUsername(editingUser.name || "", editingUser.surname || "", editingUser.email || "", editingUser.id)
      const finalPwd = editingUser.usePassword ? (editingUser.plainPassword || "") : (generatedPassword || "")
      const userToSave = {
        ...editingUser, username,
        ...(isCreating ? { password: finalPwd, plainPassword: finalPwd }
          : editingUser.usePassword && finalPwd ? { password: finalPwd, plainPassword: finalPwd } : {})
      }
      const savedUser = onSave ? await onSave(userToSave, avatarFile || undefined) : undefined
      const savedUsername = savedUser?.username || username
      if (editingUser.id) {
        const updated = avatarPreview ? { ...editingUser, avatar: avatarPreview, username: savedUsername } : { ...editingUser, username: savedUsername }
        setUsers(prev => prev.map(u => u.id === editingUser.id ? updated : u))
        showToast("success", "Utilisateur mis à jour avec succès !")
      } else {
        const newUser = savedUser || { ...editingUser, username: savedUsername, id: `user_${Date.now()}`, avatar: avatarPreview }
        setUsers(prev => [...prev, newUser])
        showToast("success", "Utilisateur créé avec succès !")
      }
      handleCancelEdit()
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'enregistrement")
      showToast("error", err.message || "Erreur lors de l'enregistrement")
    } finally { setLoading(false) }
  }

  const handleResetPassword = async () => {
    if (!editingUser?.id) return
    if (!confirm("Réinitialiser le mot de passe ? Un nouveau mot de passe temporaire sera généré.")) return
    setLoading(true); setError(null)
    try {
      const res = await fetch("/api/admin/users/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: editingUser.id }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Erreur lors de la réinitialisation")
      const updated = { ...editingUser, usePassword: false, plainPassword: data.plainPassword as string }
      setUsers(prev => prev.map(u => u.id === editingUser.id ? updated : u))
      setEditingUser(updated); setGeneratedPassword(""); setPasswordCopied(false)
      setError("Mot de passe réinitialisé avec succès! Communiquez-le à l'utilisateur.")
      setTimeout(() => setError(null), 5000)
    } catch (err: any) {
      setError(err.message || "Erreur lors de la réinitialisation")
    } finally { setLoading(false) }
  }

  const handleDeleteUser = async (id: string) => {
    const user = users.find(u => u.id === id)
    if (!user) return
    if (!canManageUser(user)) return setError("Permission refusée : ce compte ne peut pas être supprimé.")
    if (!confirm(`Supprimer l'utilisateur ${getDisplayName(user)} ? Cette action est irréversible.`)) return
    try {
      if (onDelete) await onDelete(id)
      setUsers(prev => prev.filter(u => u.id !== id))
      if (editingUser?.id === id) handleCancelEdit()
    } catch (err: any) { setError(err.message || "Erreur lors de la suppression") }
  }

  const handleToggleVerification = (userId: string) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, verified: !u.verified } : u))
    if (editingUser?.id === userId) setEditingUser(prev => prev ? { ...prev, verified: !prev.verified } : null)
  }

  const isSuccess = (error || "").toLowerCase().includes("succ")

  // ── Render ──────────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: "100vh", background: "#fafafa", fontFamily: "'DM Sans','Inter',sans-serif" }}>

      <AdminPageHeader
        title="Utilisateurs"
        description="Gérez les comptes et les accès"
        breadcrumbs={[{ label: "Utilisateurs" }]}
        actions={
          <button onClick={handleNewUser}
            style={{ padding: "9px 20px", background: "var(--accent,#6366f1)", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, transition: "opacity 0.15s" }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.88")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
          >
            <Plus style={{ width: 15, height: 15 }} /> Nouvel utilisateur
          </button>
        }
      />

      {/* ── Filters bar ── */}
      <div style={{ padding: "14px 32px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, borderBottom: "1px solid #f1f5f9", background: "#fff" }}>
        {/* Search */}
        <div style={{ position: "relative", flex: 1 }}>
          <Search style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "#475569" }} />
          <input type="text" placeholder="Rechercher un utilisateur…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            style={{ width: "100%", padding: "7px 12px 7px 34px", background: "#f8fafc", border: "1.5px solid #e8ecf3", borderRadius: 9, fontSize: 13, outline: "none", boxSizing: "border-box", color: "#0f172a", fontFamily: "inherit" }}
            onFocus={e => { e.target.style.borderColor = "var(--accent,#6366f1)"; e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.08)" }}
            onBlur={e => { e.target.style.borderColor = "#e8ecf3"; e.target.style.boxShadow = "none" }}
          />
        </div>
        {/* Role filter pills */}
        <div className="dashboard-role-filter-pills" style={{ display: "flex", gap: 6 }}>
          {([
            { value: "student",     label: "Apprenants",    count: stats.student },
            { value: "instructor",  label: "Formateurs",    count: stats.instructor },
            { value: "admin_agent", label: "Agents administratifs",  count: stats.admin_agent },
            { value: "admin",       label: "Admins",        count: stats.admin },
          ] as { value: AdminUser["role"]; label: string; count: number }[]).filter(({ value }) => canAssignRole(value)).map(({ value, label, count }) => {
            const active = filterRole === value
            return (
              <button key={value} onClick={() => setFilterRole(value)}
                style={{ padding: "6px 14px", borderRadius: 8, border: `1.5px solid ${active ? "var(--accent,#6366f1)" : "#e8ecf3"}`, background: active ? "var(--accent,#6366f1)" : "#f8fafc", color: active ? "#fff" : "#475569", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 7, transition: "all 0.15s", fontFamily: "inherit" }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.borderColor = "var(--accent,#6366f1)"; e.currentTarget.style.color = "var(--accent,#6366f1)" } }}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.borderColor = "#e8ecf3"; e.currentTarget.style.color = "#475569" } }}
              >
                {label}
                <span style={{ fontSize: 11, fontWeight: 700, padding: "1px 6px", borderRadius: 5, background: active ? "rgba(255,255,255,0.22)" : "#e8ecf3", color: active ? "#fff" : "#475569" }}>{count}</span>
              </button>
            )
          })}
        </div>
        {/* Count */}
        <div style={{ fontSize: 13, color: "#475569", marginLeft: "auto" }}>
          <span style={{ fontWeight: 600, color: "#0f172a" }}>{filteredUsers.length}</span> utilisateur{filteredUsers.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* ── Table ── */}
      <div style={{ padding: "0px 0px" }}>
        {filteredUsers.length === 0 ? (
          <div style={{ background: "#fff", padding: "64px 24px", textAlign: "center" }}>
            <User style={{ width: 40, height: 40, color: "#e2e8f0", margin: "0 auto 12px" }} />
            <p style={{ fontSize: 15, fontWeight: 600, color: "#475569", margin: "0 0 4px" }}>Aucun utilisateur trouvé</p>
            <p style={{ fontSize: 13, color: "#475569", margin: 0 }}>Créez votre premier utilisateur avec le bouton ci-dessus.</p>
          </div>
        ) : (
          <div style={{ background: "#fff", overflow: "hidden" }}>
            {/* Table header */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 200px 100px", padding: "12px 36px", borderBottom: "1px solid #f1f5f9", background: "#fafbfd" }}>
              {["Utilisateur", "Contact", "Actions"].map(h => (
                <span key={h} style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</span>
              ))}
            </div>
            {/* Rows */}
            {filteredUsers.map((user, idx) => {
              const displayName = getDisplayName(user)
              return (
                <div key={user.id}
                  onClick={() => canManageUser(user) && handleSelectUser(user)}
                  style={{ display: "grid", gridTemplateColumns: "1fr 200px 100px", padding: "20px 36px", borderBottom: idx < filteredUsers.length - 1 ? "1px solid #f1f5f9" : "none", alignItems: "center", transition: "background 0.15s", cursor: canManageUser(user) ? "pointer" : "default" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#fafbfd")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  {/* Avatar + Name */}
                  <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0, paddingRight: 16 }}>
                    <div style={{ position: "relative", flexShrink: 0 }}>
                      {user.avatar ? (
                        <img src={user.avatar} alt={displayName}
                          style={{ width: 46, height: 46, borderRadius: "50%", objectFit: "cover", border: "2px solid #f1f5f9", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" }} />
                      ) : (
                        <div style={{ width: 46, height: 46, borderRadius: "50%", background: `linear-gradient(135deg,${avatarColor(displayName).from},${avatarColor(displayName).to})`, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #f1f5f9", boxShadow: "0 2px 8px rgba(0,0,0,0.10)" }}>
                          <span style={{ fontSize: 17, fontWeight: 700, color: "#fff" }}>{displayName[0]?.toUpperCase()}</span>
                        </div>
                      )}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: "0 0 2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayName}</p>
                      <p style={{ fontSize: 12, color: "#475569", margin: 0 }}>@{user.username || "—"}</p>
                    </div>
                  </div>
                  {/* Contact */}
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 12, color: "#475569", margin: "0 0 3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 5 }}>
                      <Mail style={{ width: 11, height: 11, flexShrink: 0 }} />{user.email}
                    </p>
                    {user.phone && (
                      <p style={{ fontSize: 12, color: "#475569", margin: 0, display: "flex", alignItems: "center", gap: 5 }}>
                        <Phone style={{ width: 11, height: 11, flexShrink: 0 }} />{user.phone}
                      </p>
                    )}
                  </div>
                  {/* Actions */}
                  <div style={{ display: "flex", gap: 2 }}>
                    {canManageUser(user) && (
                      <IconBtn onClick={e => { e.stopPropagation(); handleSelectUser(user) }} color="var(--accent,#6366f1)" hoverBg="rgba(99,102,241,0.08)" title="Modifier">
                        <Edit style={{ width: 16, height: 16 }} />
                      </IconBtn>
                    )}
                    {canManageUser(user) && (
                      <IconBtn onClick={e => { e.stopPropagation(); user.id && handleDeleteUser(user.id) }} color="#f43f5e" hoverBg="rgba(244,63,94,0.08)" title="Supprimer">
                        <Trash2 style={{ width: 16, height: 16 }} />
                      </IconBtn>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Modal overlay ── */}
      {editingUser && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.5)", backdropFilter: "blur(6px)" }} onClick={handleCancelEdit} />
          <div style={{ position: "relative", background: "#fff", borderRadius: 20, boxShadow: "0 24px 64px rgba(0,0,0,0.15), 0 4px 16px rgba(0,0,0,0.06)", width: "100%", maxWidth: 700, maxHeight: "94vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>

            {/* Accent strip */}
            <div style={{ height: 3, background: "linear-gradient(90deg,var(--accent,#6366f1),#818cf8,#a78bfa)", flexShrink: 0 }} />

            {/* Modal header */}
            <div style={{ padding: "20px 28px 18px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#a5b4fc", margin: "0 0 4px" }}>
                  {isCreating ? "Nouvel utilisateur" : "Modifier"}
                </p>
                <h2 style={{ fontSize: 19, fontWeight: 700, color: "#0f172a", margin: 0, letterSpacing: "-0.02em" }}>
                  {getDisplayName(editingUser) || "Nouvel utilisateur"}
                </h2>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button onClick={handleSaveUser} disabled={loading}
                  style={{ padding: "9px 22px", borderRadius: 10, border: "none", background: loading ? "#f1f5f9" : "linear-gradient(135deg,var(--accent,#6366f1),#818cf8)", color: loading ? "#475569" : "#fff", fontSize: 13, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 7, boxShadow: loading ? "none" : "0 4px 14px rgba(99,102,241,0.35)", transition: "all 0.2s" }}
                  onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; if (!loading) b.style.boxShadow = "0 6px 20px rgba(99,102,241,0.5)" }}
                  onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; if (!loading) b.style.boxShadow = "0 4px 14px rgba(99,102,241,0.35)" }}
                >
                  {loading ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : <Save style={{ width: 14, height: 14 }} />}
                  {loading ? "Enregistrement…" : "Enregistrer"}
                </button>
                <button onClick={handleCancelEdit}
                  style={{ width: 34, height: 34, borderRadius: 9, border: "1.5px solid #e8ecf3", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#475569", transition: "all 0.15s" }}
                  onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = "#fca5a5"; b.style.color = "#ef4444"; b.style.background = "#fff5f5" }}
                  onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = "#e8ecf3"; b.style.color = "#475569"; b.style.background = "#fff" }}
                >
                  <X style={{ width: 15, height: 15 }} />
                </button>
              </div>
            </div>

            {/* Modal body */}
            <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px", background: "#f7f9fc" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

                {/* Error / success */}
                {error && (
                  <div style={{ padding: "12px 16px", borderRadius: 12, background: isSuccess ? "#f0fdf4" : "#fff1f2", border: `1px solid ${isSuccess ? "#bbf7d0" : "#fecdd3"}`, color: isSuccess ? "#166534" : "#9f1239", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <AlertCircle style={{ width: 16, height: 16, flexShrink: 0, marginTop: 1 }} />
                    <div>
                      <span>{error}</span>
                    </div>
                  </div>
                )}

                {/* Avatar */}
                <FormCard title="Photo de profil" icon={<User style={{ width: 16, height: 16 }} />}>
                  <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                    <div style={{ position: "relative", flexShrink: 0 }}>
                      {avatarPreview || editingUser.avatar ? (
                        <img src={avatarPreview || editingUser.avatar!} alt="Avatar"
                          style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover", border: "3px solid #fff", boxShadow: "0 4px 14px rgba(15,23,42,0.12)" }} />
                      ) : (() => {
                          const dn = [editingUser.name, editingUser.surname].filter(Boolean).join(" ") || editingUser.username || "U"
                          const { from, to } = isCreating && newUserAvatarColor ? newUserAvatarColor : avatarColor(dn)
                          return (
                            <div style={{ width: 80, height: 80, borderRadius: "50%", background: `linear-gradient(135deg,${from},${to})`, display: "flex", alignItems: "center", justifyContent: "center", border: "3px solid #fff", boxShadow: "0 4px 14px rgba(15,23,42,0.12)" }}>
                              <span style={{ fontSize: 28, fontWeight: 700, color: "#fff" }}>{dn[0]?.toUpperCase()}</span>
                            </div>
                          )
                        })()
                      }
                      <label style={{ position: "absolute", right: -4, bottom: -4, width: 28, height: 28, background: "linear-gradient(135deg,var(--accent,#6366f1),#818cf8)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 3px 10px rgba(99,102,241,0.35)" }}>
                        <Camera style={{ width: 13, height: 13, color: "#fff" }} />
                        <input type="file" accept="image/*" style={{ display: "none" }}
                          onChange={e => { const f = e.target.files?.[0]; if (f) setAvatarFile(f) }} />
                      </label>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ marginBottom: 8 }}>
                        <FieldLabel>Télécharger une photo</FieldLabel>
                        <input type="file" accept="image/*"
                          style={{ width: "100%", fontSize: 12 }}
                          onChange={e => { const f = e.target.files?.[0]; if (f) setAvatarFile(f) }} />
                      </div>
                      <p style={{ fontSize: 12, color: "#475569", margin: 0 }}>Formats: JPG, PNG, WebP · Max 2MB · Recommandé: 400×400px</p>
                      {(avatarPreview || editingUser.avatar) && (
                        <button type="button" onClick={() => { setAvatarFile(null); setAvatarPreview(null); setEditingUser({ ...editingUser, avatar: null }) }}
                          style={{ marginTop: 8, background: "none", border: "none", color: "#f43f5e", fontSize: 12, fontWeight: 600, cursor: "pointer", padding: 0 }}>
                          Supprimer la photo
                        </button>
                      )}
                    </div>
                  </div>
                </FormCard>

                {/* Personal info */}
                <FormCard title="Informations personnelles" icon={<Mail style={{ width: 16, height: 16 }} />}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div>
                      <FieldLabel required>Prénom</FieldLabel>
                      <Input value={editingUser.name || ""} onChange={v => setEditingUser({ ...editingUser, name: v })} placeholder="Prénom" />
                    </div>
                    <div>
                      <FieldLabel required>Nom</FieldLabel>
                      <Input value={editingUser.surname || ""} onChange={v => setEditingUser({ ...editingUser, surname: v })} placeholder="Nom" />
                    </div>
                    <div>
                      <FieldLabel required>Email</FieldLabel>
                      <Input type="email" value={editingUser.email} onChange={v => setEditingUser({ ...editingUser, email: v })} placeholder="email@exemple.com" />
                    </div>
                    <div>
                      <FieldLabel required>Téléphone</FieldLabel>
                      <Input type="tel" value={editingUser.phone || ""} onChange={v => setEditingUser({ ...editingUser, phone: v })} placeholder="+213 5XX XX XX XX" />
                    </div>
                    <div>
                      <FieldLabel>Rôle</FieldLabel>
                      <SelectField
                        value={editingUser.role}
                        onChange={v => setEditingUser({ ...editingUser, role: v as AdminUser["role"] })}
                        disabled={!canAssignRole(editingUser.role)}
                      >
                        <option value="student">Apprenant</option>
                        <option value="instructor">Formateur</option>
                        {!isAdminAgent && editingUser.role === "admin" && <option value="admin">Administrateur</option>}
                        {!isAdminAgent && <option value="admin_agent">Agent administratif</option>}
                        {isAdminAgent && ADMIN_ROLES.includes(editingUser.role ?? "") && (
                          <option value={editingUser.role}>{editingUser.role === "admin" ? "Administrateur" : "Agent administratif"}</option>
                        )}
                      </SelectField>
                      {!canAssignRole(editingUser.role) && (
                        <p style={{ fontSize: 11, color: "#f43f5e", margin: "5px 0 0" }}>
                          Vous ne pouvez pas modifier ce type de compte.
                        </p>
                      )}
                    </div>
                  </div>
                </FormCard>

                {/* Login info */}
                <FormCard title="Informations de connexion" icon={<Key style={{ width: 16, height: 16 }} />}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                    {/* Username — always shown, auto-generated preview */}
                    <div>
                      <FieldLabel>Nom d'utilisateur</FieldLabel>
                      <input
                        readOnly
                        value={isCreating ? (usernamePreviewLoading ? "Verification..." : usernamePreview) : (editingUser.username || "")}
                        style={{
                          width: "100%", padding: "10px 14px",
                          background: "#f1f5f9", border: "1.5px solid #e2e8f0", borderRadius: 10,
                          fontSize: 13, color: "#475569", outline: "none",
                          boxSizing: "border-box", fontFamily: "monospace", letterSpacing: "0.03em",
                        }}
                      />
                      <p style={{ fontSize: 11, color: "#475569", margin: "5px 0 0" }}>
                        {isCreating ? "Généré automatiquement à partir du prénom et du nom." : "Le nom d'utilisateur est généré automatiquement."}
                      </p>
                    </div>

                    <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 16 }}>
                      <FieldLabel>Mot de passe</FieldLabel>
                    </div>

                    {/* User set their own password */}
                    {editingUser.usePassword && (
                      <div style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "11px 14px", borderRadius: 10,
                        background: "#f0fdf4", border: "1px solid #bbf7d0",
                      }}>
                        <Key style={{ width: 14, height: 14, color: "#16a34a", flexShrink: 0 }} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#16a34a" }}>
                          L'utilisateur a changé son mot de passe
                        </span>
                      </div>
                    )}

                    {/* Existing plain password (read-only, edit mode) */}
                    {!editingUser.usePassword && !isCreating && !!editingUser.plainPassword && (
                      <div>
                        <div style={{ display: "flex", gap: 10 }}>
                          <div style={{ flex: 1 }}>
                            <Input value={editingUser.plainPassword ?? ""} readOnly style={{ fontFamily: "monospace", letterSpacing: "0.05em" }} />
                          </div>
                          <button type="button" onClick={handleCopyPassword}
                            style={{ padding: "10px 14px", borderRadius: 10, border: "1.5px solid #e2e8f0", background: "#fff", fontSize: 12, fontWeight: 600, color: "#475569", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
                            <Copy style={{ width: 13, height: 13 }} />{passwordCopied ? "Copié ✓" : "Copier"}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Auto-generated password (create mode) */}
                    {isCreating && !editingUser.usePassword && !!generatedPassword && (
                      <div>
                        <div style={{ display: "flex", gap: 10 }}>
                          <div style={{ flex: 1 }}>
                            <Input value={generatedPassword} readOnly style={{ fontFamily: "monospace", letterSpacing: "0.05em" }} />
                          </div>
                          <button type="button" onClick={handleCopyPassword}
                            style={{ padding: "10px 14px", borderRadius: 10, border: "1.5px solid #e2e8f0", background: "#fff", fontSize: 12, fontWeight: 600, color: "#475569", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
                            <Copy style={{ width: 13, height: 13 }} />{passwordCopied ? "Copié ✓" : "Copier"}
                          </button>
                        </div>
                        <p style={{ fontSize: 12, color: "#475569", marginTop: 8 }}>Mot de passe temporaire généré automatiquement. Communiquez-le à l'utilisateur — il devra le changer à sa première connexion.</p>
                      </div>
                    )}

                    {/* Reinitialiser (edit mode only) */}
                    {!isCreating && (
                      <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 14 }}>
                        <p style={{ fontSize: 12, color: "#475569", margin: "0 0 10px" }}>
                          Générer un nouveau mot de passe temporaire et l'envoyer à l'utilisateur.
                        </p>
                        <button type="button" onClick={handleResetPassword} disabled={loading}
                          style={{ padding: "9px 16px", borderRadius: 10, border: "1px solid #fde68a", background: "#fef3c7", color: "#92400e", fontSize: 12, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6, opacity: loading ? 0.6 : 1, transition: "opacity 0.15s" }}>
                          <Key style={{ width: 13, height: 13 }} />
                          {loading ? "Réinitialisation…" : "Réinitialiser le mot de passe"}
                        </button>
                      </div>
                    )}
                  </div>
                </FormCard>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toasts */}
      <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 9999, display: "flex", flexDirection: "column", gap: 10 }}>
        {toasts.map(toast => {
          const ok = toast.type === "success"
          const progress = Math.max(0, 100 - ((Date.now() - toast.createdAt) / toast.duration) * 100)
          return (
            <div key={toast.id} style={{ position: "relative", overflow: "hidden", background: ok ? "#f0fdf4" : "#fff1f2", border: `1px solid ${ok ? "#bbf7d0" : "#fecdd3"}`, borderRadius: 14, boxShadow: "0 8px 24px rgba(0,0,0,0.1)", minWidth: 280, maxWidth: 360, animation: "slideIn 0.2s ease" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px" }}>
                {ok
                  ? <CheckCircle style={{ width: 18, height: 18, color: "#22c55e", flexShrink: 0 }} />
                  : <AlertCircle style={{ width: 18, height: 18, color: "#f43f5e", flexShrink: 0 }} />}
                <p style={{ flex: 1, fontSize: 13, fontWeight: 600, color: ok ? "#166534" : "#9f1239", margin: 0 }}>{toast.message}</p>
                <button onClick={() => removeToast(toast.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "#475569", display: "flex" }}>
                  <X style={{ width: 14, height: 14 }} />
                </button>
              </div>
              <div style={{ position: "absolute", bottom: 0, left: 0, height: 3, background: ok ? "#22c55e" : "#f43f5e", width: `${progress}%`, transition: "width 0.1s linear" }} />
            </div>
          )
        })}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(20px) } to { opacity: 1; transform: translateX(0) } }
        ::-webkit-scrollbar { width: 5px; height: 5px }
        ::-webkit-scrollbar-track { background: transparent }
        ::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 99px }
        ::-webkit-scrollbar-thumb:hover { background: #cbd5e1 }
      `}</style>
    </div>
  )
}
