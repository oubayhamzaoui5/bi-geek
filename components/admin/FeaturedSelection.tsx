"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import {
  Search, Trash2, X, BookOpen,
  Star, CheckCircle, AlertCircle, Layers, Plus
} from "lucide-react"
import { AdminPageHeader } from "@/components/admin/AdminPageHeader"

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
  type: "course" | "bootcamp"
  order: number
}

type ToastType = "success" | "error" | "loading"
type Toast = { id: string; type: ToastType; message: string; duration: number; createdAt: number }

type FeaturedSelectionProps = {
  initialFeatured?: FeaturedItem[]
  courses: AdminCourse[]
  bootcamps: AdminBootcamp[]
  onSaveFeatured?: (items: FeaturedItem[]) => Promise<void>
  maxItems?: number
}

export default function FeaturedSelection({
  initialFeatured = [],
  courses,
  bootcamps,
  onSaveFeatured,
  maxItems = 3,
}: FeaturedSelectionProps) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const isFirstAutoSave = useRef(true)
  const lastSavedRef = useRef<string>("")

  const [featuredItems, setFeaturedItems] = useState<FeaturedItem[]>(initialFeatured)
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState<"courses" | "bootcamps">("courses")

  const showToast = (type: ToastType, message: string, duration = 4500) => {
    const id = `toast_${Date.now()}_${Math.random()}`
    setToasts(prev => [...prev, { id, type, message, duration, createdAt: Date.now() }])
    if (type !== "loading") setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration)
    return id
  }
  const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id))

  useEffect(() => {
    const iv = setInterval(() => {
      const now = Date.now()
      setToasts(prev => prev.filter(t => t.type === "loading" || now - t.createdAt < t.duration))
    }, 100)
    return () => clearInterval(iv)
  }, [])

  const isItemFeatured = (id: string) => featuredItems.some(i => i.itemId === id)
  const getFeaturedOrder = (id: string) => featuredItems.find(i => i.itemId === id)?.order ?? null

  const availableItems = useMemo(() => {
    const list = activeTab === "courses"
      ? courses.filter(c => c.isPublished ?? true)
      : bootcamps.filter(b => b.isPublished ?? true)
    const q = searchTerm.toLowerCase()
    return q
      ? list.filter(i => i.title.toLowerCase().includes(q) || i.shortDescription.toLowerCase().includes(q))
      : list
  }, [activeTab, courses, bootcamps, searchTerm])

  const handleAdd = (item: AdminCourse | AdminBootcamp) => {
    if (featuredItems.length >= maxItems) {
      showToast("error", `Maximum ${maxItems} elements au total`)
      return
    }
    const type: FeaturedItem["type"] = activeTab === "courses" ? "course" : "bootcamp"
    setFeaturedItems(prev =>
      [...prev, { itemId: item.id, type, order: prev.length + 1 }].map((x, i) => ({ ...x, order: i + 1 }))
    )
  }

  const handleRemove = (itemId: string) => {
    setFeaturedItems(prev =>
      prev.filter(i => i.itemId !== itemId).map((x, i) => ({ ...x, order: i + 1 }))
    )
  }

  const handleToggle = (item: AdminCourse | AdminBootcamp) => {
    isItemFeatured(item.id) ? handleRemove(item.id) : handleAdd(item)
  }

  useEffect(() => {
    if (!onSaveFeatured) return
    const serialized = JSON.stringify(featuredItems)
    if (isFirstAutoSave.current) { isFirstAutoSave.current = false; lastSavedRef.current = serialized; return }
    if (lastSavedRef.current === serialized) return
    const t = setTimeout(async () => {
      try {
        await onSaveFeatured(featuredItems)
        lastSavedRef.current = serialized
        showToast("success", "Enregistre automatiquement")
      } catch {
        showToast("error", "Erreur lors de l'enregistrement")
      }
    }, 1000)
    return () => clearTimeout(t)
  }, [featuredItems])

  const atLimit = featuredItems.length >= maxItems

  return (
    <div style={{ minHeight: "100vh", background: "#fafafa", fontFamily: "'DM Sans','Inter',sans-serif" }}>

      <AdminPageHeader
        title="Vedettes"
        description="Selectionnez jusqu'a 3 elements mis en avant sur la page d'accueil"
        breadcrumbs={[{ label: "Vedettes" }]}
        actions={
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 14px", background: atLimit ? "rgba(99,102,241,0.1)" : "#f1f5f9", borderRadius: 999 }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: atLimit ? "var(--accent,#6366f1)" : "#0f172a", letterSpacing: "-0.03em" }}>{featuredItems.length}</span>
            <span style={{ fontSize: 13, color: "#475569" }}>/ {maxItems}</span>
          </div>
        }
      />

      {/* Filter bar */}
      <div style={{ padding: "12px 32px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid #f1f5f9", background: "#fff" }}>
        <div style={{ display: "flex", background: "#f1f5f9", borderRadius: 10, padding: 3, gap: 2 }}>
          {(["courses", "bootcamps"] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: "6px 16px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
              background: activeTab === tab ? "#fff" : "transparent",
              color: activeTab === tab ? "var(--accent,#6366f1)" : "#475569",
              boxShadow: activeTab === tab ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              {tab === "courses" ? <BookOpen style={{ width: 13, height: 13 }} /> : <Layers style={{ width: 13, height: 13 }} />}
              {tab === "courses" ? "Formations" : "Bootcamps"}
            </button>
          ))}
        </div>

        <div style={{ position: "relative", flex: 1, maxWidth: 340 }}>
          <Search style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "#475569" }} />
          <input
            type="text"
            placeholder="Rechercher..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ width: "100%", padding: "7px 12px 7px 34px", background: "#f8fafc", border: "1.5px solid #e8ecf3", borderRadius: 9, fontSize: 13, outline: "none", boxSizing: "border-box", color: "#0f172a", fontFamily: "inherit" }}
            onFocus={e => { e.target.style.borderColor = "var(--accent,#6366f1)"; e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.08)" }}
            onBlur={e => { e.target.style.borderColor = "#e8ecf3"; e.target.style.boxShadow = "none" }}
          />
        </div>

        <div style={{ fontSize: 13, color: "#475569", marginLeft: "auto" }}>
          <span style={{ fontWeight: 600, color: "#0f172a" }}>{availableItems.length}</span>{" "}
          {activeTab === "courses" ? "formation" : "bootcamp"}{availableItems.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Column header */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 140px", padding: "12px 36px", borderBottom: "1px solid #f1f5f9", background: "#fff" }}>
        {["Element", "Action"].map(h => (
          <span key={h} style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</span>
        ))}
      </div>

      {/* List */}
      <div style={{ background: "#fff" }}>
        {availableItems.length === 0 ? (
          <div style={{ padding: "64px 24px", textAlign: "center" }}>
            {activeTab === "courses"
              ? <BookOpen style={{ width: 40, height: 40, color: "#e2e8f0", margin: "0 auto 12px" }} />
              : <Layers style={{ width: 40, height: 40, color: "#e2e8f0", margin: "0 auto 12px" }} />}
            <p style={{ fontSize: 15, fontWeight: 600, color: "#475569", margin: "0 0 4px" }}>Aucun element trouve</p>
            <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>
              {searchTerm ? "Essayez un autre terme de recherche." : "Aucun element publie disponible."}
            </p>
          </div>
        ) : availableItems.map((item, idx) => {
          const featured = isItemFeatured(item.id)
          const order = getFeaturedOrder(item.id)
          const disabled = atLimit && !featured
          const isBootcamp = activeTab === "bootcamps"
          const collection = isBootcamp ? "bootcamps" : "courses"
          const coverUrl = item.coverImage
            ? `${process.env.NEXT_PUBLIC_PB_URL}/api/files/${collection}/${item.id}/${item.coverImage}`
            : null

          return (
            <div
              key={item.id}
              style={{
                display: "grid", gridTemplateColumns: "1fr 140px",
                padding: "32px 36px",
                borderBottom: idx < availableItems.length - 1 ? "1px solid #f1f5f9" : "none",
                alignItems: "center",
                transition: "background 0.15s",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "#fafbfd")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              {/* Item — exact Groups row layout */}
              <div style={{ minWidth: 0, paddingRight: 24 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 20 }}>

                  {/* Cover image with featured badge */}
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    {coverUrl ? (
                      <img
                        src={coverUrl}
                        alt=""
                        style={{ width: 320, height: 180, borderRadius: 4, objectFit: "cover", display: "block", border: "1px solid #f1f5f9", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" }}
                      />
                    ) : (
                      <div style={{ width: 320, height: 180, borderRadius: 4, border: "1px solid #f1f5f9", background: isBootcamp ? "linear-gradient(135deg,rgba(99,102,241,0.12),rgba(129,140,248,0.06))" : "linear-gradient(135deg,rgba(59,130,246,0.10),rgba(99,102,241,0.06))", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {isBootcamp ? <Layers style={{ width: 30, height: 30, color: "var(--accent,#6366f1)" }} /> : <BookOpen style={{ width: 30, height: 30, color: "#3b82f6" }} />}
                      </div>
                    )}
                    {featured && (
                      <div style={{ position: "absolute", top: 8, left: 8 }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 6, background: "#fff", color: "var(--accent,#6366f1)", boxShadow: "0 1px 4px rgba(0,0,0,0.12)", letterSpacing: "0.04em" }}>
                          Vedette #{order}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Text */}
                  <div style={{ minWidth: 0 }}>
                    <span style={{ display: "inline-block", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", padding: "3px 10px", borderRadius: 6, marginBottom: 8, background: isBootcamp ? "rgba(99,102,241,0.08)" : "rgba(59,130,246,0.08)", color: isBootcamp ? "var(--accent,#6366f1)" : "#3b82f6" }}>
                      {isBootcamp ? "Bootcamp" : "Formation"}
                    </span>
                    <p style={{ fontSize: 17, fontWeight: 700, color: "#0f172a", margin: "0 0 6px", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                      {item.title}
                    </p>
                    <p style={{ fontSize: 14, color: "#475569", margin: "0 0 10px", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }}>
                      {item.shortDescription}
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>{item.durationLabel}</span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <Star style={{ width: 12, height: 12, color: "#f59e0b" }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>{item.rating.toFixed(1)}</span>
                      </span>
                    </div>
                  </div>

                </div>
              </div>

              {/* Action */}
              <div>
                <button
                  onClick={() => handleToggle(item)}
                  disabled={disabled}
                  style={{
                    padding: "8px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600,
                    cursor: disabled ? "not-allowed" : "pointer",
                    border: featured ? "1.5px solid rgba(244,63,94,0.25)" : "1.5px solid rgba(99,102,241,0.25)",
                    background: featured ? "rgba(244,63,94,0.07)" : "rgba(99,102,241,0.07)",
                    color: featured ? "#e11d48" : "var(--accent,#6366f1)",
                    opacity: disabled ? 0.4 : 1,
                    display: "flex", alignItems: "center", gap: 7, transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { if (!disabled) (e.currentTarget as HTMLButtonElement).style.background = featured ? "rgba(244,63,94,0.13)" : "rgba(99,102,241,0.13)" }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = featured ? "rgba(244,63,94,0.07)" : "rgba(99,102,241,0.07)" }}
                >
                  {featured
                    ? <><Trash2 style={{ width: 13, height: 13 }} /> Retirer</>
                    : <><Plus style={{ width: 13, height: 13 }} /> Ajouter</>
                  }
                </button>
              </div>
            </div>
          )
        })}
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
                <button onClick={() => removeToast(toast.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "#475569", display: "flex" }}><X style={{ width: 14, height: 14 }} /></button>
              </div>
              <div style={{ position: "absolute", bottom: 0, left: 0, height: 3, background: ok ? "#22c55e" : "#f43f5e", width: `${progress}%`, transition: "width 0.1s linear" }} />
            </div>
          )
        })}
      </div>

      <style>{`
        @keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
        ::-webkit-scrollbar{width:5px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:#e2e8f0;border-radius:99px}
        ::-webkit-scrollbar-thumb:hover{background:#cbd5e1}
      `}</style>
    </div>
  )
}
