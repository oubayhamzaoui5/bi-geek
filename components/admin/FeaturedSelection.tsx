// components/admin/FeaturedSelection.tsx
"use client"

import { useState, useEffect, useMemo , useRef  } from "react"
import { 
  Search, Trash2, X,
  BookOpen, Star, Award, TrendingUp,
  CheckCircle, AlertCircle,
  ArrowUp, ArrowDown, Layers
} from "lucide-react"

// Types
type AdminCourse = {
  id: string
  title: string
  shortDescription: string
  levelLabel: string
  durationLabel: string
  coverImage?: string | null
  rating: number
  isPublished: boolean
}

type AdminBootcamp = {
  id: string
  title: string 
  shortDescription: string
  durationLabel: string
  coverImage?: string | null
  rating: number
  isPublished: boolean
  courseIds: string[]
}

type FeaturedItem = {
  id?: string
  itemId: string
  type: 'course' | 'bootcamp'
  order: number
}

// 🔔 TOAST SYSTEM - Types
type ToastType = "success" | "error" | "loading"
type Toast = {
  id: string
  type: ToastType
  message: string
  duration: number
  createdAt: number
}

type FeaturedSelectionProps = {
  initialFeatured?: FeaturedItem[]
  courses: AdminCourse[]
  bootcamps: AdminBootcamp[]
  onSaveFeatured?: (items: FeaturedItem[]) => Promise<void>
  maxItems?: number
}

// ---- UI primitives (matching CoursesCrud style) ----
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

function IconBtn({ onClick, title, color = "#64748b", hoverBg = "#f1f5f9", children, disabled }: {
  onClick: () => void; title?: string; color?: string; hoverBg?: string; children: React.ReactNode; disabled?: boolean
}) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ padding: 7, borderRadius: 8, border: "none", background: hover ? hoverBg : "transparent", color, cursor: disabled ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.15s", opacity: disabled ? 0.5 : 1 }}
    >
      {children}
    </button>
  )
}

export default function FeaturedSelection({
  initialFeatured = [],
  courses,
  bootcamps,
  onSaveFeatured,
  maxItems = 3
}: FeaturedSelectionProps) {
  // 🔔 TOAST SYSTEM - State
  const [toasts, setToasts] = useState<Toast[]>([])

  const hasLoadedRef = useRef(false)
  const hasShownLoaderRef = useRef(false)
  const isFirstAutoSave = useRef(true)
  const lastSavedRef = useRef<string>("")

  // State
  const [featuredItems, setFeaturedItems] = useState<FeaturedItem[]>(initialFeatured)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState<'courses' | 'bootcamps'>('courses')

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

  // Get item details from ID
  const getItemDetails = (itemId: string, type: 'course' | 'bootcamp') => {
    if (type === 'course') {
      return courses.find(c => c.id === itemId)
    } else {
      return bootcamps.find(b => b.id === itemId)
    }
  }

  // Get full featured items with details
  const fullFeaturedItems = useMemo(() => {
    return featuredItems.map(item => {
      const details = getItemDetails(item.itemId, item.type)
      return {
        ...item,
        title: details?.title || 'N/A',
        description: details?.shortDescription || '',
        image: details?.coverImage || null,
        rating: details?.rating || 0,
        durationLabel: details?.durationLabel || '',
        isPublished: details?.isPublished || true 
      }
    }).filter(item => item.isPublished)
  }, [featuredItems, courses, bootcamps])

  // Check if item is already featured
  const isItemFeatured = (itemId: string): boolean => {
    return featuredItems.some(item => item.itemId === itemId)
  }

  const getFeaturedOrder = (itemId: string): number | null => {
    const found = featuredItems.find(item => item.itemId === itemId)
    return found ? found.order : null
  }

  // Get visible items (includes already featured)
  const getAvailableItems = () => {
    if (activeTab === 'courses') {
      return courses
        .filter(course => (course.isPublished ?? true))
        .filter(item => 
          item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.shortDescription.toLowerCase().includes(searchTerm.toLowerCase())
        )
    } else {
      return bootcamps
        .filter(bootcamp => (bootcamp.isPublished ?? true))
        .filter(item =>
          item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.shortDescription.toLowerCase().includes(searchTerm.toLowerCase())
        )
    }
  }

  // Add item to featured
  const handleAddFeatured = (item: AdminCourse | AdminBootcamp) => {
    const typeCount = featuredItems.filter(f => f.type === (activeTab === 'courses' ? 'course' : 'bootcamp')).length
    
    if (typeCount >= maxItems) {
      showToast("error", `Vous ne pouvez sélectionner que ${maxItems} ${activeTab === 'courses' ? 'Formations' : 'bootcamps'} maximum`)
      return
    }

    const newItem: FeaturedItem = {
      itemId: item.id,
      type: activeTab === 'courses' ? 'course' : 'bootcamp',
      order: featuredItems.length + 1
    }

    setFeaturedItems(prev => [...prev, newItem].map((item, index) => ({
      ...item,
      order: index + 1
    })))
    
    showToast("success", `${activeTab === 'courses' ? 'Formation' : 'Bootcamp'} ajouté aux vedettes`)
  }

  const handleToggleFeatured = (item: AdminCourse | AdminBootcamp) => {
    const already = isItemFeatured(item.id)
    if (already) {
      handleRemoveFeatured(item.id)
      return
    }
    handleAddFeatured(item)
  }

  // Remove item from featured
  const handleRemoveFeatured = (itemId: string) => {
    const newItems = featuredItems
      .filter(item => item.itemId !== itemId)
      .map((item, index) => ({ ...item, order: index + 1 }))
    
    setFeaturedItems(newItems)
    showToast("success", "Élément retiré des vedettes")
  }

  // Move item up/down
  const handleMoveItem = (itemId: string, direction: 'up' | 'down') => {
    const items = [...featuredItems]
    const currentIndex = items.findIndex(item => item.itemId === itemId)
    
    if (currentIndex === -1) return
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    
    if (newIndex >= 0 && newIndex < items.length) {
      [items[currentIndex], items[newIndex]] = [items[newIndex], items[currentIndex]]
      
      const updatedItems = items.map((item, index) => ({
        ...item,
        order: index + 1
      }))
      
      setFeaturedItems(updatedItems)
    }
  }

  // Reset selections
  const handleReset = () => {
    if (confirm("Voulez-vous vraiment réinitialiser toutes les sélections ?")) {
      setFeaturedItems([])
      showToast("success", "Sélections réinitialisées")
    }
  }

  // 🔄 AUTO SAVE FEATURED ITEMS (debounced)
  useEffect(() => {
    if (!onSaveFeatured) return
    if (featuredItems.length === 0) return

    const serialized = JSON.stringify(featuredItems)

    if (isFirstAutoSave.current) {
      isFirstAutoSave.current = false
      lastSavedRef.current = serialized
      return
    }

    if (lastSavedRef.current === serialized) return

    const timeout = setTimeout(async () => {
      try {
        await onSaveFeatured(featuredItems)
        lastSavedRef.current = serialized
        showToast("success", "Sélections enregistrées automatiquement")
      } catch {
        showToast("error", "Erreur lors de l'enregistrement automatique")
      }
    }, 1000)

    return () => clearTimeout(timeout)
  }, [featuredItems])

  return (
    <div style={{ height: "100vh", display: "flex", background: "#f0f2f8", fontFamily: "'DM Sans','Inter',sans-serif", overflow: "hidden" }}>

      {/* Left panel */}
      <div style={{ width: 420, minWidth: 420, background: "#fff", borderRight: "1px solid #e8ecf3", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "24px 22px 16px", borderBottom: "1px solid #f1f5f9" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#94a3b8", marginBottom: 2 }}>Selection</p>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", margin: 0 }}>Vedettes</h1>
            </div>
            <div style={{ background: "linear-gradient(135deg,var(--accent,#6366f1),#818cf8)", color: "#fff", borderRadius: 12, padding: "6px 16px", fontSize: 16, fontWeight: 800 }}>{featuredItems.length}/{maxItems * 2}</div>
          </div>

          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            <button
              onClick={() => setActiveTab('courses')}
              style={{ flex: 1, padding: "8px 10px", borderRadius: 10, border: activeTab === 'courses' ? "1.5px solid rgba(99,102,241,0.3)" : "1.5px solid #e2e8f0", background: activeTab === 'courses' ? "rgba(99,102,241,0.08)" : "#fff", color: activeTab === 'courses' ? "var(--accent,#6366f1)" : "#64748b", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <BookOpen style={{ width: 14, height: 14 }} /> Formations
              </div>
            </button>
            <button
              onClick={() => setActiveTab('bootcamps')}
              style={{ flex: 1, padding: "8px 10px", borderRadius: 10, border: activeTab === 'bootcamps' ? "1.5px solid rgba(99,102,241,0.3)" : "1.5px solid #e2e8f0", background: activeTab === 'bootcamps' ? "rgba(99,102,241,0.08)" : "#fff", color: activeTab === 'bootcamps' ? "var(--accent,#6366f1)" : "#64748b", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <Layers style={{ width: 14, height: 14 }} /> Bootcamps
              </div>
            </button>
          </div>

          <div style={{ position: "relative" }}>
            <Search style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 15, height: 15, color: "#94a3b8" }} />
            <input
              type="text"
              placeholder={`Rechercher ${activeTab === 'courses' ? 'une formation' : 'un bootcamp'}...`}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ width: "100%", padding: "9px 12px 9px 36px", background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 13, outline: "none", boxSizing: "border-box", color: "#0f172a", fontFamily: "inherit" }}
              onFocus={e => { e.currentTarget.style.borderColor = "var(--accent,#6366f1)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.1)" }}
              onBlur={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.boxShadow = "none" }}
            />
          </div>
          <p style={{ fontSize: 11, color: "#94a3b8", margin: "8px 0 0" }}>Cliquez sur un element pour l'ajouter ou le retirer des vedettes.</p>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "12px" }}>
          {getAvailableItems().length === 0 ? (
            <div style={{ padding: "48px 24px", textAlign: "center" }}>
              <BookOpen style={{ width: 40, height: 40, color: "#cbd5e1", margin: "0 auto 12px" }} />
              <p style={{ fontSize: 13, color: "#94a3b8" }}>
                {searchTerm
                  ? `${activeTab === 'courses' ? 'Aucune formation' : 'Aucun bootcamp'} trouve`
                  : `Tous les ${activeTab === 'courses' ? 'formations' : 'bootcamps'} sont selectionnes ou aucun disponible`}
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {getAvailableItems().map(item => (
                <div
                  key={item.id}
                  style={{
                    border: isItemFeatured(item.id) ? "1.5px solid rgba(99,102,241,0.35)" : "1px solid #e8ecf3",
                    borderRadius: 14,
                    padding: 12,
                    background: isItemFeatured(item.id) ? "rgba(99,102,241,0.06)" : "#fff",
                    cursor: "pointer",
                    transition: "all 0.15s"
                  }}
                  onClick={() => handleToggleFeatured(item)}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</div>
                      <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.shortDescription}</div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
                        <span style={{ fontSize: 11, color: "#64748b" }}>{item.durationLabel}</span>
                        <span style={{ fontSize: 11, color: "#64748b", display: "flex", alignItems: "center", gap: 4 }}>
                          <Star style={{ width: 11, height: 11, color: "#f59e0b" }} /> {item.rating.toFixed(1)}
                        </span>
                      </div>
                    </div>
                    {isItemFeatured(item.id) && (
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--accent,#6366f1)", background: "rgba(99,102,241,0.12)", padding: "4px 8px", borderRadius: 999 }}>
                        #{getFeaturedOrder(item.id)}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleToggleFeatured(item) }}
                    disabled={!isItemFeatured(item.id) && featuredItems.filter(i => i.type === (activeTab === 'courses' ? 'course' : 'bootcamp')).length >= maxItems}
                    style={{
                      marginTop: 10,
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: 10,
                      border: isItemFeatured(item.id) ? "1.5px solid rgba(244,63,94,0.2)" : "1.5px dashed #e2e8f0",
                      background: isItemFeatured(item.id) ? "rgba(244,63,94,0.08)" : "transparent",
                      color: isItemFeatured(item.id) ? "#e11d48" : "var(--accent,#6366f1)",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: (!isItemFeatured(item.id) && featuredItems.filter(i => i.type === (activeTab === 'courses' ? 'course' : 'bootcamp')).length >= maxItems) ? "not-allowed" : "pointer",
                      opacity: (!isItemFeatured(item.id) && featuredItems.filter(i => i.type === (activeTab === 'courses' ? 'course' : 'bootcamp')).length >= maxItems) ? 0.6 : 1
                    }}
                  >
                    {isItemFeatured(item.id) ? "Retirer des vedettes" : "+ Ajouter aux vedettes"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right panel */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ background: "#fff", borderBottom: "1px solid #e8ecf3", padding: "14px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#94a3b8", margin: 0 }}>Selection</p>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: "2px 0 0" }}>Elements selectionnes</h2>
          </div>
          <div style={{ padding: "6px 10px", background: "rgba(99,102,241,0.1)", color: "var(--accent,#6366f1)", borderRadius: 999, fontSize: 12, fontWeight: 600 }}>
            {featuredItems.length} sur {maxItems * 2}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "28px" }}>
          <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", flexDirection: "column", gap: 28 }}>

            <FormCard
              title="Instructions"
              icon={<Award style={{ width: 16, height: 16 }} />}
            >
              <p style={{ margin: 0, fontSize: 13, color: "#475569" }}>
                Selectionnez jusqu'a {maxItems} formations et {maxItems} bootcamps. L'ordre d'affichage depend de l'ordre ici.
              </p>
            </FormCard>

            {fullFeaturedItems.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 24px" }}>
                <TrendingUp style={{ width: 56, height: 56, color: "#cbd5e1", margin: "0 auto 12px" }} />
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: "0 0 6px" }}>Aucun element selectionne</h3>
                <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>Ajoutez des elements depuis la colonne de gauche.</p>
              </div>
            ) : (
              <>
                {fullFeaturedItems.filter(item => item.type === 'course').length > 0 && (
                  <FormCard
                    title="Formations vedettes"
                    icon={<BookOpen style={{ width: 16, height: 16 }} />}
                    action={<span style={{ fontSize: 12, color: "#94a3b8" }}>{fullFeaturedItems.filter(item => item.type === 'course').length}/{maxItems}</span>}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {fullFeaturedItems
                        .filter(item => item.type === 'course')
                        .sort((a, b) => a.order - b.order)
                        .map(item => (
                          <div key={item.itemId} style={{ border: "1px solid #e8ecf3", borderRadius: 12, padding: 12, background: "#fff" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div style={{ width: 30, height: 30, borderRadius: 999, background: "rgba(99,102,241,0.12)", color: "var(--accent,#6366f1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>{item.order}</div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</div>
                                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.description}</div>
                                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
                                  <span style={{ fontSize: 11, color: "#64748b" }}>{item.durationLabel}</span>
                                  <span style={{ fontSize: 11, color: "#64748b", display: "flex", alignItems: "center", gap: 4 }}><Star style={{ width: 11, height: 11, color: "#f59e0b" }} /> {item.rating.toFixed(1)}</span>
                                </div>
                              </div>
                              <div style={{ display: "flex", gap: 4 }}>
                                <IconBtn onClick={() => handleMoveItem(item.itemId, 'up')} disabled={item.order === 1} title="Monter"><ArrowUp style={{ width: 14, height: 14 }} /></IconBtn>
                                <IconBtn onClick={() => handleMoveItem(item.itemId, 'down')} disabled={item.order === fullFeaturedItems.length} title="Descendre"><ArrowDown style={{ width: 14, height: 14 }} /></IconBtn>
                                <IconBtn onClick={() => handleRemoveFeatured(item.itemId)} color="#f43f5e" hoverBg="rgba(244,63,94,0.08)" title="Retirer"><Trash2 style={{ width: 14, height: 14 }} /></IconBtn>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </FormCard>
                )}

                {fullFeaturedItems.filter(item => item.type === 'bootcamp').length > 0 && (
                  <FormCard
                    title="Bootcamps vedettes"
                    icon={<Layers style={{ width: 16, height: 16 }} />}
                    action={<span style={{ fontSize: 12, color: "#94a3b8" }}>{fullFeaturedItems.filter(item => item.type === 'bootcamp').length}/{maxItems}</span>}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {fullFeaturedItems
                        .filter(item => item.type === 'bootcamp')
                        .sort((a, b) => a.order - b.order)
                        .map(item => (
                          <div key={item.itemId} style={{ border: "1px solid #e8ecf3", borderRadius: 12, padding: 12, background: "#fff" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div style={{ width: 30, height: 30, borderRadius: 999, background: "rgba(99,102,241,0.12)", color: "var(--accent,#6366f1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>{item.order}</div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</div>
                                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.description}</div>
                                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
                                  <span style={{ fontSize: 11, color: "#64748b" }}>{item.durationLabel}</span>
                                  <span style={{ fontSize: 11, color: "#64748b", display: "flex", alignItems: "center", gap: 4 }}><Star style={{ width: 11, height: 11, color: "#f59e0b" }} /> {item.rating.toFixed(1)}</span>
                                </div>
                              </div>
                              <div style={{ display: "flex", gap: 4 }}>
                                <IconBtn onClick={() => handleMoveItem(item.itemId, 'up')} disabled={item.order === 1} title="Monter"><ArrowUp style={{ width: 14, height: 14 }} /></IconBtn>
                                <IconBtn onClick={() => handleMoveItem(item.itemId, 'down')} disabled={item.order === fullFeaturedItems.length} title="Descendre"><ArrowDown style={{ width: 14, height: 14 }} /></IconBtn>
                                <IconBtn onClick={() => handleRemoveFeatured(item.itemId)} color="#f43f5e" hoverBg="rgba(244,63,94,0.08)" title="Retirer"><Trash2 style={{ width: 14, height: 14 }} /></IconBtn>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </FormCard>
                )}
              </>
            )}
          </div>
        </div>
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
        ::-webkit-scrollbar{width:5px;height:5px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:#e2e8f0;border-radius:99px}
        ::-webkit-scrollbar-thumb:hover{background:#cbd5e1}
      `}</style>
    </div>
  )

}
