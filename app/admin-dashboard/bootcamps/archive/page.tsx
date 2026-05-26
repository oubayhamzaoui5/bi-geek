"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AdminPageHeader } from "@/components/admin/AdminPageHeader"
import LoadingBI from "@/components/LoadingBI"
import { Layers, RotateCcw, Trash2, CheckCircle, AlertCircle, X, ArrowLeft } from "lucide-react"

type ToastType = "success" | "error"
type Toast = { id: string; type: ToastType; message: string; createdAt: number }

const DURATION = 4500

export default function ArchivedBootcampsPage() {
  const router = useRouter()
  const [bootcamps, setBootcamps] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = (type: ToastType, message: string) => {
    const id = `t_${Date.now()}`
    setToasts(prev => [...prev, { id, type, message, createdAt: Date.now() }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), DURATION)
  }
  const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id))

  useEffect(() => {
    const iv = setInterval(() => {
      const now = Date.now()
      setToasts(prev => prev.filter(t => now - t.createdAt < DURATION))
    }, 100)
    return () => clearInterval(iv)
  }, [])

  useEffect(() => {
    fetch("/api/admin/bootcamps?archived=true")
      .then(r => r.json())
      .then(d => { if (d.bootcamps) setBootcamps(d.bootcamps) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleRestore = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/bootcamps/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore" }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setBootcamps(prev => prev.filter(b => b.id !== id))
      showToast("success", "Bootcamp restauré.")
    } catch (err: any) {
      showToast("error", err.message || "Erreur lors de la restauration")
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer définitivement ce bootcamp ? Cette action est irréversible.")) return
    try {
      const res = await fetch(`/api/admin/bootcamps/${id}?permanent=true`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setBootcamps(prev => prev.filter(b => b.id !== id))
      showToast("success", "Bootcamp supprimé définitivement.")
    } catch (err: any) {
      showToast("error", err.message || "Erreur lors de la suppression")
    }
  }

  if (loading) return <LoadingBI />

  return (
    <div style={{ minHeight: "100vh", background: "#fafafa", fontFamily: "'DM Sans','Inter',sans-serif" }}>

      {/* Toasts */}
      <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 9999, display: "flex", flexDirection: "column", gap: 10 }}>
        {toasts.map(toast => {
          const ok = toast.type === "success"
          const progress = Math.max(0, 100 - ((Date.now() - toast.createdAt) / DURATION) * 100)
          return (
            <div key={toast.id} style={{ position: "relative", overflow: "hidden", background: ok ? "#f0fdf4" : "#fff1f2", border: `1px solid ${ok ? "#bbf7d0" : "#fecdd3"}`, borderRadius: 14, boxShadow: "0 8px 24px rgba(0,0,0,0.1)", minWidth: 280, maxWidth: 360 }}>
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

      <AdminPageHeader
        title="Archives — Bootcamps"
        description="Bootcamps archivés — restaurez ou supprimez définitivement"
        breadcrumbs={[{ label: "Bootcamps", href: "/admin-dashboard/bootcamps" }, { label: "Archives" }]}
        actions={
          <button
            onClick={() => router.push("/admin-dashboard/bootcamps")}
            style={{ padding: "9px 20px", background: "#f8fafc", color: "#475569", border: "1.5px solid #e8ecf3", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
            onMouseEnter={e => { e.currentTarget.style.background = "#f1f5f9" }}
            onMouseLeave={e => { e.currentTarget.style.background = "#f8fafc" }}
          >
            <ArrowLeft style={{ width: 15, height: 15 }} /> Retour
          </button>
        }
      />

      <div style={{ background: "#fff", overflow: "hidden" }}>
        {bootcamps.length === 0 ? (
          <div style={{ padding: "64px 24px", textAlign: "center" }}>
            <Layers style={{ width: 40, height: 40, color: "#e2e8f0", margin: "0 auto 12px" }} />
            <p style={{ fontSize: 15, fontWeight: 600, color: "#475569", margin: "0 0 4px" }}>Aucun bootcamp archivé</p>
            <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>Les bootcamps archivés apparaîtront ici.</p>
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 180px 150px", padding: "18px 36px", borderBottom: "1px solid #f1f5f9", background: "#fafbfd" }}>
              {["Bootcamp", "Tags", "Actions"].map(h => (
                <span key={h} style={{ fontSize: 13, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</span>
              ))}
            </div>
            {bootcamps.map((bootcamp, idx) => (
              <div key={bootcamp.id}
                style={{ display: "grid", gridTemplateColumns: "1fr 180px 150px", padding: "32px 36px", borderBottom: idx < bootcamps.length - 1 ? "1px solid #f1f5f9" : "none", alignItems: "center", transition: "background 0.15s", opacity: 0.85 }}
                onMouseEnter={e => (e.currentTarget.style.background = "#fafbfd")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <div style={{ minWidth: 0, paddingRight: 24 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 20 }}>
                    {bootcamp.coverImage ? (
                      <img
                        src={`${process.env.NEXT_PUBLIC_PB_URL}/api/files/bootcamps/${bootcamp.id}/${bootcamp.coverImage}`}
                        style={{ width: 320, height: 180, borderRadius: 4, objectFit: "cover", flexShrink: 0, border: "1px solid #f1f5f9", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" }}
                        alt=""
                      />
                    ) : (
                      <div style={{ width: 320, height: 180, borderRadius: 4, background: "rgba(99,102,241,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Layers style={{ width: 30, height: 30, color: "var(--accent,#6366f1)" }} />
                      </div>
                    )}
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 17, fontWeight: 700, color: "#0f172a", margin: "0 0 6px" }}>{bootcamp.title}</p>
                      <p style={{ fontSize: 14, color: "#475569", margin: 0 }}>{bootcamp.shortDescription}</p>
                      <p style={{ fontSize: 12, color: "#94a3b8", margin: "6px 0 0" }}>{bootcamp.durationLabel} · {bootcamp.prerequis}</p>
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignContent: "flex-start" }}>
                  {(bootcamp.tags ?? []).slice(0, 4).map((tag: string) => (
                    <span key={tag} style={{ fontSize: 13, padding: "5px 13px", borderRadius: 8, background: "rgba(99,102,241,0.08)", color: "var(--accent,#6366f1)", fontWeight: 600 }}>{tag}</span>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <IconBtn onClick={() => handleRestore(bootcamp.id)} color="#22c55e" hoverBg="rgba(34,197,94,0.08)" title="Restaurer">
                    <RotateCcw style={{ width: 20, height: 20 }} />
                  </IconBtn>
                  <IconBtn onClick={() => handleDelete(bootcamp.id)} color="#f43f5e" hoverBg="rgba(244,63,94,0.08)" title="Supprimer définitivement">
                    <Trash2 style={{ width: 20, height: 20 }} />
                  </IconBtn>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}

function IconBtn({ onClick, color, hoverBg, title, children }: { onClick: () => void; color: string; hoverBg?: string; title?: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 38, height: 38, borderRadius: 10, border: "none", background: "transparent", color, cursor: "pointer", transition: "background 0.15s" }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = hoverBg ?? "rgba(0,0,0,0.06)" }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent" }}
    >
      {children}
    </button>
  )
}
