"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { 
  Search, Plus, Edit, Trash2, Eye, 
  ChevronUp, ChevronDown, Save, X, Users,
  BookOpen, Star, ChevronRight, Layers, ImagePlus,
  CheckCircle, AlertCircle, Loader2
} from "lucide-react"

// 🔔 TOAST SYSTEM - Types
type ToastType = "success" | "error" | "loading"
type Toast = {
  id: string
  type: ToastType
  message: string
  duration: number
  createdAt: number
}

// Types
type AdminCourse = {
  id?: string
  title: string
  shortDescription: string
  levelLabel: string
  durationLabel: string
}

type AdminBootcamp = {
  id?: string
  title: string
  shortDescription: string
  longDescription: string
  durationLabel: string
  prerequis: "Aucun" | "Contacter l'administration"
  rating: number
  reviewsCount: number
  isPublished: boolean
  courseIds: string[]
  coverImage?: File | string | null
  coverPreview?: string | null
}

type BootcampsCrudProps = {
  initialBootcamps?: AdminBootcamp[]
  initialCourses?: AdminCourse[]
  onSave?: (bootcamp: AdminBootcamp) => Promise<void>
  onDelete?: (id: string) => Promise<void>
  onView?: (id: string) => void
}

const PREREQUIS_OPTIONS = [
  "Aucun",
  "Contacter l'administration"
] as const

// ---- UI primitives (matching CoursesCrud style) ----
function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 6, letterSpacing: "0.02em" }}>
      {children}{required && <span style={{ color: "#f43f5e", marginLeft: 3 }}>*</span>}
    </label>
  )

}

function Input({ value, onChange, placeholder, type = "text", style }: {
  value: string | number; onChange: (v: string) => void; placeholder?: string; type?: string; style?: React.CSSProperties
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ width: "100%", padding: "10px 14px", background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 14, color: "#0f172a", outline: "none", boxSizing: "border-box", fontFamily: "inherit", ...style }}
      onFocus={e => { e.target.style.borderColor = "var(--accent,#6366f1)"; e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.12)"; e.target.style.background = "#fff" }}
      onBlur={e => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none"; e.target.style.background = "#f8fafc" }}
    />
  )
}

function Textarea({ value, onChange, placeholder, rows = 3 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <textarea
      rows={rows}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ width: "100%", padding: "10px 14px", background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 14, color: "#0f172a", outline: "none", resize: "none", fontFamily: "inherit", boxSizing: "border-box" }}
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
        style={{ width: "100%", padding: "10px 36px 10px 14px", background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 14, color: "#0f172a", outline: "none", appearance: "none", cursor: "pointer", fontFamily: "inherit" }}
        onFocus={e => { e.target.style.borderColor = "var(--accent,#6366f1)"; e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.12)" }}
        onBlur={e => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none" }}
      >
        {children}
      </select>
      <ChevronRight style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%) rotate(90deg)", width: 14, height: 14, color: "#94a3b8", pointerEvents: "none" }} />
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

export default function BootcampsCrud({
  initialBootcamps = [],
  initialCourses = [],
  onSave,
  onDelete,
  onView
}: BootcampsCrudProps) {
  // 🔔 TOAST SYSTEM - State
  const [toasts, setToasts] = useState<Toast[]>([])

  // State
  const [bootcamps, setBootcamps] = useState<AdminBootcamp[]>(initialBootcamps)
  const [courses, setCourses] = useState<AdminCourse[]>(initialCourses)
  const [editingBootcamp, setEditingBootcamp] = useState<AdminBootcamp | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(false)
  
  // Course selection state
  const [courseSearch, setCourseSearch] = useState("")
  const [selectedCourseId, setSelectedCourseId] = useState<string>("")
  const [showCourseDropdown, setShowCourseDropdown] = useState(false)

  const courseDropdownRef = useRef<HTMLDivElement | null>(null)

  // 🔔 TOAST SYSTEM - Helper functions
  const showToast = (type: ToastType, message: string, duration = 5000) => {
    const id = `toast_${Date.now()}_${Math.random()}`
    const newToast: Toast = {
      id,
      type,
      message,
      duration,
      createdAt: Date.now()
    }
    
    setToasts(prev => [...prev, newToast])
    
    if (type !== "loading") {
      setTimeout(() => {
        setToasts(prev => prev.filter(toast => toast.id !== id))
      }, duration)
    }
    
    return id
  }

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  // 🔔 TOAST SYSTEM - Cleanup effect
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      setToasts(prev => prev.filter(toast => {
        if (toast.type === "loading") return true
        return now - toast.createdAt < toast.duration
      }))
    }, 100)
    
    return () => clearInterval(interval)
  }, [])

  // Load data on mount
  useEffect(() => {
    if (initialBootcamps.length) {
      setBootcamps(initialBootcamps)
    }
    if (initialCourses.length) {
      setCourses(initialCourses)
    }
  }, [initialBootcamps, initialCourses])

  // Cleanup blob URLs
  useEffect(() => {
    return () => {
      if (editingBootcamp?.coverPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(editingBootcamp.coverPreview)
      }
    }
  }, [editingBootcamp?.coverPreview])

  // Create blank bootcamp
  const createBlankBootcamp = (): AdminBootcamp => ({
    title: "",
    shortDescription: "",
    longDescription: "",
    durationLabel: "",
    prerequis: "Aucun",
    rating: 4.8,
    reviewsCount: 0,
    isPublished: true,
    courseIds: [],
    coverImage: null,
    coverPreview: null,
  })

  // Filter bootcamps
  const filteredBootcamps = bootcamps.filter(bootcamp => {
    const matchesSearch = bootcamp.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bootcamp.shortDescription.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  // Filter available courses for dropdown
  const availableCourses = useMemo(() => {
    return courses.filter(course => 
      !editingBootcamp?.courseIds.includes(course.id!) &&
      course.title.toLowerCase().includes(courseSearch.toLowerCase())
    )
  }, [courses, editingBootcamp?.courseIds, courseSearch])

  // Bootcamp handlers
  const handleSelectBootcamp = (bootcamp: AdminBootcamp) => {
    setEditingBootcamp({
      ...JSON.parse(JSON.stringify(bootcamp)),
      coverPreview: bootcamp.coverImage && typeof bootcamp.coverImage === 'string'
        ? `${process.env.NEXT_PUBLIC_PB_URL}/api/files/bootcamps/${bootcamp.id}/${bootcamp.coverImage}`
        : null,
      coverImage: null,
    })
    setIsCreating(false)
  }

  const handleNewBootcamp = () => {
    setEditingBootcamp(createBlankBootcamp())
    setIsCreating(true)
  }

  const handleCancelEdit = () => {
    setEditingBootcamp(null)
    setIsCreating(false)
  }

  // Close course dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        courseDropdownRef.current &&
        !courseDropdownRef.current.contains(event.target as Node)
      ) {
        setShowCourseDropdown(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  const handleSaveBootcamp = async () => {
    if (!editingBootcamp) return
    
    if (!editingBootcamp.title.trim()) {
      showToast("error", "Le titre est obligatoire")
      return
    }

    setLoading(true)
    const loadingToastId = showToast("loading", "Enregistrement du bootcamp en cours...")

    try {
      if (onSave) {
        await onSave(editingBootcamp)
      }
      
      // Update local state
      if (editingBootcamp.id) {
        // Update existing
        setBootcamps(prev => prev.map(b => 
          b.id === editingBootcamp.id ? {
            ...editingBootcamp,
            coverImage: editingBootcamp.coverPreview?.startsWith("http")
              ? editingBootcamp.coverPreview
              : editingBootcamp.coverImage,
          } : b
        ))
      } else {
        // Add new with generated ID
        const newBootcamp = {
          ...editingBootcamp,
          id: `bootcamp_${Date.now()}`
        }
        setBootcamps(prev => [...prev, newBootcamp])
        setEditingBootcamp(newBootcamp)
        setIsCreating(false)
      }
      
      removeToast(loadingToastId)
      showToast("success", "Bootcamp enregistré avec succès!")
      
    } catch (err: any) {
      removeToast(loadingToastId)
      showToast("error", err.message || "Erreur lors de l'enregistrement")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteBootcamp = async (id: string) => {
    if (!confirm("Supprimer ce bootcamp ? Cette action est irréversible.")) return
    
    try {
      if (onDelete) {
        await onDelete(id)
      }
      
      setBootcamps(prev => prev.filter(b => b.id !== id))
      if (editingBootcamp?.id === id) {
        setEditingBootcamp(null)
      }
      showToast("success", "Bootcamp supprimé avec succès!")
    } catch (err: any) {
      showToast("error", err.message || "Erreur lors de la suppression")
    }
  }

  // Course assignment handlers
  const handleAddCourse = () => {
    if (!editingBootcamp || !selectedCourseId) return
    
    if (!editingBootcamp.courseIds.includes(selectedCourseId)) {
      const courseIds = [...editingBootcamp.courseIds, selectedCourseId]
      setEditingBootcamp({ ...editingBootcamp, courseIds })
      setSelectedCourseId("")
      setCourseSearch("")
      setShowCourseDropdown(false)
    }
  }

  const handleMoveCourse = (courseId: string, direction: "up" | "down") => {
    if (!editingBootcamp) return
    
    const courseIds = [...editingBootcamp.courseIds]
    const currentIndex = courseIds.indexOf(courseId)
    
    if (currentIndex === -1) return
    
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1
    
    if (targetIndex >= 0 && targetIndex < courseIds.length) {
      [courseIds[currentIndex], courseIds[targetIndex]] = [courseIds[targetIndex], courseIds[currentIndex]]
      setEditingBootcamp({ ...editingBootcamp, courseIds })
    }
  }

  const handleRemoveCourse = (courseId: string) => {
    if (!editingBootcamp) return
    
    const courseIds = editingBootcamp.courseIds.filter(id => id !== courseId)
    setEditingBootcamp({ ...editingBootcamp, courseIds })
  }

  // Get assigned courses
  const getAssignedCourses = () => {
    if (!editingBootcamp) return []
    return editingBootcamp.courseIds
      .map(id => courses.find(c => c.id === id))
      .filter(Boolean) as AdminCourse[]
  }

  // Handle image upload
  const handleImageChange = (file: File) => {
    if (!editingBootcamp) return
    
    // Revoke previous blob URL
    if (editingBootcamp.coverPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(editingBootcamp.coverPreview)
    }
    
    setEditingBootcamp({
      ...editingBootcamp,
      coverImage: file,
      coverPreview: URL.createObjectURL(file),
    })
  }

  // Handle key press for course search
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && selectedCourseId) {
      handleAddCourse()
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
              <h1 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", margin: 0 }}>Bootcamps</h1>
            </div>
            <div style={{ background: "linear-gradient(135deg,var(--accent,#6366f1),#818cf8)", color: "#fff", borderRadius: 12, padding: "6px 16px", fontSize: 22, fontWeight: 800 }}>{bootcamps.length}</div>
          </div>
          <div style={{ position: "relative" }}>
            <Search style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 15, height: 15, color: "#94a3b8" }} />
            <input
              type="text"
              placeholder="Rechercher un bootcamp..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ width: "100%", padding: "9px 12px 9px 36px", background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 13, outline: "none", boxSizing: "border-box", color: "#0f172a", fontFamily: "inherit" }}
              onFocus={e => { e.currentTarget.style.borderColor = "var(--accent,#6366f1)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.1)" }}
              onBlur={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.boxShadow = "none" }}
            />
          </div>
        </div>

        <div style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9" }}>
          <button
            onClick={handleNewBootcamp}
            style={{ width: "100%", padding: "10px 16px", background: "linear-gradient(135deg,var(--accent,#6366f1),#818cf8)", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 4px 14px rgba(99,102,241,0.3)", transition: "opacity 0.15s,transform 0.15s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.9"; (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)" }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; (e.currentTarget as HTMLButtonElement).style.transform = "none" }}
          >
            <Plus style={{ width: 15, height: 15 }} /> Nouveau bootcamp
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "8px 8px" }}>
          {filteredBootcamps.length === 0 ? (
            <div style={{ padding: "48px 24px", textAlign: "center" }}>
              <Users style={{ width: 40, height: 40, color: "#cbd5e1", margin: "0 auto 12px" }} />
              <p style={{ fontSize: 13, color: "#94a3b8" }}>Aucun bootcamp trouve</p>
            </div>
          ) : filteredBootcamps.map(bootcamp => {
            const isActive = editingBootcamp?.id === bootcamp.id
            return (
              <div
                key={bootcamp.id}
                onClick={() => handleSelectBootcamp(bootcamp)}
                style={{ padding: "13px 14px", borderRadius: 12, cursor: "pointer", marginBottom: 4, background: isActive ? "linear-gradient(135deg,rgba(99,102,241,0.08),rgba(129,140,248,0.05))" : "transparent", border: isActive ? "1.5px solid rgba(99,102,241,0.2)" : "1.5px solid transparent", transition: "all 0.15s", position: "relative" }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = "#f8fafc" }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = "transparent" }}
              >
                {isActive && <div style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", width: 3, height: 28, background: "var(--accent,#6366f1)", borderRadius: "0 3px 3px 0" }} />}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: isActive ? "var(--accent,#6366f1)" : "#0f172a", margin: "0 0 3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {bootcamp.title || "Sans titre"}
                    </p>
                    <p style={{ fontSize: 12, color: "#94a3b8", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{bootcamp.shortDescription}</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 7 }}>
                      <span style={{ fontSize: 11, color: "#64748b" }}>{bootcamp.durationLabel || "Dur?e"}</span>
                      <span style={{ fontSize: 11, color: "#64748b" }}>{bootcamp.courseIds.length} formations</span>
                      <span style={{ fontSize: 11, color: "#64748b", display: "flex", alignItems: "center", gap: 4 }}>
                        <Star style={{ width: 11, height: 11, color: "#f59e0b" }} />{bootcamp.rating.toFixed(1)}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                    {onView && (
                      <IconBtn onClick={e => { e.stopPropagation(); bootcamp.id && onView(bootcamp.id) }} color="#64748b"><Eye style={{ width: 13, height: 13 }} /></IconBtn>
                    )}
                    <IconBtn onClick={e => { e.stopPropagation(); handleSelectBootcamp(bootcamp) }} color="var(--accent,#6366f1)" hoverBg="rgba(99,102,241,0.08)"><Edit style={{ width: 13, height: 13 }} /></IconBtn>
                    <IconBtn onClick={e => { e.stopPropagation(); bootcamp.id && handleDeleteBootcamp(bootcamp.id) }} color="#f43f5e" hoverBg="rgba(244,63,94,0.08)"><Trash2 style={{ width: 13, height: 13 }} /></IconBtn>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Right panel */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {editingBootcamp ? (
          <>
            <div style={{ background: "#fff", borderBottom: "1px solid #e8ecf3", padding: "14px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#94a3b8", margin: 0 }}>{isCreating ? "Nouveau bootcamp" : "Modifier le bootcamp"}</p>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: "2px 0 0" }}>{editingBootcamp.title || "Sans titre"}</h2>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={handleCancelEdit}
                  style={{ padding: "8px 16px", borderRadius: 10, border: "1.5px solid #e2e8f0", background: "#fff", fontSize: 13, fontWeight: 600, color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "all 0.15s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#f43f5e"; (e.currentTarget as HTMLButtonElement).style.color = "#f43f5e" }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#e2e8f0"; (e.currentTarget as HTMLButtonElement).style.color = "#64748b" }}
                >
                  <X style={{ width: 14, height: 14 }} /> Annuler
                </button>
                <button onClick={handleSaveBootcamp} disabled={loading}
                  style={{ padding: "8px 20px", borderRadius: 10, border: "none", background: loading ? "#e2e8f0" : "linear-gradient(135deg,var(--accent,#6366f1),#818cf8)", color: loading ? "#94a3b8" : "#fff", fontSize: 13, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6, boxShadow: loading ? "none" : "0 4px 14px rgba(99,102,241,0.3)" }}
                >
                  {loading ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : <Save style={{ width: 14, height: 14 }} />}
                  {loading ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "28px" }}>
              <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", flexDirection: "column", gap: 28 }}>

                <FormCard title="Couverture" icon={<ImagePlus style={{ width: 16, height: 16 }} />}>
                  <div>
                    <FieldLabel>Image de couverture</FieldLabel>
                    <div
                      style={{ width: "100%", aspectRatio: "16 / 9", borderRadius: 12, border: "2px dashed #e2e8f0", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", overflow: "hidden", position: "relative" }}
                      onClick={() => document.getElementById("coverInput")?.click()}
                    >
                      {editingBootcamp.coverPreview ? (
                        <img src={editingBootcamp.coverPreview} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="Cover preview" />
                      ) : (
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontSize: 28, color: "#94a3b8", marginBottom: 6 }}>+</div>
                          <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>Resolution recommandee : 1920x1080</p>
                        </div>
                      )}
                      <input
                        id="coverInput"
                        type="file"
                        accept="image/*"
                        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer" }}
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleImageChange(file)
                        }}
                      />
                    </div>
                  </div>
                </FormCard>

                <FormCard title="Informations de base" icon={<BookOpen style={{ width: 16, height: 16 }} />}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div>
                      <FieldLabel required>Titre du bootcamp</FieldLabel>
                      <Input value={editingBootcamp.title} onChange={v => setEditingBootcamp({ ...editingBootcamp, title: v })} placeholder="Ex: Bootcamp Developpeur Full Stack" />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                      <div>
                        <FieldLabel required>Prerequis</FieldLabel>
                        <SelectField value={editingBootcamp.prerequis} onChange={v => setEditingBootcamp({ ...editingBootcamp, prerequis: v as "Aucun" | "Contacter l'administration" })}>
                          {PREREQUIS_OPTIONS.map(option => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </SelectField>
                      </div>
                      <div>
                        <FieldLabel required>Duree totale</FieldLabel>
                        <Input value={editingBootcamp.durationLabel} onChange={v => setEditingBootcamp({ ...editingBootcamp, durationLabel: v })} placeholder="Ex: 120 heures" />
                      </div>
                    </div>
                    <div>
                      <FieldLabel required>Description courte</FieldLabel>
                      <Textarea rows={3} value={editingBootcamp.shortDescription} onChange={v => setEditingBootcamp({ ...editingBootcamp, shortDescription: v })} placeholder="Une breve description du bootcamp" />
                    </div>
                    <div>
                      <FieldLabel>Description detaillee</FieldLabel>
                      <Textarea rows={5} value={editingBootcamp.longDescription} onChange={v => setEditingBootcamp({ ...editingBootcamp, longDescription: v })} placeholder="Description complete du bootcamp, objectifs, programme..." />
                    </div>
                  </div>
                </FormCard>

                <FormCard title="Statistiques" icon={<Star style={{ width: 16, height: 16 }} />}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div>
                      <FieldLabel>Note</FieldLabel>
                      <Input
                        type="number"
                        value={editingBootcamp.rating}
                        onChange={v => setEditingBootcamp({ ...editingBootcamp, rating: parseFloat(v) || 0 })}
                      />
                    </div>
                    <div>
                      <FieldLabel>Nombre d'avis</FieldLabel>
                      <Input
                        type="number"
                        value={editingBootcamp.reviewsCount}
                        onChange={v => setEditingBootcamp({ ...editingBootcamp, reviewsCount: parseInt(v) || 0 })}
                      />
                    </div>
                  </div>
                </FormCard>

                <FormCard title="Formations incluses" icon={<Layers style={{ width: 16, height: 16 }} />}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div>
                      <FieldLabel>Ajouter une formation</FieldLabel>
                      <div style={{ position: "relative" }} ref={courseDropdownRef}>
                        <div style={{ position: "relative" }}>
                          <Search style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "#94a3b8" }} />
                          <input
                            type="text"
                            style={{ width: "100%", padding: "9px 12px 9px 36px", background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 13, outline: "none", boxSizing: "border-box", color: "#0f172a", fontFamily: "inherit" }}
                            placeholder="Rechercher une formation..."
                            value={courseSearch}
                            onChange={(e) => {
                              setCourseSearch(e.target.value)
                              setShowCourseDropdown(true)
                            }}
                            onFocus={() => setShowCourseDropdown(true)}
                            onKeyDown={handleKeyPress}
                          />
                        </div>

                        {showCourseDropdown && availableCourses.length > 0 && (
                          <div style={{ position: "absolute", zIndex: 10, width: "100%", marginTop: 6, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, boxShadow: "0 8px 20px rgba(15,23,42,0.08)", maxHeight: 260, overflowY: "auto" }}>
                            {availableCourses.map(course => (
                              <div
                                key={course.id}
                                style={{ padding: "10px 12px", borderBottom: "1px solid #f1f5f9", cursor: "pointer" }}
                                onClick={() => {
                                  if (!editingBootcamp) return
                                  if (!editingBootcamp.courseIds.includes(course.id!)) {
                                    setEditingBootcamp({
                                      ...editingBootcamp,
                                      courseIds: [...editingBootcamp.courseIds, course.id!],
                                    })
                                  }
                                  setCourseSearch("")
                                  setSelectedCourseId("")
                                  setShowCourseDropdown(false)
                                }}
                              >
                                <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{course.title}</div>
                                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{course.shortDescription}</div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                                  <span style={{ fontSize: 11, padding: "2px 6px", borderRadius: 6, background: "#f1f5f9", color: "#475569" }}>{course.levelLabel}</span>
                                  <span style={{ fontSize: 11, color: "#94a3b8" }}>{course.durationLabel}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: "#475569", margin: 0 }}>Formations selectionnees ({getAssignedCourses().length})</p>
                        <p style={{ fontSize: 11, color: "#94a3b8", margin: 0 }}>Utilisez les fleches pour reorganiser</p>
                      </div>

                      {getAssignedCourses().length === 0 ? (
                        <div style={{ padding: "16px", borderRadius: 10, border: "1px dashed #e2e8f0", background: "#f8fafc", textAlign: "center", fontSize: 12, color: "#94a3b8" }}>
                          Aucune formation selectionnee.
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {getAssignedCourses().map((course, index) => (
                            <div key={course.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12, border: "1px solid #e8ecf3", background: "#fff" }}>
                              <div style={{ width: 26, height: 26, borderRadius: 8, background: "rgba(99,102,241,0.12)", color: "var(--accent,#6366f1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>{index + 1}</div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{course.title}</div>
                                <div style={{ fontSize: 12, color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{course.shortDescription}</div>
                              </div>
                              <div style={{ display: "flex", gap: 4 }}>
                                <IconBtn onClick={() => handleMoveCourse(course.id!, "up")} color="#64748b" hoverBg="#f1f5f9"><ChevronUp style={{ width: 12, height: 12 }} /></IconBtn>
                                <IconBtn onClick={() => handleMoveCourse(course.id!, "down")} color="#64748b" hoverBg="#f1f5f9"><ChevronDown style={{ width: 12, height: 12 }} /></IconBtn>
                                <IconBtn onClick={() => handleRemoveCourse(course.id!)} color="#f43f5e" hoverBg="rgba(244,63,94,0.08)"><Trash2 style={{ width: 12, height: 12 }} /></IconBtn>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </FormCard>
              </div>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
            <div style={{ width: 80, height: 80, borderRadius: 24, background: "linear-gradient(135deg,rgba(99,102,241,0.12),rgba(129,140,248,0.06))", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Users style={{ width: 36, height: 36, color: "var(--accent,#6366f1)" }} />
            </div>
            <div style={{ textAlign: "center" }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", margin: "0 0 6px" }}>Aucun bootcamp selectionne</h3>
              <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>Choisissez un bootcamp dans la liste ou creez-en un nouveau.</p>
            </div>
            <button onClick={handleNewBootcamp} style={{ marginTop: 8, padding: "10px 24px", background: "linear-gradient(135deg,var(--accent,#6366f1),#818cf8)", color: "#fff", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 14px rgba(99,102,241,0.3)" }}>
              <Plus style={{ width: 16, height: 16 }} /> Creer un bootcamp
            </button>
          </div>
        )}
      </div>

      {/* Toasts */}
      <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 9999, display: "flex", flexDirection: "column", gap: 10 }}>
        {toasts.map(toast => {
          if (toast.type === "loading") return null
          const progress = Math.max(0, 100 - ((Date.now() - toast.createdAt) / toast.duration) * 100)
          const ok = toast.type === "success"
          return (
            <div key={toast.id} style={{ position: "relative", overflow: "hidden", background: ok ? "#f0fdf4" : "#fff1f2", border: `1px solid ${ok ? "#bbf7d0" : "#fecdd3"}`, borderRadius: 14, boxShadow: "0 8px 24px rgba(0,0,0,0.1)", minWidth: 280, maxWidth: 360, animation: "slideIn 0.2s ease" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px" }}>
                {ok ? <CheckCircle style={{ width: 18, height: 18, color: "#22c55e", flexShrink: 0 }} /> : <AlertCircle style={{ width: 18, height: 18, color: "#f43f5e", flexShrink: 0 }} />}
                <p style={{ flex: 1, fontSize: 13, fontWeight: 600, color: ok ? "#166534" : "#9f1239", margin: 0 }}>{toast.message}</p>
                <button onClick={() => removeToast(toast.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "#94a3b8", display: "flex" }}><X style={{ width: 14, height: 14 }} /></button>
              </div>
              <div style={{ position: "absolute", bottom: 0, left: 0, height: 3, background: ok ? "#22c55e" : "#f43f5e", width: `${progress}%`, transition: "width 0.1s linear" }} />
            </div>
          )
        })}
      </div>

      <style>{`
        @keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        ::-webkit-scrollbar{width:5px;height:5px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:#e2e8f0;border-radius:99px}
        ::-webkit-scrollbar-thumb:hover{background:#cbd5e1}
      `}</style>
    </div>
  )

}
