"use client"

import { useState } from "react"

export default function GroupKpiCard({
  icon: Icon, label, value, iconBg, iconColor,
}: {
  icon: React.ElementType
  label: string
  value: number | string
  iconBg: string
  iconColor: string
}) {
  const [hover, setHover] = useState(false)
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: "#fff",
        borderRadius: 16,
        border: `1px solid ${hover ? "#e2e8f0" : "#f1f5f9"}`,
        padding: "18px 20px",
        display: "flex",
        flexDirection: "column",
        cursor: "default",
        transition: "all 0.15s",
        boxShadow: hover ? "0 6px 20px rgba(0,0,0,0.07)" : "0 1px 3px rgba(0,0,0,0.04)",
        minHeight: 110,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ width: 42, height: 42, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", background: iconBg, color: iconColor, flexShrink: 0 }}>
          <Icon size={19} strokeWidth={1.8} />
        </div>
      </div>
      <p style={{ fontSize: 10, fontWeight: 700, color: "#475569", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {label}
      </p>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <p style={{ fontSize: 26, fontWeight: 700, color: "#0f172a", margin: 0, lineHeight: 1, fontFamily: "var(--ff-display,'DM Sans')" }}>
          {value}
        </p>
      </div>
    </div>
  )
}
