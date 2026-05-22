"use client"

import { useEffect, useRef, useState, useMemo } from "react"
import {
  UserRound, KeyRound, Camera, Save, User, Loader2,
  Eye, EyeOff, ShieldCheck,
} from "lucide-react"
import { SectionCard } from "@/components/dashboard/OverviewShared"
import { AdminPageHeader } from "@/components/admin/AdminPageHeader"
import { useSetDashboardLoading } from "@/components/dashboard-loading-context"

/* ─── Types ──────────────────────────────────────────────────────── */
type ProfileForm = { username: string; name: string; surname: string; email: string; phone: string }

/* ─── Helpers ────────────────────────────────────────────────────── */
function getUserId(): string {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem("user") : null
    return raw ? (JSON.parse(raw)?.id ?? "") : ""
  } catch { return "" }
}
function toLocal(phone: string) { return phone.replace(/\D/g, "").slice(-8) }

/* ─── Input field ────────────────────────────────────────────────── */
function Field({
  label, value, onChange, type = "text", disabled = false, readOnly = false,
}: {
  label: string; value: string; onChange: (v: string) => void
  type?: string; disabled?: boolean; readOnly?: boolean
}) {
  const [focused, setFocused] = useState(false)
  return (
    <div>
      <p style={{ fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 5px" }}>{label}</p>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        readOnly={readOnly}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: "100%", boxSizing: "border-box",
          background: disabled || readOnly ? "#fafbfd" : "#fff",
          border: `1.5px solid ${focused ? "rgba(99,102,241,0.38)" : "#e2e8f0"}`,
          borderRadius: 8, padding: "7px 10px", fontSize: 13,
          color: disabled || readOnly ? "#94a3b8" : "#0f172a",
          fontWeight: 500, outline: "none",
          boxShadow: focused ? "0 0 0 3px rgba(99,102,241,0.07)" : "none",
          transition: "border-color 0.15s, box-shadow 0.15s",
          cursor: disabled || readOnly ? "not-allowed" : "text",
        }}
      />
    </div>
  )
}

/* ─── Tunisian phone field ───────────────────────────────────────── */
function PhoneField({ localValue, onChange }: { localValue: string; onChange: (v: string) => void }) {
  const [focused, setFocused] = useState(false)
  const valid = localValue.length === 8
  return (
    <div>
      <p style={{ fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 5px" }}>Téléphone</p>
      <div style={{ display: "flex", alignItems: "stretch", gap: 6 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 6, padding: "7px 10px",
          background: "#fafbfd", border: "1.5px solid #e2e8f0", borderRadius: 8, flexShrink: 0,
        }}>
          <span role="img" aria-label="Tunisie" style={{ fontSize: 16, lineHeight: 1 }}>🇹🇳</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>+216</span>
        </div>
        <input
          inputMode="numeric"
          maxLength={8}
          value={localValue}
          onChange={e => onChange(e.target.value.replace(/\D/g, "").slice(0, 8))}
          placeholder="XXXXXXXX"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            flex: 1, boxSizing: "border-box",
            background: "#fff",
            border: `1.5px solid ${focused ? "rgba(99,102,241,0.38)" : "#e2e8f0"}`,
            borderRadius: 8, padding: "7px 10px", fontSize: 13,
            color: "#0f172a", fontWeight: 500, outline: "none",
            boxShadow: focused ? "0 0 0 3px rgba(99,102,241,0.07)" : "none",
            transition: "border-color 0.15s, box-shadow 0.15s",
          }}
        />
      </div>
      <p style={{ fontSize: 11, color: valid ? "#475569" : "#94a3b8", margin: "4px 0 0" }}>
        {valid ? `Format enregistré : +216${localValue}` : "Entrez les 8 chiffres du numéro tunisien."}
      </p>
    </div>
  )
}

/* ─── Password field ─────────────────────────────────────────────── */
function PwdField({
  label, value, onChange, shown, onToggle, autoComplete = "new-password",
}: {
  label: string; value: string; onChange: (v: string) => void
  shown: boolean; onToggle: () => void; autoComplete?: string
}) {
  const [focused, setFocused] = useState(false)
  return (
    <div>
      <p style={{ fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 5px" }}>{label}</p>
      <div style={{ position: "relative" }}>
        <input
          type={shown ? "text" : "password"}
          value={value}
          onChange={e => onChange(e.target.value)}
          autoComplete={autoComplete}
          autoCorrect="off"
          spellCheck={false}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: "100%", boxSizing: "border-box",
            background: "#fff",
            border: `1.5px solid ${focused ? "rgba(99,102,241,0.38)" : "#e2e8f0"}`,
            borderRadius: 8, padding: "7px 36px 7px 10px", fontSize: 13,
            color: "#0f172a", fontWeight: 500, outline: "none",
            boxShadow: focused ? "0 0 0 3px rgba(99,102,241,0.07)" : "none",
            transition: "border-color 0.15s, box-shadow 0.15s",
          }}
        />
        <button
          type="button"
          onClick={onToggle}
          style={{
            position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
            background: "none", border: "none", padding: 0, cursor: "pointer",
            color: "#94a3b8", display: "flex", alignItems: "center",
          }}
          aria-label={shown ? "Masquer" : "Afficher"}
        >
          {shown ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    </div>
  )
}

/* ─── Row wrapper ────────────────────────────────────────────────── */
function Row({ children, last = false }: { children: React.ReactNode; last?: boolean }) {
  return (
    <div style={{ padding: "14px 20px", borderBottom: last ? "none" : "1px solid #f8fafc" }}>
      {children}
    </div>
  )
}

/* ─── Row with two fields ────────────────────────────────────────── */
function TwoColRow({ left, right, last = false }: { left: React.ReactNode; right: React.ReactNode; last?: boolean }) {
  return (
    <div style={{ padding: "14px 20px", borderBottom: last ? "none" : "1px solid #f8fafc", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      {left}
      {right}
    </div>
  )
}

/* ─── Save button ────────────────────────────────────────────────── */
function SaveBtn({ loading, disabled, label = "Enregistrer", loadingLabel = "Enregistrement…" }: {
  loading: boolean; disabled: boolean; label?: string; loadingLabel?: string
}) {
  const [hov, setHov] = useState(false)
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "7px 14px", borderRadius: 8,
        background: loading || disabled ? "#e2e8f0" : hov ? "#4f46e5" : "var(--accent,#6366f1)",
        color: loading || disabled ? "#94a3b8" : "#fff",
        border: "none", fontSize: 12, fontWeight: 700,
        cursor: loading || disabled ? "not-allowed" : "pointer",
        transition: "background 0.15s",
      }}
    >
      {loading ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
      {loading ? loadingLabel : label}
    </button>
  )
}

/* ─── Inline status badge ────────────────────────────────────────── */
function StatusBadge({ status, msg }: { status: "ok" | "err" | null; msg?: string }) {
  if (!status) return null
  const ok = status === "ok"
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 6,
      background: ok ? "rgba(22,163,74,0.08)" : "rgba(239,68,68,0.08)",
      color: ok ? "#16a34a" : "#dc2626",
      border: `1px solid ${ok ? "rgba(22,163,74,0.2)" : "rgba(239,68,68,0.2)"}`,
      maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
    }}>
      {ok ? "Enregistré ✓" : (msg || "Erreur")}
    </span>
  )
}

/* ─── Profile section ────────────────────────────────────────────── */
function ProfileSection({ profileApiPath, onLoaded }: { profileApiPath: string; onLoaded?: () => void }) {
  const [userId, setUserId] = useState("")
  const [data, setData] = useState<ProfileForm>({ username: "", name: "", surname: "", email: "", phone: "" })
  const [phoneLocal, setPhoneLocal] = useState("")
  const [avatar, setAvatar] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<"ok" | "err" | null>(null)
  const [errorMsg, setErrorMsg] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const id = getUserId()
    setUserId(id)
    if (!id) { setLoading(false); onLoaded?.(); return }
    ;(async () => {
      try {
        const res = await fetch(`${profileApiPath}?userId=${encodeURIComponent(id)}`)
        if (!res.ok) throw new Error()
        const u = await res.json()
        setData({ username: u.username ?? "", name: u.name ?? "", surname: u.surname ?? "", email: u.email ?? "", phone: u.phone ?? "" })
        setPhoneLocal(toLocal(u.phone ?? ""))
        setAvatar(typeof u.avatar === "string" && u.avatar.trim() ? u.avatar : null)
      } catch { /* silently fall through */ }
      finally { setLoading(false); onLoaded?.() }
    })()
  }, [profileApiPath])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return
    setSaving(true); setSaved(null); setErrorMsg("")
    try {
      const fullPhone = phoneLocal.length === 8 ? `+216${phoneLocal}` : data.phone
      const res = await fetch(profileApiPath, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userId, email: data.email, phone: fullPhone }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error ?? "Erreur.")
      setData(prev => ({ ...prev, phone: fullPhone }))
      try {
        const raw = localStorage.getItem("user")
        if (raw) localStorage.setItem("user", JSON.stringify({ ...JSON.parse(raw), email: data.email }))
      } catch {}
      setSaved("ok")
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Erreur serveur.")
      setSaved("err")
    } finally { setSaving(false) }
  }

  const SkeletonRow = () => (
    <Row>
      <div style={{ height: 10, width: 80, background: "#f1f5f9", borderRadius: 4, marginBottom: 8 }} />
      <div style={{ height: 34, background: "#f1f5f9", borderRadius: 8 }} />
    </Row>
  )

  return (
    <form onSubmit={onSubmit}>
      <SectionCard title="Profil" icon={UserRound}>
        {loading ? (
          <>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid #f8fafc", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 60, height: 60, borderRadius: 12, background: "#f1f5f9" }} />
              <div style={{ flex: 1 }}>
                <div style={{ height: 12, width: 100, background: "#f1f5f9", borderRadius: 4, marginBottom: 6 }} />
                <div style={{ height: 10, width: 160, background: "#f1f5f9", borderRadius: 4 }} />
              </div>
            </div>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </>
        ) : (
          <>
            {/* Avatar row */}
            <Row>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <div style={{
                    width: 60, height: 60, borderRadius: 12, overflow: "hidden",
                    border: "1.5px solid #f1f5f9", background: "#f8fafc",
                  }}>
                    {avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatar} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={() => setAvatar(null)} />
                    ) : (
                      <div style={{
                        width: "100%", height: "100%",
                        background: "linear-gradient(135deg, rgba(99,102,241,0.75) 0%, rgba(139,92,246,0.75) 100%)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <User size={22} color="#fff" strokeWidth={1.8} />
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    style={{
                      position: "absolute", bottom: -6, right: -6,
                      width: 22, height: 22, borderRadius: 6,
                      background: "var(--accent,#6366f1)", border: "2px solid #fff",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: "pointer", boxShadow: "0 2px 6px rgba(99,102,241,0.30)",
                    }}
                    aria-label="Changer la photo"
                  >
                    <Camera size={11} color="#fff" />
                  </button>
                  <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) setAvatar(URL.createObjectURL(f)) }} />
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", margin: 0 }}>Photo de profil</p>
                  <p style={{ fontSize: 11, color: "#475569", margin: "2px 0 0" }}>PNG/JPG, carré recommandé (≥ 256×256)</p>
                </div>
              </div>
            </Row>

            {/* Username (read-only) */}
            <Row>
              <Field label="Nom d'utilisateur" value={data.username} onChange={() => {}} disabled readOnly />
            </Row>

            {/* Prénom + Nom (read-only) */}
            <TwoColRow
              left={<Field label="Prénom" value={data.name} onChange={() => {}} disabled readOnly />}
              right={<Field label="Nom" value={data.surname} onChange={() => {}} disabled readOnly />}
            />

            {/* Email (editable) */}
            <Row>
              <Field label="Email" type="email" value={data.email} onChange={v => setData(prev => ({ ...prev, email: v }))} />
            </Row>

            {/* Phone (editable) */}
            <Row>
              <PhoneField localValue={phoneLocal} onChange={setPhoneLocal} />
            </Row>

            {/* Action row */}
            <div style={{ padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, borderTop: "1px solid #f8fafc" }}>
              <StatusBadge status={saved} msg={errorMsg} />
              <SaveBtn loading={saving} disabled={phoneLocal.length !== 8} />
            </div>
          </>
        )}
      </SectionCard>
    </form>
  )
}

/* ─── Security section ───────────────────────────────────────────── */
function SecuritySection({ passwordApiPath }: { passwordApiPath: string }) {
  const [show, setShow] = useState({ current: false, next: false, confirm: false })
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [confirm, setConfirm] = useState("")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<"ok" | "err" | null>(null)
  const [errorMsg, setErrorMsg] = useState("")

  const strength = useMemo(() => {
    let s = 0
    if (next.length >= 8) s++
    if (/[A-Z]/.test(next)) s++
    if (/[a-z]/.test(next)) s++
    if (/\d/.test(next)) s++
    return Math.min(s, 4)
  }, [next])

  const match = next.length > 0 && confirm.length > 0 && next === confirm

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setSaved(null); setErrorMsg("")
    const userId = getUserId()
    if (!userId) {
      setErrorMsg("Session expirée."); setSaved("err"); setSaving(false); return
    }
    try {
      const res = await fetch(passwordApiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, currentPassword: current, newPassword: next, newPasswordConfirm: confirm }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error ?? "Erreur.")
      try {
        const raw = localStorage.getItem("user")
        if (raw) localStorage.setItem("user", JSON.stringify({ ...JSON.parse(raw), usePassword: true }))
      } catch {}
      setSaved("ok"); setCurrent(""); setNext(""); setConfirm("")
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Erreur serveur."); setSaved("err")
    } finally { setSaving(false) }
  }

  const barColors = ["#e2e8f0", "#ef4444", "#f59e0b", "#22c55e", "var(--accent,#6366f1)"]
  const barLabels = ["", "Faible", "Moyen", "Fort", "Très fort"]

  return (
    <form onSubmit={onSubmit}>
      <SectionCard title="Sécurité & Mot de passe" icon={KeyRound}>
        {/* Current password */}
        <Row>
          <PwdField
            label="Mot de passe actuel"
            value={current}
            onChange={setCurrent}
            shown={show.current}
            onToggle={() => setShow(s => ({ ...s, current: !s.current }))}
            autoComplete="current-password"
          />
        </Row>

        {/* New password */}
        <Row>
          <PwdField
            label="Nouveau mot de passe"
            value={next}
            onChange={setNext}
            shown={show.next}
            onToggle={() => setShow(s => ({ ...s, next: !s.next }))}
          />
          {/* Strength meter */}
          {next.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ display: "flex", gap: 3, marginBottom: 4 }}>
                {[1, 2, 3, 4].map(i => (
                  <div key={i} style={{
                    flex: 1, height: 3, borderRadius: 99,
                    background: i <= strength ? barColors[strength] : "#f1f5f9",
                    transition: "background 0.2s",
                  }} />
                ))}
              </div>
              <p style={{ fontSize: 10, fontWeight: 700, color: strength >= 3 ? "#16a34a" : strength >= 2 ? "#d97706" : "#ef4444", margin: 0, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {barLabels[strength]}
              </p>
            </div>
          )}
        </Row>

        {/* Confirm password */}
        <Row>
          <PwdField
            label="Confirmer le nouveau mot de passe"
            value={confirm}
            onChange={setConfirm}
            shown={show.confirm}
            onToggle={() => setShow(s => ({ ...s, confirm: !s.confirm }))}
          />
          {confirm.length > 0 && !match && (
            <p style={{ fontSize: 11, fontWeight: 600, color: "#ef4444", margin: "6px 0 0" }}>La confirmation ne correspond pas.</p>
          )}
        </Row>

        {/* Status hint */}
        <Row last>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <ShieldCheck size={14} color={match && strength >= 3 ? "var(--accent,#6366f1)" : "#94a3b8"} />
            <p style={{ fontSize: 12, color: "#475569", margin: 0 }}>
              {match && strength >= 3
                ? "Mot de passe fort et confirmé"
                : "Utilisez ≥ 8 caractères avec majuscules, minuscules et chiffres"}
            </p>
          </div>
        </Row>

        {/* Action row */}
        <div style={{ padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, borderTop: "1px solid #f8fafc" }}>
          <StatusBadge status={saved} msg={errorMsg} />
          <SaveBtn
            loading={saving}
            disabled={!match || strength < 2 || !current}
            label="Mettre à jour"
            loadingLabel="Mise à jour…"
          />
        </div>
      </SectionCard>
    </form>
  )
}

/* ─── Main export ────────────────────────────────────────────────── */
export default function DashboardSettings({
  profileApiPath,
  passwordApiPath,
  roleLabel = "Compte",
  overviewHref,
}: {
  profileApiPath: string
  passwordApiPath: string
  roleLabel?: string
  overviewHref?: string
}) {
  const [userName, setUserName] = useState("")
  const [profileLoading, setProfileLoading] = useState(true)
  useSetDashboardLoading(profileLoading)

  useEffect(() => {
    try {
      const raw = localStorage.getItem("user")
      const u = raw ? JSON.parse(raw) : null
      if (u) setUserName(u.username?.trim() || u.email?.split("@")?.[0]?.trim() || "")
    } catch {}
  }, [])

  const description = userName
    ? `${userName} — ${roleLabel} · Gérez votre profil et la sécurité de votre compte`
    : `${roleLabel} · Gérez votre profil et la sécurité de votre compte`

  return (
    <div style={{ background: "#fafafa", minHeight: "100vh", fontFamily: "'DM Sans','Inter',sans-serif" }}>

      <AdminPageHeader
        title="Paramètres"
        description={description}
        breadcrumbs={[{ label: "Paramètres" }]}
        overviewHref={overviewHref}
      />

      {/* ── Two-column grid ── */}
      <div style={{ padding: "24px 32px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
        <ProfileSection profileApiPath={profileApiPath} onLoaded={() => setProfileLoading(false)} />
        <SecuritySection passwordApiPath={passwordApiPath} />
      </div>

    </div>
  )
}
