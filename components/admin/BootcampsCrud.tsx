"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  Search, Plus, Edit, Trash2, ExternalLink,
  ChevronUp, ChevronDown, Save, X,
  BookOpen, Star, ChevronRight, Layers, ImagePlus,
  CheckCircle, AlertCircle, Loader2,
  Archive
} from "lucide-react"
import { AdminPageHeader } from "@/components/admin/AdminPageHeader"

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
  slug?: string
  title: string
  shortDescription: string
  longDescription: string
  durationLabel: string
  prerequis: "Aucun" | "Contacter l'administration"
  rating: number
  reviewsCount: number
  isPublished: boolean
  courseIds: string[]
  tags: string[]
  coverImage?: File | string | null
  coverPreview?: string | null
}

type BootcampsCrudProps = {
  initialBootcamps?: AdminBootcamp[]
  initialCourses?: AdminCourse[]
  onSave?: (bootcamp: AdminBootcamp) => Promise<void>
  onDelete?: (id: string) => Promise<void>
  onView?: (bootcamp: AdminBootcamp) => void
}

const PREREQUIS_OPTIONS = [
  "Aucun",
  "Contacter l'administration"
] as const

// ---- UI primitives (matching CoursesCrud style) ----
function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 7, letterSpacing: "0.06em", textTransform: "uppercase" }}>
      {children}{required && <span style={{ color: "#ef4444", marginLeft: 4 }}>*</span>}
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
      style={{ width: "100%", padding: "10px 14px", background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 14, color: "#0f172a", outline: "none", boxSizing: "border-box", fontFamily: "inherit", transition: "border-color 0.15s, box-shadow 0.15s", ...style }}
      onFocus={e => { e.target.style.borderColor = "var(--accent,#6366f1)"; e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.1)" }}
      onBlur={e => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none" }}
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
      style={{ width: "100%", padding: "10px 14px", background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 14, color: "#0f172a", outline: "none", resize: "none", fontFamily: "inherit", boxSizing: "border-box", transition: "border-color 0.15s, box-shadow 0.15s", lineHeight: 1.6 }}
      onFocus={e => { e.target.style.borderColor = "var(--accent,#6366f1)"; e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.1)" }}
      onBlur={e => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none" }}
    />
  )
}

function SelectField({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <div style={{ position: "relative" }}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ width: "100%", padding: "10px 36px 10px 14px", background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 14, color: "#0f172a", outline: "none", appearance: "none", cursor: "pointer", fontFamily: "inherit", transition: "border-color 0.15s, box-shadow 0.15s" }}
        onFocus={e => { e.target.style.borderColor = "var(--accent,#6366f1)"; e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.1)" }}
        onBlur={e => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none" }}
      >
        {children}
      </select>
      <ChevronRight style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%) rotate(90deg)", width: 14, height: 14, color: "#475569", pointerEvents: "none" }} />
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
      style={{ padding: 7, borderRadius: 8, border: "none", background: hover ? hoverBg : "transparent", color, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.15s" }}
    >
      {children}
    </button>
  )
}

function FormCard({ title, icon, children, action }: { title: string; icon?: React.ReactNode; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #edf0f7", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 6px 20px rgba(0,0,0,0.04)" }}>
      <div style={{ padding: "14px 22px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(180deg,#fafbfe 0%,#fff 100%)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: "var(--accent,#6366f1)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {icon}
          </div>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: 0, letterSpacing: "-0.01em" }}>{title}</h3>
        </div>
        {action}
      </div>
      <div style={{ padding: "20px 22px" }}>{children}</div>
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
  const router = useRouter()
  // 🔔 TOAST SYSTEM - State
  const [toasts, setToasts] = useState<Toast[]>([])

  // State
  const [bootcamps, setBootcamps] = useState<AdminBootcamp[]>(initialBootcamps)
  const [courses, setCourses] = useState<AdminCourse[]>(initialCourses)
  const [editingBootcamp, setEditingBootcamp] = useState<AdminBootcamp | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(false)
  
  const [filterTag, setFilterTag] = useState<string>("all")
  const [hoveredTagsBootcampId, setHoveredTagsBootcampId] = useState<string | null>(null)
  const [tagsTooltipPos, setTagsTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })

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
    tags: [],
    coverImage: null,
    coverPreview: null,
  })

  const allTags = Array.from(new Set(bootcamps.flatMap(b => b.tags ?? [])))

  // Filter bootcamps
  const filteredBootcamps = bootcamps.filter(bootcamp => {
    const q = searchTerm.toLowerCase()
    if (q && !bootcamp.title.toLowerCase().includes(q) && !bootcamp.shortDescription.toLowerCase().includes(q)) return false
    if (filterTag !== "all" && !(bootcamp.tags ?? []).includes(filterTag)) return false
    return true
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

  const handleArchiveBootcamp = async (id: string) => {
    if (!confirm("Archiver ce bootcamp ?")) return
    try {
      if (onDelete) await onDelete(id)
      setBootcamps(prev => prev.filter(b => b.id !== id))
      if (editingBootcamp?.id === id) setEditingBootcamp(null)
      showToast("success", "Bootcamp archivé.")
    } catch (err: any) {
      showToast("error", err.message || "Erreur lors de l'archivage")
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
    <div style={{ minHeight: "100vh", background: "#fafafa", fontFamily: "'DM Sans','Inter',sans-serif" }}>

      <AdminPageHeader
        title="Bootcamps"
        description="Gérez le catalogue de bootcamps"
        breadcrumbs={[{ label: "Bootcamps" }]}
        actions={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={() => router.push("/admin-dashboard/bootcamps/archive")}
              style={{ padding: "9px 20px", background: "#f8fafc", color: "#475569", border: "1.5px solid #e8ecf3", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, transition: "all 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(99,102,241,0.06)"; e.currentTarget.style.color = "var(--accent,#6366f1)"; e.currentTarget.style.borderColor = "rgba(99,102,241,0.3)" }}
              onMouseLeave={e => { e.currentTarget.style.background = "#f8fafc"; e.currentTarget.style.color = "#475569"; e.currentTarget.style.borderColor = "#e8ecf3" }}
            >
              <Archive style={{ width: 15, height: 15 }} /> Archives
            </button>
            <button
              onClick={handleNewBootcamp}
              style={{ padding: "9px 20px", background: "var(--accent,#6366f1)", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, transition: "opacity 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "0.88")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
            >
              <Plus style={{ width: 15, height: 15 }} /> Nouveau bootcamp
            </button>
          </div>
        }
      />

      {/* ── Filters bar ── */}
      <div style={{ padding: "14px 32px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, borderBottom: "1px solid #f1f5f9", background: "#fff" }}>
        <div style={{ position: "relative", flex: 1 }}>
          <Search style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "#475569" }} />
          <input
            type="text"
            placeholder="Rechercher un bootcamp..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ width: "100%", padding: "7px 12px 7px 34px", background: "#f8fafc", border: "1.5px solid #e8ecf3", borderRadius: 9, fontSize: 13, outline: "none", boxSizing: "border-box", color: "#0f172a", fontFamily: "inherit" }}
            onFocus={e => { e.currentTarget.style.borderColor = "var(--accent,#6366f1)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.08)" }}
            onBlur={e => { e.currentTarget.style.borderColor = "#e8ecf3"; e.currentTarget.style.boxShadow = "none" }}
          />
        </div>
        {allTags.length > 0 && (
          <select value={filterTag} onChange={e => setFilterTag(e.target.value)}
            style={{ padding: "7px 12px", background: "#f8fafc", border: "1.5px solid #e8ecf3", borderRadius: 9, fontSize: 13, color: filterTag !== "all" ? "var(--accent,#6366f1)" : "#475569", fontFamily: "inherit", outline: "none", cursor: "pointer" }}>
            <option value="all">Tag: tous</option>
            {allTags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
          </select>
        )}
        <div style={{ fontSize: 13, color: "#475569", marginLeft: "auto" }}>
          <span style={{ fontWeight: 600, color: "#0f172a" }}>{filteredBootcamps.length}</span> bootcamp{filteredBootcamps.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* ── Table ── */}
      {(() => {
        const displayBootcamps = filteredBootcamps
        const isEmpty = displayBootcamps.length === 0

        return (
          <div style={{ padding: "0px 0px" }}>
            {isEmpty ? (
              <div style={{ background: "#fff", padding: "64px 24px", textAlign: "center" }}>
                <Layers style={{ width: 40, height: 40, color: "#e2e8f0", margin: "0 auto 12px" }} />
                <p style={{ fontSize: 15, fontWeight: 600, color: "#475569", margin: "0 0 4px" }}>Aucun bootcamp trouvé</p>
                <p style={{ fontSize: 13, color: "#475569", margin: 0 }}>Créez votre premier bootcamp avec le bouton ci-dessus.</p>
              </div>
            ) : (
              <div style={{ background: "#fff", overflow: "hidden" }}>
                {/* Table header */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 180px 150px", padding: "18px 36px", borderBottom: "1px solid #f1f5f9", background: "#fafbfd" }}>
                  {["Bootcamp", "Tags", "Actions"].map(h => (
                    <span key={h} style={{ fontSize: 13, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</span>
                  ))}
                </div>
                {/* Rows */}
                {displayBootcamps.map((bootcamp, idx) => (
                  <div
                    key={bootcamp.id}
                    style={{ display: "grid", gridTemplateColumns: "1fr 180px 150px", padding: "32px 36px", borderBottom: idx < displayBootcamps.length - 1 ? "1px solid #f1f5f9" : "none", alignItems: "center", transition: "background 0.15s" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#fafbfd")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    {/* Title + description */}
                    <div style={{ minWidth: 0, paddingRight: 24 }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 20 }}>
                        {bootcamp.coverPreview || (bootcamp.coverImage && typeof bootcamp.coverImage === "string") ? (
                          <img
                            src={bootcamp.coverPreview || `${process.env.NEXT_PUBLIC_PB_URL}/api/files/bootcamps/${bootcamp.id}/${bootcamp.coverImage}`}
                            onClick={() => handleSelectBootcamp(bootcamp)}
                            style={{ width: 320, height: 180, borderRadius: 4, objectFit: "cover", flexShrink: 0, border: "1px solid #f1f5f9", boxShadow: "0 2px 8px rgba(0,0,0,0.07)", cursor: "pointer" }}
                            alt=""
                          />
                        ) : (
                          <div onClick={() => handleSelectBootcamp(bootcamp)} style={{ width: 320, height: 180, borderRadius: 4, background: "rgba(99,102,241,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: "pointer" }}>
                            <Layers style={{ width: 30, height: 30, color: "var(--accent,#6366f1)" }} />
                          </div>
                        )}
                        <div style={{ minWidth: 0 }}>
                          <p
                            onClick={() => handleSelectBootcamp(bootcamp)}
                            onMouseEnter={e => (e.currentTarget.style.color = "var(--accent,#6366f1)")}
                            onMouseLeave={e => (e.currentTarget.style.color = "#0f172a")}
                            style={{ fontSize: 17, fontWeight: 700, color: "#0f172a", margin: "0 0 6px", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", cursor: "pointer", transition: "color 0.15s" }}
                          >{bootcamp.title || "Sans titre"}</p>
                          <p style={{ fontSize: 14, color: "#475569", margin: 0, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 5, WebkitBoxOrient: "vertical" }}>{bootcamp.longDescription || bootcamp.shortDescription}</p>
                        </div>
                      </div>
                    </div>
                    {/* Tags */}
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", overflow: "hidden", alignContent: "flex-start", alignSelf: "stretch" }}>
                      {(bootcamp.tags ?? []).slice(0, 4).map((tag, i) => (
                        <span key={`${tag}-${i}`} style={{ fontSize: 13, padding: "5px 13px", borderRadius: 8, background: "rgba(99,102,241,0.08)", color: "var(--accent,#6366f1)", fontWeight: 600 }}>{tag}</span>
                      ))}
                      {(bootcamp.tags?.length || 0) > 4 && (
                        <span
                          style={{ fontSize: 13, padding: "5px 10px", borderRadius: 8, background: "#f1f5f9", color: "#475569", fontWeight: 600, cursor: "default" }}
                          onMouseEnter={e => { setTagsTooltipPos({ x: e.clientX, y: e.clientY + 16 }); setHoveredTagsBootcampId(bootcamp.id ?? null) }}
                          onMouseLeave={() => setHoveredTagsBootcampId(null)}
                        >+{bootcamp.tags!.length - 4}</span>
                      )}
                    </div>
                    {/* Actions */}
                    <div style={{ display: "flex", gap: 8 }}>
                      {onView && <IconBtn onClick={e => { e.stopPropagation(); onView(bootcamp) }} color="#475569" title="Voir"><ExternalLink style={{ width: 22, height: 22 }} /></IconBtn>}
                      <IconBtn onClick={e => { e.stopPropagation(); handleSelectBootcamp(bootcamp) }} color="var(--accent,#6366f1)" hoverBg="rgba(99,102,241,0.08)" title="Modifier"><Edit style={{ width: 22, height: 22 }} /></IconBtn>
                      <IconBtn onClick={e => { e.stopPropagation(); bootcamp.id && handleArchiveBootcamp(bootcamp.id) }} color="#f43f5e" hoverBg="rgba(244,63,94,0.08)" title="Archiver"><Archive style={{ width: 22, height: 22 }} /></IconBtn>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })()}

      {/* ── Modal overlay ── */}
      {editingBootcamp && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.5)", backdropFilter: "blur(6px)" }} onClick={handleCancelEdit} />
          <div className="bootcamp-modal-inner" style={{ position: "relative", background: "#fff", borderRadius: 20, boxShadow: "0 24px 64px rgba(0,0,0,0.15), 0 4px 16px rgba(0,0,0,0.06)", width: "100%", maxWidth: 880, maxHeight: "94vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* Accent strip */}
            <div style={{ height: 3, background: "linear-gradient(90deg,var(--accent,#6366f1),#818cf8,#a78bfa)", flexShrink: 0 }} />
            {/* Modal header */}
            <div style={{ padding: "20px 28px 18px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, background: "#fff" }}>
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#a5b4fc", margin: "0 0 4px" }}>{isCreating ? "Nouveau bootcamp" : "Modifier"}</p>
                <h2 style={{ fontSize: 19, fontWeight: 700, color: "#0f172a", margin: 0, letterSpacing: "-0.02em" }}>{editingBootcamp.title || "Sans titre"}</h2>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button onClick={handleSaveBootcamp} disabled={loading}
                  style={{ padding: "9px 22px", borderRadius: 10, border: "none", background: loading ? "#f1f5f9" : "linear-gradient(135deg,var(--accent,#6366f1),#818cf8)", color: loading ? "#475569" : "#fff", fontSize: 13, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 7, boxShadow: loading ? "none" : "0 4px 14px rgba(99,102,241,0.35)", transition: "all 0.2s" }}
                  onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 6px 20px rgba(99,102,241,0.5)" }}
                  onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 14px rgba(99,102,241,0.35)" }}
                >
                  {loading ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : <Save style={{ width: 14, height: 14 }} />}
                  {loading ? "Enregistrement..." : "Enregistrer"}
                </button>
                <button onClick={handleCancelEdit}
                  style={{ width: 34, height: 34, borderRadius: 9, border: "1.5px solid #e8ecf3", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#475569", transition: "all 0.15s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#fca5a5"; (e.currentTarget as HTMLButtonElement).style.color = "#ef4444"; (e.currentTarget as HTMLButtonElement).style.background = "#fff5f5" }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#e8ecf3"; (e.currentTarget as HTMLButtonElement).style.color = "#475569"; (e.currentTarget as HTMLButtonElement).style.background = "#fff" }}
                >
                  <X style={{ width: 15, height: 15 }} />
                </button>
              </div>
            </div>

            {/* Modal body */}
            <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px", background: "#f7f9fc" }}>
              <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>

                {/* Cover image */}
                <div style={{ position: "relative" }}>
                  <div
                    onClick={() => document.getElementById("coverInput")?.click()}
                    style={{ width: "100%", paddingTop: "42%", position: "relative", borderRadius: 16, border: "2px dashed #dde3f0", background: editingBootcamp.coverPreview ? "none" : "linear-gradient(135deg,#f0f4ff,#fafbfe)", cursor: "pointer", overflow: "hidden", transition: "border-color 0.15s, background 0.15s" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--accent,#6366f1)"; (e.currentTarget as HTMLDivElement).style.background = editingBootcamp.coverPreview ? "none" : "linear-gradient(135deg,#eef2ff,#f5f3ff)" }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "#dde3f0"; (e.currentTarget as HTMLDivElement).style.background = editingBootcamp.coverPreview ? "none" : "linear-gradient(135deg,#f0f4ff,#fafbfe)" }}
                  >
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {editingBootcamp.coverPreview ? (
                        <>
                          <img src={editingBootcamp.coverPreview} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="Cover" />
                          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, opacity: 0, transition: "opacity 0.2s" }}
                            onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.opacity = "1"}
                            onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.opacity = "0"}
                          >
                            <ImagePlus style={{ width: 28, height: 28, color: "#fff" }} />
                            <p style={{ color: "#fff", fontSize: 14, fontWeight: 600, margin: 0 }}>Changer l'image</p>
                          </div>
                        </>
                      ) : (
                        <div style={{ textAlign: "center" }}>
                          <div style={{ width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg,rgba(99,102,241,0.12),rgba(129,140,248,0.06))", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", boxShadow: "0 4px 16px rgba(99,102,241,0.15)" }}>
                            <ImagePlus style={{ width: 26, height: 26, color: "var(--accent,#6366f1)" }} />
                          </div>
                          <p style={{ fontSize: 14, fontWeight: 600, color: "#475569", margin: 0 }}>Ajouter une image de couverture</p>
                          <p style={{ fontSize: 12, color: "#475569", marginTop: 5 }}>Format recommandé : 1280 × 720 (16:9)</p>
                        </div>
                      )}
                    </div>
                    <input id="coverInput" type="file" accept="image/*" style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}
                      onChange={e => { const file = e.target.files?.[0]; if (file) handleImageChange(file) }}
                    />
                  </div>
                  {/* 16:9 badge */}
                  <div style={{ position: "absolute", top: 12, right: 12, background: "rgba(0,0,0,0.5)", color: "#fff", fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", padding: "3px 9px", borderRadius: 7, backdropFilter: "blur(4px)" }}>
                    16 : 9
                  </div>
                </div>

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

                <FormCard title="Formations incluses" icon={<Layers style={{ width: 16, height: 16 }} />}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div>
                      <FieldLabel>Ajouter une formation</FieldLabel>
                      <div style={{ position: "relative" }} ref={courseDropdownRef}>
                        <div style={{ position: "relative" }}>
                          <Search style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "#475569", zIndex: 1 }} />
                          <input
                            type="text"
                            style={{ width: "100%", padding: "10px 14px 10px 36px", background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box", color: "#0f172a", fontFamily: "inherit", transition: "border-color 0.15s, box-shadow 0.15s" }}
                            placeholder="Rechercher une formation..."
                            value={courseSearch}
                            onChange={(e) => {
                              setCourseSearch(e.target.value)
                              setShowCourseDropdown(true)
                            }}
                            onFocus={e => { setShowCourseDropdown(true); e.target.style.borderColor = "var(--accent,#6366f1)"; e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.1)" }}
                            onBlur={e => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none" }}
                            onKeyDown={handleKeyPress}
                          />
                        </div>

                        {showCourseDropdown && availableCourses.length > 0 && (
                          <div style={{ position: "absolute", zIndex: 10, width: "100%", marginTop: 6, background: "#fff", border: "1.5px solid #e8ecf3", borderRadius: 12, boxShadow: "0 8px 24px rgba(15,23,42,0.1)", maxHeight: 260, overflowY: "auto" }}>
                            {availableCourses.map((course, i) => (
                              <div
                                key={course.id}
                                style={{ padding: "10px 14px", borderBottom: i < availableCourses.length - 1 ? "1px solid #f1f5f9" : "none", cursor: "pointer", transition: "background 0.12s" }}
                                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "#f8fafc"}
                                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "transparent"}
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
                                <div style={{ fontSize: 12, color: "#475569", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{course.shortDescription}</div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 5 }}>
                                  <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "rgba(99,102,241,0.08)", color: "var(--accent,#6366f1)", fontWeight: 600 }}>{course.levelLabel}</span>
                                  <span style={{ fontSize: 11, color: "#475569" }}>{course.durationLabel}</span>
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
                        <p style={{ fontSize: 11, color: "#475569", margin: 0 }}>Utilisez les fleches pour reorganiser</p>
                      </div>

                      {getAssignedCourses().length === 0 ? (
                        <div style={{ padding: "16px", borderRadius: 10, border: "1px dashed #e2e8f0", background: "#f8fafc", textAlign: "center", fontSize: 12, color: "#475569" }}>
                          Aucune formation selectionnee.
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {getAssignedCourses().map((course, index) => (
                            <div key={course.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12, border: "1px solid #e8ecf3", background: "#fff" }}>
                              <div style={{ width: 26, height: 26, borderRadius: 8, background: "rgba(99,102,241,0.12)", color: "var(--accent,#6366f1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>{index + 1}</div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{course.title}</div>
                                <div style={{ fontSize: 12, color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{course.shortDescription}</div>
                              </div>
                              <div style={{ display: "flex", gap: 4 }}>
                                <IconBtn onClick={() => handleMoveCourse(course.id!, "up")} color="#475569" hoverBg="#f1f5f9"><ChevronUp style={{ width: 12, height: 12 }} /></IconBtn>
                                <IconBtn onClick={() => handleMoveCourse(course.id!, "down")} color="#475569" hoverBg="#f1f5f9"><ChevronDown style={{ width: 12, height: 12 }} /></IconBtn>
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
          </div>
        </div>
      )}

      {/* Tags tooltip */}
      {hoveredTagsBootcampId && (() => {
        const bootcamp = bootcamps.find(b => b.id === hoveredTagsBootcampId)
        if (!bootcamp || (bootcamp.tags?.length || 0) <= 4) return null
        return (
          <div style={{ position: "fixed", zIndex: 9999, left: tagsTooltipPos.x, top: tagsTooltipPos.y, transform: "translateX(-50%)", background: "#fafbfd", border: "1px solid #f1f5f9", borderRadius: 10, padding: "10px 12px", boxShadow: "0 8px 24px rgba(0,0,0,0.10)", display: "flex", flexWrap: "wrap", gap: 6, maxWidth: 240, pointerEvents: "none" }}>
            {bootcamp.tags.slice(4).map((tag, i) => (
              <span key={`tooltip-${tag}-${i}`} style={{ fontSize: 12, padding: "4px 10px", borderRadius: 6, background: "rgba(99,102,241,0.08)", color: "var(--accent,#6366f1)", fontWeight: 600, whiteSpace: "nowrap" }}>{tag}</span>
            ))}
          </div>
        )
      })()}

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
                <button onClick={() => removeToast(toast.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "#475569", display: "flex" }}><X style={{ width: 14, height: 14 }} /></button>
              </div>
              <div style={{ position: "absolute", bottom: 0, left: 0, height: 3, background: ok ? "#22c55e" : "#f43f5e", width: `${progress}%`, transition: "width 0.1s linear" }} />
            </div>
          )
        })}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
        @keyframes modalIn{from{opacity:0;transform:scale(0.97) translateY(10px)}to{opacity:1;transform:scale(1) translateY(0)}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        .bootcamp-modal-inner{animation:modalIn 0.22s cubic-bezier(0.22,1,0.36,1) forwards;font-family:'Plus Jakarta Sans',sans-serif}
        .bootcamp-modal-inner ::-webkit-scrollbar{width:5px}
        .bootcamp-modal-inner ::-webkit-scrollbar-track{background:transparent}
        .bootcamp-modal-inner ::-webkit-scrollbar-thumb{background:#e2e8f0;border-radius:99px}
        .bootcamp-modal-inner ::-webkit-scrollbar-thumb:hover{background:#cbd5e1}
        .bootcamp-modal-inner input::placeholder,.bootcamp-modal-inner textarea::placeholder{color:#c0ccdc}
      `}</style>
    </div>
  )

}
