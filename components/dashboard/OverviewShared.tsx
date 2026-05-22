"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

type Tone = "blue" | "amber" | "violet" | "green" | "indigo" | "rose"

type KpiCardProps = {
  icon: React.ElementType
  label: string
  value: number | string
  href: string
  iconBg: string
  iconColor: string
  badge?: string
  badgeColor?: string
  badgeBg?: string
  sublabel?: string
  dot?: string
}

type QuickActionItem = {
  icon: React.ElementType
  label: string
  hint: string
  href: string
  tone: Tone
}

const QUICK_BTN_STYLES: Record<
  Tone,
  { iconBg: string; iconColor: string; borderHover: string; shadowHover: string }
> = {
  blue: { iconBg: "#3b82f6", iconColor: "#fff", borderHover: "rgba(59,130,246,0.32)", shadowHover: "0 8px 20px rgba(37,99,235,0.12)" },
  amber: { iconBg: "#f59e0b", iconColor: "#fff", borderHover: "rgba(245,158,11,0.34)", shadowHover: "0 8px 20px rgba(217,119,6,0.12)" },
  violet: { iconBg: "#8b5cf6", iconColor: "#fff", borderHover: "rgba(139,92,246,0.34)", shadowHover: "0 8px 20px rgba(124,58,237,0.12)" },
  green: { iconBg: "#22c55e", iconColor: "#fff", borderHover: "rgba(34,197,94,0.34)", shadowHover: "0 8px 20px rgba(22,163,74,0.12)" },
  indigo: { iconBg: "#6366f1", iconColor: "#fff", borderHover: "rgba(99,102,241,0.34)", shadowHover: "0 8px 20px rgba(79,70,229,0.12)" },
  rose: { iconBg: "#f43f5e", iconColor: "#fff", borderHover: "rgba(244,63,94,0.34)", shadowHover: "0 8px 20px rgba(225,29,72,0.12)" },
}

export function KpiCard({ icon: Icon, label, value, href, iconBg, iconColor, badge, badgeColor, badgeBg, sublabel, dot }: KpiCardProps) {
  const [hover, setHover] = useState(false)
  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          background: "#fff", borderRadius: 16, border: `1px solid ${hover ? "#e2e8f0" : "#f1f5f9"}`,
          padding: "18px 20px", display: "flex", flexDirection: "column",
          gap: 0, cursor: "pointer", transition: "all 0.15s",
          boxShadow: hover ? "0 6px 20px rgba(0,0,0,0.07)" : "0 1px 3px rgba(0,0,0,0.04)",
          minHeight: 110,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ width: 42, height: 42, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", background: iconBg, color: iconColor, flexShrink: 0 }}>
            <Icon size={19} strokeWidth={1.8} />
          </div>
          {badge && (
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: "0.05em",
              padding: "3px 8px", borderRadius: 99,
              background: badgeBg || "#e2e8f0", color: badgeColor || "#475569",
            }}>{badge}</span>
          )}
          {dot && !badge && (
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: dot, marginTop: 4, display: "block" }} />
          )}
        </div>
        <p style={{ fontSize: 10, fontWeight: 700, color: "#475569", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</p>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <p style={{ fontSize: 26, fontWeight: 700, color: "#0f172a", margin: 0, lineHeight: 1, fontFamily: "var(--ff-display,'DM Sans')" }}>{value}</p>
          {sublabel && <span style={{ fontSize: 12, color: "#475569", fontWeight: 500 }}>{sublabel}</span>}
        </div>
      </div>
    </Link>
  )
}

export function QuickBtn({ icon: Icon, label, hint, href, tone }: QuickActionItem) {
  const [hover, setHover] = useState(false)
  const style = QUICK_BTN_STYLES[tone]

  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
          padding: "14px 12px", borderRadius: 12, minHeight: 78,
          border: `1.5px solid ${hover ? style.borderHover : "#e2e8f0"}`,
          background: hover ? "#ffffff" : "#f8fafc",
          boxShadow: hover ? style.shadowHover : "none",
          cursor: "pointer",
          transition: "all 0.18s ease",
          transform: hover ? "translateY(-1px)" : "translateY(0)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: style.iconBg,
            color: style.iconColor,
            transition: "all 0.18s ease",
          }}>
            <Icon size={15} strokeWidth={2} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 12, lineHeight: 1.15, fontWeight: 700, color: "#0f172a", margin: 0 }}>{label}</p>
            <p style={{
              fontSize: 11, lineHeight: 1.2, color: "#475569", margin: "4px 0 0",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {hint}
            </p>
          </div>
        </div>
        <ArrowRight size={14} color={hover ? "#334155" : "#475569"} style={{ flexShrink: 0, transition: "color 0.18s ease" }} />
      </div>
    </Link>
  )
}

export function SectionCard({
  title,
  icon: Icon,
  href,
  hrefLabel = "Voir",
  children,
}: {
  title: string
  icon: React.ElementType
  href?: string
  hrefLabel?: string
  children: React.ReactNode
}) {
  return (
    <div style={{ background: "#fff", borderRadius: 16, border: "1.5px solid #f1f5f9", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.03)" }}>
      <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(180deg,#fafbfd 0%,#fff 100%)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--accent,#6366f1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
            <Icon size={13} strokeWidth={2} />
          </div>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", margin: 0 }}>{title}</h2>
        </div>
        {href ? (
          <Link href={href} style={{ textDecoration: "none" }}>
            <span style={{ fontSize: 11, color: "var(--accent,#6366f1)", fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}>
              {hrefLabel} <ArrowRight size={11} />
            </span>
          </Link>
        ) : null}
      </div>
      {children}
    </div>
  )
}

