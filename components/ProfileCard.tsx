"use client"

import { useEffect, useRef, useState } from "react"
import { Camera, Save, UserRound, User, Loader2 } from "lucide-react"

type ProfileForm = {
  username: string
  name: string
  surname: string
  email: string
  phone: string
}

function getUserId(): string {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem("user") : null
    return raw ? (JSON.parse(raw)?.id ?? "") : ""
  } catch {
    return ""
  }
}

export default function ProfileCard() {
  const [userId, setUserId] = useState("")
  const [data, setData] = useState<ProfileForm>({
    username: "",
    name: "",
    surname: "",
    email: "",
    phone: "",
  })
  const [avatar, setAvatar] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<null | "ok" | "err">(null)
  const [errorMsg, setErrorMsg] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  // Parse 8-digit local part from full phone string like +21655555555
  const toLocal = (phone: string) => phone.replace(/\D/g, "").slice(-8)
  const [phoneLocal, setPhoneLocal] = useState("")

  // ── Load user data from API ──────────────────────────────────────────────
  useEffect(() => {
    const id = getUserId()
    setUserId(id)
    if (!id) {
      setLoading(false)
      return
    }

    ;(async () => {
      try {
        const res = await fetch(`/api/student/profile?userId=${encodeURIComponent(id)}`)
        if (!res.ok) throw new Error("fetch failed")
        const u = await res.json()
        setData({
          username: u.username ?? "",
          name: u.name ?? "",
          surname: u.surname ?? "",
          email: u.email ?? "",
          phone: u.phone ?? "",
        })
        setPhoneLocal(toLocal(u.phone ?? ""))
      } catch {
        // silently fall through – form stays empty
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const onPickAvatar = () => inputRef.current?.click()

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatar(URL.createObjectURL(file))
  }

  // ── Save profile ─────────────────────────────────────────────────────────
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return
    setSaving(true)
    setSaved(null)
    setErrorMsg("")
    try {
      const fullPhone = phoneLocal.length === 8 ? `+216${phoneLocal}` : data.phone
      const res = await fetch("/api/student/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userId, email: data.email, phone: fullPhone }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error ?? "Erreur.")
      setData((prev) => ({ ...prev, phone: fullPhone }))

      // Update localStorage user object with the new email
      try {
        const raw = localStorage.getItem("user")
        if (raw) {
          const u = JSON.parse(raw)
          localStorage.setItem("user", JSON.stringify({ ...u, email: data.email }))
        }
      } catch {}

      setSaved("ok")
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Erreur serveur.")
      setSaved("err")
    } finally {
      setSaving(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <form
      onSubmit={onSubmit}
      className="rounded-xl border border-border bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/80 shadow-md p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <UserRound className="text-accent" size={20} />
          Profil
        </h3>
        {saved === "ok" && (
          <span className="text-xs px-2 py-1 rounded bg-accent text-accent-foreground">Enregistré ✓</span>
        )}
        {saved === "err" && (
          <span className="text-xs px-2 py-1 rounded bg-destructive/10 text-destructive border border-destructive/20 max-w-[200px] truncate">
            {errorMsg || "Erreur"}
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
          <Loader2 size={20} className="animate-spin" />
          <span className="text-sm">Chargement…</span>
        </div>
      ) : (
        <>
          {/* Avatar */}
          <div className="flex items-center gap-4 mb-5">
            <div className="relative">
              <div className="w-20 h-20 rounded-lg overflow-hidden border border-border bg-muted/30">
                {avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatar} alt="Avatar" className="w-full h-full object-cover" onError={() => setAvatar(null)} />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-accent to-accent/60 flex items-center justify-center">
                    <User size={24} className="text-accent-foreground" />
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={onPickAvatar}
                className="absolute -bottom-2 -right-2 bg-accent text-accent-foreground rounded-lg p-2 hover:opacity-90 transition"
                aria-label="Changer l'avatar"
              >
                <Camera size={14} />
              </button>
              <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
            </div>
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Photo de profil</p>
              <p>PNG/JPG, carré recommandé (≥ 256×256)</p>
            </div>
          </div>

          {/* Username (read-only) */}
          <div className="mb-4">
            <Input label="Nom d'utilisateur" value={data.username} onChange={() => {}} disabled readOnly className="sm:col-span-2" />
          </div>

          {/* Names (read-only), Email, Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Prénom" value={data.name} onChange={() => {}} disabled readOnly />
            <Input label="Nom" value={data.surname} onChange={() => {}} disabled readOnly />

            <Input
              label="Email"
              type="email"
              value={data.email}
              onChange={(v) => setData({ ...data, email: v })}
              className="sm:col-span-2"
            />

            <PhoneTNInput
              label="Téléphone"
              localValue={phoneLocal}
              onChangeLocal={setPhoneLocal}
              className="sm:col-span-2"
            />
          </div>

          <div className="mt-5 flex justify-end">
            <button
              type="submit"
              disabled={saving || phoneLocal.length !== 8}
              className="px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-colors disabled:opacity-50 flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </>
      )}
    </form>
  )
}

/* -------------------- UI Primitives -------------------- */

function Input({
  label,
  type = "text",
  value,
  onChange,
  className = "",
  disabled = false,
  readOnly = false,
}: {
  label: string
  type?: string
  value: string
  onChange: (v: string) => void
  className?: string
  disabled?: boolean
  readOnly?: boolean
}) {
  return (
    <div className={className}>
      <label className="block text-xs text-muted-foreground mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        readOnly={readOnly}
        className={`w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition
          focus:border-ring focus:ring-2 focus:ring-ring
          disabled:opacity-60 disabled:cursor-not-allowed`}
      />
    </div>
  )
}

/** Tunisian phone input with 🇹🇳 flag, locked +216 prefix, and 8-digit local part */
function PhoneTNInput({
  label,
  localValue,
  onChangeLocal,
  className = "",
}: {
  label: string
  localValue: string
  onChangeLocal: (v: string) => void
  className?: string
}) {
  const handleChange = (v: string) => {
    onChangeLocal(v.replace(/\D/g, "").slice(0, 8))
  }
  const isValid = localValue.length === 8

  return (
    <div className={className}>
      <label className="block text-xs text-muted-foreground mb-1">{label}</label>
      <div className="flex items-stretch gap-1">
        <div className="flex items-center gap-2 px-2 rounded-lg bg-background border border-border">
          <span role="img" aria-label="Drapeau de la Tunisie" className="text-xl">🇹🇳</span>
          <span className="text-sm text-foreground/80 select-none">+216</span>
        </div>
        <input
          inputMode="numeric"
          pattern="\d{8}"
          maxLength={8}
          value={localValue}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="XXXXXXXX"
          className="flex-1 bg-background border border-border rounded-lg px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground
                     focus:border-ring focus:ring-2 focus:ring-ring outline-none"
          aria-invalid={!isValid}
          aria-describedby="phone-help"
        />
      </div>
      <div id="phone-help" className="mt-1 text-xs">
        {!isValid ? (
          <span className="text-muted-foreground">Entrez les 8 chiffres du numéro tunisien.</span>
        ) : (
          <span className="text-muted-foreground/80">Format enregistré&nbsp;: +216{localValue}</span>
        )}
      </div>
    </div>
  )
}
