"use client"

import React, { useRef, useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, ChevronRight, Video, Maximize, ExternalLink } from "lucide-react"

export type BreadcrumbItem = { label: string; href?: string }

function getDriveEmbedUrl(url: string): string | null {
  if (!url) return null
  const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/)
  if (m) return `https://drive.google.com/file/d/${m[1]}/preview`
  return null
}

export default function VideoViewerCanvas({
  url,
  title,
  breadcrumbs,
}: {
  url: string
  title: string
  breadcrumbs: BreadcrumbItem[]
}) {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const embedUrl = getDriveEmbedUrl(url)

  useEffect(() => {
    function onFullscreenChange() {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener("fullscreenchange", onFullscreenChange)
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange)
  }, [])

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {})
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {})
      }
    }
  }

  return (
    <div
      ref={containerRef}
      style={{
        minHeight: "100vh", height: "100%",
        background: "#fafafa",
        display: "flex", flexDirection: "column",
        fontFamily: "var(--ff-body,'DM Sans',sans-serif)",
      }}
    >
      {/* ── Breadcrumb ── */}
      {!isFullscreen && (
        <div style={{
          background: "#fff",
          borderBottom: "1px solid #e8ecf3",
          padding: "10px 24px",
          display: "flex", alignItems: "center", gap: 12,
          flexWrap: "wrap",
        }}>
          <button
            onClick={() => router.back()}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 28, height: 28, borderRadius: 6,
              border: "1px solid #e2e8f0", background: "#fff",
              cursor: "pointer", color: "#4b5563", transition: "all 0.12s",
            }}
            title="Retour"
            onMouseEnter={e => { e.currentTarget.style.background = "#f1f5f9" }}
            onMouseLeave={e => { e.currentTarget.style.background = "#fff" }}
          >
            <ArrowLeft size={14} />
          </button>
          <div style={{ width: 1, height: 14, background: "#e2e8f0" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 0, flexWrap: "wrap" }}>
            {breadcrumbs.map((b, i) => (
              <span key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                {i > 0 && <ChevronRight size={11} style={{ color: "#9ca3af", margin: "0 2px" }} />}
                {b.href ? (
                  <Link href={b.href} style={{ fontSize: 12, color: "#4b5563", textDecoration: "none" }}>
                    {b.label}
                  </Link>
                ) : (
                  <span style={{
                    fontSize: 12,
                    fontWeight: i === breadcrumbs.length - 1 ? 700 : 400,
                    color: i === breadcrumbs.length - 1 ? "#111827" : "#4b5563",
                  }}>
                    {b.label}
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Toolbar ── */}
      {!isFullscreen && (
        <div style={{
          background: "#fff",
          borderBottom: "1px solid #e8ecf3",
          padding: "0 20px",
          height: 54,
          display: "flex", alignItems: "center", gap: 12,
          position: "sticky", top: 0, zIndex: 10,
          boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        }}>
          {/* Left: icon + filename */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: "1 1 0", minWidth: 0 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 9,
              background: "color-mix(in oklch, var(--accent) 8%, white)", border: "1.5px solid color-mix(in oklch, var(--accent) 20%, white)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <Video size={16} color="var(--accent)" />
            </div>
            <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "var(--ff-display,'Syne',sans-serif)" }}>
                {title}
              </span>
            </div>
          </div>
          {/* Right */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
             {url && (
                <a href={url} target="_blank" rel="noopener noreferrer" style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "6px 12px", borderRadius: 7, border: "1px solid #e2e8f0",
                  background: "#fff", color: "#374151", fontSize: 12, fontWeight: 600,
                  textDecoration: "none", transition: "all 0.12s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "#f8fafc" }}
                onMouseLeave={e => { e.currentTarget.style.background = "#fff" }}>
                  <ExternalLink size={14} /> Ouvrir Drive
                </a>
              )}
             <button onClick={toggleFullscreen} style={{
                width: 30, height: 30, borderRadius: 7, border: "1px solid #e2e8f0",
                background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                color: "#374151", transition: "all 0.12s"
             }} title="Plein écran">
                <Maximize size={14} />
             </button>
          </div>
        </div>
      )}

      {/* ── Viewer ── */}
      <div style={{ flex: 1, position: "relative", background: isFullscreen ? "#000" : "#fafafa", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {embedUrl ? (
            <iframe src={embedUrl} style={{ width: "100%", height: "100%", border: "none", maxHeight: isFullscreen ? "100vh" : "calc(100vh - 100px)" }} allow="autoplay" allowFullScreen />
          ) : (
            <span style={{ color: "#9ca3af", fontWeight: 500 }}>Lien Google Drive manquant ou invalide</span>
          )}
      </div>
    </div>
  )
}
