"use client"

import { useState, useEffect } from "react"
import { 
  Search, Plus, Edit, Trash2, Eye, 
  Save, X, User, Camera,
  Mail, Phone, Key, AlertCircle, Copy,
  UserCheck, UserX
} from "lucide-react"

// Types
export type AdminUser = {
  id?: string
  avatar: string | null
  username: string
  name?: string
  surname?: string
  email: string
  phone: string
  role: "admin" | "student" | "instructor"
  verified: boolean
  usePassword?: boolean
  password?: string // Note: In real app, never handle passwords directly like this
  plainPassword?: string | null
}

type UsersCrudProps = {
  initialUsers?: AdminUser[]
  onSave?: (user: AdminUser, avatarFile?: File) => Promise<void>
  onDelete?: (id: string) => Promise<void>
  onView?: (id: string) => void
}

// ---- UI primitives (matching CoursesCrud style) ----
function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 6, letterSpacing: "0.02em" }}>
      {children}{required && <span style={{ color: "#f43f5e", marginLeft: 3 }}>*</span>}
    </label>
  )

}

function Input({ value, onChange, placeholder, type = "text", readOnly, disabled, style }: {
  value: string | number; onChange?: (v: string) => void; placeholder?: string; type?: string; readOnly?: boolean; disabled?: boolean; style?: React.CSSProperties
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
        width: "100%",
        padding: "10px 14px",
        background: readOnly || disabled ? "#f1f5f9" : "#f8fafc",
        border: "1.5px solid #e2e8f0",
        borderRadius: 10,
        fontSize: 14,
        color: readOnly || disabled ? "#64748b" : "#0f172a",
        outline: "none",
        boxSizing: "border-box",
        fontFamily: "inherit",
        ...style
      }}
      onFocus={e => {
        if (readOnly || disabled) return
        e.target.style.borderColor = "var(--accent,#6366f1)"
        e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.12)"
        e.target.style.background = "#fff"
      }}
      onBlur={e => {
        e.target.style.borderColor = "#e2e8f0"
        e.target.style.boxShadow = "none"
        e.target.style.background = readOnly || disabled ? "#f1f5f9" : "#f8fafc"
      }}
    />
  )
}

function SelectField({ value, onChange, children, disabled }: { value: string; onChange: (v: string) => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <div style={{ position: "relative" }}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        style={{ width: "100%", padding: "10px 36px 10px 14px", background: disabled ? "#f1f5f9" : "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 14, color: disabled ? "#94a3b8" : "#0f172a", outline: "none", appearance: "none", cursor: disabled ? "not-allowed" : "pointer", fontFamily: "inherit" }}
        onFocus={e => { if (!disabled) { e.target.style.borderColor = "var(--accent,#6366f1)"; e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.12)" } }}
        onBlur={e => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none" }}
      >
        {children}
      </select>
      <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%) rotate(90deg)", width: 14, height: 14, color: "#94a3b8", pointerEvents: "none" }}>
        &gt;
      </div>
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

function FormCard({ title, icon, children, action }: { title: string; icon?: React.ReactNode; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", borderRadius: 18, border: "1px solid #e8ecf3", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
      <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(180deg,#fafbfd 0%,#fff 100%)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: "linear-gradient(135deg,rgba(99,102,241,0.12),rgba(129,140,248,0.06))", color: "var(--accent,#6366f1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {icon}
          </div>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: 0 }}>{title}</h3>
        </div>
        {action}
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  )
}

export default function UsersCrud({
  initialUsers = [],
  onSave,
  onDelete,
  onView
}: UsersCrudProps) {
  // State
  const [users, setUsers] = useState<AdminUser[]>(initialUsers)
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generatedPassword, setGeneratedPassword] = useState("")
  const [passwordCopied, setPasswordCopied] = useState(false)

  const normalizeUser = (user: AdminUser): AdminUser => {
    const fallback = user as AdminUser & { firstName?: string; lastName?: string }
    return {
      ...user,
      name: user.name ?? fallback.firstName ?? "",
      surname: user.surname ?? fallback.lastName ?? "",
      phone: user.phone ?? "",
      username: user.username ?? "",
      plainPassword: user.plainPassword ?? null,
      usePassword: user.usePassword ?? false,
      verified: typeof user.verified === "boolean" ? user.verified : true
    }
  }

  const getDisplayName = (user: AdminUser) => {
    const fullName = [user.name, user.surname].filter(Boolean).join(" ").trim()
    return fullName || user.username || user.email
  }

  // Update users whenever initialUsers changes
  useEffect(() => {
    setUsers(initialUsers.map(normalizeUser))
  }, [initialUsers])

  // Handle avatar preview
  useEffect(() => {
    if (avatarFile) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(avatarFile)
    } else {
      setAvatarPreview(null)
    }
  }, [avatarFile])

  // Create blank user
  const createBlankUser = (): AdminUser => ({
    avatar: null,
    name: "",
    surname: "",
    username: "",
    email: "",
    phone: "",
    role: "student",
    verified: true,
    usePassword: false,
    plainPassword: null
  })

  // Filter users
  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase()
    return (
      user.username.toLowerCase().includes(searchLower) ||
      (user.name || "").toLowerCase().includes(searchLower) ||
      (user.surname || "").toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower) ||
      user.phone.toLowerCase().includes(searchLower) ||
      user.role.toLowerCase().includes(searchLower)
    )
  })

  // Stats
  const userStats = {
    total: users.length,
    admin: users.filter(u => u.role === "admin").length,
    instructor: users.filter(u => u.role === "instructor").length,
    student: users.filter(u => u.role === "student").length,
    verified: users.filter(u => u.verified).length
  }

  // User handlers
  const handleSelectUser = (user: AdminUser) => {
    setEditingUser(normalizeUser(user))
    setAvatarFile(null)
    setAvatarPreview(user.avatar || null)
    setGeneratedPassword("")
    setPasswordCopied(false)
    setIsCreating(false)
  }

  const handleNewUser = () => {
    setEditingUser(createBlankUser())
    setAvatarFile(null)
    setAvatarPreview(null)
    setGeneratedPassword("")
    setPasswordCopied(false)
    setIsCreating(true)
  }

  const handleCancelEdit = () => {
    setEditingUser(null)
    setAvatarFile(null)
    setAvatarPreview(null)
    setGeneratedPassword("")
    setPasswordCopied(false)
    setIsCreating(false)
    setError(null)
  }

  const generatePassword = (length = 12) => {
    const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ"
    const lower = "abcdefghijkmnopqrstuvwxyz"
    const nums = "23456789"
    const symbols = "!@#$%*?"
    const all = upper + lower + nums + symbols

    const pick = (chars: string) => chars[Math.floor(Math.random() * chars.length)]
    let pwd = pick(upper) + pick(lower) + pick(nums) + pick(symbols)

    for (let i = pwd.length; i < length; i++) {
      pwd += all[Math.floor(Math.random() * all.length)]
    }

    return pwd.split("").sort(() => Math.random() - 0.5).join("")
  }

  const generateUniqueUsername = (
    name: string,
    surname: string,
    email: string,
    currentId?: string
  ) => {
    const base = [name, surname].filter(Boolean).join("_")
    const sanitized = base
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")

    let baseUsername = sanitized
    if (!baseUsername && email.includes("@")) baseUsername = email.split("@")[0].toLowerCase()
    if (!baseUsername) baseUsername = `user${Date.now()}`

    const existing = new Set(
      users
        .filter(u => u.id !== currentId)
        .map(u => (u.username || "").toLowerCase())
        .filter(Boolean)
    )

    if (!existing.has(baseUsername)) return baseUsername

    let counter = 2
    let candidate = `${baseUsername}_${counter}`
    while (existing.has(candidate)) {
      counter += 1
      candidate = `${baseUsername}_${counter}`
    }
    return candidate
  }

  const handleCopyPassword = async () => {
    const currentPassword = isCreating
      ? (editingUser?.usePassword ? (editingUser?.plainPassword ?? "") : generatedPassword)
      : (editingUser?.plainPassword ?? "")
    if (!currentPassword) return
    try {
      await navigator.clipboard.writeText(currentPassword)
      setPasswordCopied(true)
      setTimeout(() => setPasswordCopied(false), 2000)
    } catch {
      setError("Impossible de copier le mot de passe")
    }
  }

  useEffect(() => {
    if (!isCreating || !editingUser) return
    if (!editingUser.usePassword && editingUser.email.trim() && !generatedPassword) {
      setGeneratedPassword(generatePassword())
      setPasswordCopied(false)
    }
  }, [editingUser?.email, editingUser?.usePassword, isCreating, generatedPassword])

  const handleSaveUser = async () => {
    if (!editingUser) return
    
    // Validation
    if (!editingUser.name?.trim() || !editingUser.surname?.trim()) {
      setError("Le prÃ©nom et le nom sont obligatoires")
      return
    }

    if (!editingUser.email.trim()) {
      setError("L'email est obligatoire")
      return
    }

    if (!editingUser.phone.trim()) {
      setError("Le tÃ©lÃ©phone est obligatoire")
      return
    }

    if (editingUser.usePassword && !(editingUser.plainPassword || "").trim()) {
      setError("Le mot de passe en clair est obligatoire")
      return
    }

    if (isCreating && !editingUser.usePassword && !generatedPassword) {
      setError("Le mot de passe est obligatoire pour un nouvel utilisateur")
      return
    }

    if (editingUser.role === "instructor") {
      setError("Pour créer ou modifier un instructeur, veuillez utiliser la page Instructeurs")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const username = generateUniqueUsername(
        editingUser.name || "",
        editingUser.surname || "",
        editingUser.email || "",
        editingUser.id
      )

      const finalPassword = editingUser.usePassword
        ? (editingUser.plainPassword || "")
        : (generatedPassword || "")

      const userToSave = {
        ...editingUser,
        username,
        ...(isCreating
          ? {
              password: finalPassword,
              plainPassword: finalPassword
            }
          : editingUser.usePassword && finalPassword
          ? {
              password: finalPassword,
              plainPassword: finalPassword
            }
          : {})
      }

      if (onSave) {
        await onSave(userToSave, avatarFile || undefined)
      }
      
      // Update local state
      if (editingUser.id) {
        // Update existing
        const updatedUser = avatarPreview 
          ? { ...editingUser, avatar: avatarPreview, username }
          : { ...editingUser, username }
        
        setUsers(prev => prev.map(u => 
          u.id === editingUser.id ? updatedUser : u
        ))
        setEditingUser(updatedUser)
      } else {
        // Add new with generated ID
        const newUser = {
          ...editingUser,
          username,
          id: `user_${Date.now()}`,
          avatar: avatarPreview
        }
        setUsers(prev => [...prev, newUser])
        setEditingUser(newUser)
        setIsCreating(false)
      }
      
      setError("Utilisateur enregistré avec succès!")
      setTimeout(() => setError(null), 3000)
      
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'enregistrement")
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async () => {
    if (!editingUser?.id) return
    const plain = (editingUser.plainPassword || "").trim()
    if (!plain) {
      setError("Aucun mot de passe en clair disponible pour la rÃ©initialisation")
      return
    }

    if (!confirm("RÃ©initialiser le mot de passe de cet utilisateur ?")) return

    setLoading(true)
    setError(null)

    try {
      const username = generateUniqueUsername(
        editingUser.name || "",
        editingUser.surname || "",
        editingUser.email || "",
        editingUser.id
      )

      const userToSave = {
        ...editingUser,
        username,
        usePassword: false,
        password: plain,
        plainPassword: plain
      }

      if (onSave) {
        await onSave(userToSave, avatarFile || undefined)
      }

      const updatedUser = {
        ...editingUser,
        username,
        usePassword: false
      }

      setUsers(prev => prev.map(u => 
        u.id === editingUser.id ? updatedUser : u
      ))
      setEditingUser(updatedUser)

      setError("Mot de passe rÃ©initialisÃ© avec succÃ¨s!")
      setTimeout(() => setError(null), 3000)
    } catch (err: any) {
      setError(err.message || "Erreur lors de la rÃ©initialisation du mot de passe")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteUser = async (id: string) => {
    const user = users.find(u => u.id === id)
    if (!user) return
    
    if (user.role === "instructor") {
      setError("Pour supprimer un instructeur, veuillez utiliser la page Instructeurs")
      return
    }

    if (!confirm(`Supprimer l'utilisateur ${getDisplayName(user)} ? Cette action est irréversible.`)) return
    
    try {
      if (onDelete) {
        await onDelete(id)
      }
      
      setUsers(prev => prev.filter(u => u.id !== id))
      if (editingUser?.id === id) {
        handleCancelEdit()
      }
    } catch (err: any) {
      setError(err.message || "Erreur lors de la suppression")
    }
  }

  // Toggle verification
  const handleToggleVerification = (userId: string) => {
    setUsers(prev => prev.map(user => 
      user.id === userId ? { ...user, verified: !user.verified } : user
    ))
    
    if (editingUser?.id === userId) {
      setEditingUser(prev => prev ? { ...prev, verified: !prev.verified } : null)
    }
  }

  return (
    <div style={{ height: "100vh", display: "flex", background: "#f0f2f8", fontFamily: "'DM Sans','Inter',sans-serif", overflow: "hidden" }}>

      {/* Left panel */}
      <div style={{ width: 420, minWidth: 420, background: "#fff", borderRight: "1px solid #e8ecf3", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "24px 22px 16px", borderBottom: "1px solid #f1f5f9" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#94a3b8", marginBottom: 2 }}>Gestion</p>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", margin: 0 }}>Utilisateurs</h1>
            </div>
            <div style={{ background: "linear-gradient(135deg,var(--accent,#6366f1),#818cf8)", color: "#fff", borderRadius: 12, padding: "6px 16px", fontSize: 22, fontWeight: 800 }}>{userStats.total}</div>
          </div>
          <div style={{ position: "relative" }}>
            <Search style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 15, height: 15, color: "#94a3b8" }} />
            <input
              type="text"
              placeholder="Rechercher un utilisateur..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ width: "100%", padding: "9px 12px 9px 36px", background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 13, outline: "none", boxSizing: "border-box", color: "#0f172a", fontFamily: "inherit" }}
              onFocus={e => { e.currentTarget.style.borderColor = "var(--accent,#6366f1)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.1)" }}
              onBlur={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.boxShadow = "none" }}
            />
          </div>

          <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
            {[
              { label: "Admins", value: "admin" },
              { label: "Instructeurs", value: "instructor" },
              { label: "Etudiants", value: "student" },
              { label: "Tous", value: "" }
            ].map(btn => (
              <button
                key={btn.label}
                onClick={() => setSearchTerm(btn.value)}
                style={{ padding: "5px 10px", borderRadius: 999, border: "1px solid #e2e8f0", background: btn.value ? "#f8fafc" : "#fff", color: "#475569", fontSize: 11, cursor: "pointer" }}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9" }}>
          <button
            onClick={handleNewUser}
            style={{ width: "100%", padding: "10px 16px", background: "linear-gradient(135deg,var(--accent,#6366f1),#818cf8)", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 4px 14px rgba(99,102,241,0.3)", transition: "opacity 0.15s,transform 0.15s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.9"; (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)" }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; (e.currentTarget as HTMLButtonElement).style.transform = "none" }}
          >
            <Plus style={{ width: 15, height: 15 }} /> Nouvel utilisateur
          </button>
        </div>

        <div style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div style={{ background: "#f8fafc", border: "1px solid #e8ecf3", borderRadius: 12, padding: "10px 12px" }}>
            <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>Admins</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginTop: 4 }}>{userStats.admin}</div>
          </div>
          <div style={{ background: "#f8fafc", border: "1px solid #e8ecf3", borderRadius: 12, padding: "10px 12px" }}>
            <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>Verifies</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginTop: 4 }}>{userStats.verified}</div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "8px 8px" }}>
          {filteredUsers.length === 0 ? (
            <div style={{ padding: "48px 24px", textAlign: "center" }}>
              <User style={{ width: 40, height: 40, color: "#cbd5e1", margin: "0 auto 12px" }} />
              <p style={{ fontSize: 13, color: "#94a3b8" }}>Aucun utilisateur trouve</p>
            </div>
          ) : filteredUsers.map(user => {
            const displayName = getDisplayName(user)
            const isActive = editingUser?.id === user.id
            return (
              <div
                key={user.id}
                onClick={() => handleSelectUser(user)}
                style={{ padding: "13px 14px", borderRadius: 12, cursor: "pointer", marginBottom: 4, background: isActive ? "linear-gradient(135deg,rgba(99,102,241,0.08),rgba(129,140,248,0.05))" : "transparent", border: isActive ? "1.5px solid rgba(99,102,241,0.2)" : "1.5px solid transparent", transition: "all 0.15s", position: "relative" }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = "#f8fafc" }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = "transparent" }}
              >
                {isActive && <div style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", width: 3, height: 28, background: "var(--accent,#6366f1)", borderRadius: "0 3px 3px 0" }} />}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ display: "flex", gap: 10, flex: 1, minWidth: 0 }}>
                    {user.avatar ? (
                      <img src={user.avatar} alt={displayName} style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover", border: "2px solid #fff", boxShadow: "0 2px 6px rgba(15,23,42,0.1)" }} />
                    ) : (
                      <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", fontWeight: 700 }}>{displayName[0]?.toUpperCase()}</div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: isActive ? "var(--accent,#6366f1)" : "#0f172a", margin: "0 0 3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {displayName}
                      </p>
                      <p style={{ fontSize: 12, color: "#94a3b8", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</p>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                        <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 999, background: "rgba(99,102,241,0.1)", color: "var(--accent,#6366f1)" }}>{user.role}</span>
                        <span style={{ fontSize: 11, color: user.verified ? "#16a34a" : "#f59e0b" }}>{user.verified ? "Verifie" : "Non verifie"}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                    <IconBtn onClick={e => { e.stopPropagation(); handleToggleVerification(user.id!) }} color={user.verified ? "#f59e0b" : "#16a34a"} hoverBg="rgba(99,102,241,0.08)" title={user.verified ? "Marquer non verifie" : "Marquer verifie"}>
                      {user.verified ? <UserX style={{ width: 13, height: 13 }} /> : <UserCheck style={{ width: 13, height: 13 }} />}
                    </IconBtn>
                    {onView && (
                      <IconBtn onClick={e => { e.stopPropagation(); user.id && onView(user.id) }} color="#64748b"><Eye style={{ width: 13, height: 13 }} /></IconBtn>
                    )}
                    <IconBtn onClick={e => { e.stopPropagation(); handleSelectUser(user) }} color="var(--accent,#6366f1)" hoverBg="rgba(99,102,241,0.08)"><Edit style={{ width: 13, height: 13 }} /></IconBtn>
                    <IconBtn onClick={e => { e.stopPropagation(); user.id && handleDeleteUser(user.id) }} color="#f43f5e" hoverBg="rgba(244,63,94,0.08)"><Trash2 style={{ width: 13, height: 13 }} /></IconBtn>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Right panel */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {editingUser ? (
          <>
            <div style={{ background: "#fff", borderBottom: "1px solid #e8ecf3", padding: "14px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#94a3b8", margin: 0 }}>{isCreating ? "Nouvel utilisateur" : "Modifier l'utilisateur"}</p>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: "2px 0 0" }}>{getDisplayName(editingUser)}</h2>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={handleCancelEdit}
                  style={{ padding: "8px 16px", borderRadius: 10, border: "1.5px solid #e2e8f0", background: "#fff", fontSize: 13, fontWeight: 600, color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "all 0.15s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#f43f5e"; (e.currentTarget as HTMLButtonElement).style.color = "#f43f5e" }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#e2e8f0"; (e.currentTarget as HTMLButtonElement).style.color = "#64748b" }}
                >
                  <X style={{ width: 14, height: 14 }} /> Annuler
                </button>
                <button onClick={handleSaveUser} disabled={loading || editingUser.role === "instructor"}
                  style={{ padding: "8px 20px", borderRadius: 10, border: "none", background: loading || editingUser.role === "instructor" ? "#e2e8f0" : "linear-gradient(135deg,var(--accent,#6366f1),#818cf8)", color: loading || editingUser.role === "instructor" ? "#94a3b8" : "#fff", fontSize: 13, fontWeight: 600, cursor: loading || editingUser.role === "instructor" ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6, boxShadow: loading || editingUser.role === "instructor" ? "none" : "0 4px 14px rgba(99,102,241,0.3)" }}
                >
                  <Save style={{ width: 14, height: 14 }} />
                  {loading ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "28px" }}>
              <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", flexDirection: "column", gap: 28 }}>

                {error && (
                  <div style={{ padding: "12px 14px", borderRadius: 12, background: error.toLowerCase().includes("succ") ? "#f0fdf4" : "#fff1f2", border: `1px solid ${error.toLowerCase().includes("succ") ? "#bbf7d0" : "#fecdd3"}`, color: error.toLowerCase().includes("succ") ? "#166534" : "#9f1239", fontSize: 13, fontWeight: 600 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <AlertCircle style={{ width: 16, height: 16 }} />
                      <span>{error}</span>
                    </div>
                    {error.toLowerCase().includes("instructeur") && (
                      <p style={{ margin: "6px 0 0", fontSize: 12, color: "#9f1239" }}>
                        Les instructeurs doivent etre geres depuis la page dediee "Instructeurs".
                      </p>
                    )}
                  </div>
                )}

                <FormCard title="Photo de profil" icon={<User style={{ width: 16, height: 16 }} />}>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ position: "relative" }}>
                      {avatarPreview || editingUser.avatar ? (
                        <img
                          src={avatarPreview || editingUser.avatar!}
                          alt="Avatar"
                          style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover", border: "4px solid #fff", boxShadow: "0 6px 16px rgba(15,23,42,0.12)" }}
                        />
                      ) : (
                        <div style={{ width: 80, height: 80, borderRadius: "50%", background: "rgba(99,102,241,0.12)", display: "flex", alignItems: "center", justifyContent: "center", border: "4px solid #fff", boxShadow: "0 6px 16px rgba(15,23,42,0.12)" }}>
                          <User style={{ width: 28, height: 28, color: "var(--accent,#6366f1)" }} />
                        </div>
                      )}
                      <label style={{ position: "absolute", right: -4, bottom: -4, width: 36, height: 36, background: "linear-gradient(135deg,var(--accent,#6366f1),#818cf8)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: editingUser.role === "instructor" ? "not-allowed" : "pointer", boxShadow: "0 4px 12px rgba(99,102,241,0.3)" }}>
                        <Camera style={{ width: 16, height: 16, color: "#fff" }} />
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: "none" }}
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) setAvatarFile(file)
                          }}
                          disabled={editingUser.role === "instructor"}
                        />
                      </label>
                    </div>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                      <div>
                        <FieldLabel>Telecharger une photo</FieldLabel>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) setAvatarFile(file)
                          }}
                          disabled={editingUser.role === "instructor"}
                          style={{ width: "100%", fontSize: 12 }}
                        />
                      </div>
                      <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>Formats: JPG, PNG, WebP. Taille max: 2MB. Recommande: 400x400px</p>
                      {(avatarPreview || editingUser.avatar) && editingUser.role !== "instructor" && (
                        <button
                          type="button"
                          onClick={() => {
                            setAvatarFile(null)
                            setAvatarPreview(null)
                            setEditingUser({ ...editingUser, avatar: null })
                          }}
                          style={{ background: "none", border: "none", color: "#f43f5e", fontSize: 12, fontWeight: 600, cursor: "pointer", padding: 0, textAlign: "left" }}
                        >
                          Supprimer la photo
                        </button>
                      )}
                    </div>
                  </div>
                </FormCard>

                {editingUser.role === "instructor" && (
                  <div style={{ background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 12, padding: 12 }}>
                    <div style={{ display: "flex", gap: 10 }}>
                      <AlertCircle style={{ width: 16, height: 16, color: "#b45309" }} />
                      <div>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#92400e" }}>Gestion des instructeurs</p>
                        <p style={{ margin: "4px 0 0", fontSize: 12, color: "#92400e" }}>Les instructeurs doivent etre geres depuis la page dediee.</p>
                      </div>
                    </div>
                  </div>
                )}

                <FormCard title="Informations personnelles" icon={<Mail style={{ width: 16, height: 16 }} />}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div>
                      <FieldLabel>Nom d'utilisateur</FieldLabel>
                      <Input value={editingUser.username || ""} readOnly />
                    </div>
                    <div>
                      <FieldLabel required>Prenom</FieldLabel>
                      <Input value={editingUser.name || ""} onChange={v => setEditingUser({ ...editingUser, name: v })} placeholder="John" disabled={editingUser.role === "instructor"} />
                    </div>
                    <div>
                      <FieldLabel required>Nom</FieldLabel>
                      <Input value={editingUser.surname || ""} onChange={v => setEditingUser({ ...editingUser, surname: v })} placeholder="Doe" disabled={editingUser.role === "instructor"} />
                    </div>
                    <div>
                      <FieldLabel required>Email</FieldLabel>
                      <Input type="email" value={editingUser.email} onChange={v => setEditingUser({ ...editingUser, email: v })} placeholder="john@example.com" disabled={editingUser.role === "instructor"} />
                    </div>
                    <div>
                      <FieldLabel required>Telephone</FieldLabel>
                      <Input type="tel" value={editingUser.phone || ""} onChange={v => setEditingUser({ ...editingUser, phone: v })} placeholder="+33 1 23 45 67 89" disabled={editingUser.role === "instructor"} />
                    </div>
                    <div>
                      <FieldLabel>Role</FieldLabel>
                      <SelectField value={editingUser.role} onChange={v => setEditingUser({ ...editingUser, role: v as "admin" | "student" | "instructor" })} disabled={editingUser.role === "instructor"}>
                        <option value="student">Etudiant</option>
                        <option value="admin">Administrateur</option>
                        <option value="instructor">Instructeur</option>
                      </SelectField>
                      {editingUser.role === "instructor" && (
                        <p style={{ fontSize: 11, color: "#b45309", marginTop: 4 }}>Utilisez la page Instructeurs pour modifier ce role</p>
                      )}
                    </div>
                  </div>
                </FormCard>

                <FormCard title="Mot de passe" icon={<Key style={{ width: 16, height: 16 }} />}>
                  {editingUser.usePassword && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12 }}>
                      <div>
                        <FieldLabel required>Mot de passe en clair</FieldLabel>
                        <Input value={editingUser.plainPassword ?? ""} onChange={v => setEditingUser({ ...editingUser, plainPassword: v })} placeholder="Mot de passe" />
                      </div>
                      <div style={{ display: "flex", alignItems: "flex-end" }}>
                        <button
                          type="button"
                          onClick={handleCopyPassword}
                          disabled={!editingUser.plainPassword}
                          style={{ padding: "9px 14px", borderRadius: 10, border: "1.5px solid #e2e8f0", background: "#fff", fontSize: 12, fontWeight: 600, color: editingUser.plainPassword ? "#475569" : "#94a3b8", cursor: editingUser.plainPassword ? "pointer" : "not-allowed" }}
                        >
                          <Copy style={{ width: 14, height: 14 }} /> {passwordCopied ? "Copie" : "Copier"}
                        </button>
                      </div>
                    </div>
                  )}

                  {!editingUser.usePassword && !isCreating && !!editingUser.plainPassword && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12 }}>
                      <div>
                        <FieldLabel>Mot de passe en clair</FieldLabel>
                        <Input value={editingUser.plainPassword ?? ""} readOnly />
                      </div>
                      <div style={{ display: "flex", alignItems: "flex-end" }}>
                        <button
                          type="button"
                          onClick={handleCopyPassword}
                          disabled={!editingUser.plainPassword}
                          style={{ padding: "9px 14px", borderRadius: 10, border: "1.5px solid #e2e8f0", background: "#fff", fontSize: 12, fontWeight: 600, color: editingUser.plainPassword ? "#475569" : "#94a3b8", cursor: editingUser.plainPassword ? "pointer" : "not-allowed" }}
                        >
                          <Copy style={{ width: 14, height: 14 }} /> {passwordCopied ? "Copie" : "Copier"}
                        </button>
                      </div>
                    </div>
                  )}

                  {!isCreating && (
                    <div style={{ marginTop: 12 }}>
                      <button
                        type="button"
                        onClick={handleResetPassword}
                        disabled={loading || !editingUser.plainPassword}
                        style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid #fde68a", background: "#fef3c7", color: "#92400e", fontSize: 12, fontWeight: 600, cursor: loading || !editingUser.plainPassword ? "not-allowed" : "pointer" }}
                      >
                        Reinitialiser le mot de passe
                      </button>
                    </div>
                  )}
                </FormCard>
              </div>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
            <div style={{ width: 80, height: 80, borderRadius: 24, background: "linear-gradient(135deg,rgba(99,102,241,0.12),rgba(129,140,248,0.06))", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <User style={{ width: 36, height: 36, color: "var(--accent,#6366f1)" }} />
            </div>
            <div style={{ textAlign: "center" }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", margin: "0 0 6px" }}>Aucun utilisateur selectionne</h3>
              <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>Choisissez un utilisateur dans la liste ou creez-en un nouveau.</p>
            </div>
            <button onClick={handleNewUser} style={{ marginTop: 8, padding: "10px 24px", background: "linear-gradient(135deg,var(--accent,#6366f1),#818cf8)", color: "#fff", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 14px rgba(99,102,241,0.3)" }}>
              <Plus style={{ width: 16, height: 16 }} /> Creer un utilisateur
            </button>
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
