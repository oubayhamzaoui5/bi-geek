"use client"

import { useRef, useState } from "react"
import { Camera, Save, UserRound, User } from "lucide-react"

type ProfileForm = {
  username: string
  firstName: string
  lastName: string
  email: string
  phone?: string          // E.164 +216XXXXXXXX
  birthDate: string       // ISO "YYYY-MM-DD"
}

const DEFAULT_DATA: ProfileForm = {
  username: "sami.benali",
  firstName: "Sami",
  lastName: "Ben Ali",
  email: "sami@example.com",
  phone: "+216 55 555 555",
  birthDate: "1999-04-15",
}

export default function ProfileCard() {
  const [data, setData] = useState<ProfileForm>(DEFAULT_DATA)
  const [avatar, setAvatar] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<null | "ok" | "err">(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const getInitialLocal = () => {
    const digits = (DEFAULT_DATA.phone ?? "").replace(/\D/g, "")
    return digits.slice(-8)
  }
  const [phoneLocal, setPhoneLocal] = useState(getInitialLocal())

  const onPickAvatar = () => inputRef.current?.click()
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setAvatar(url)
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSaved(null)
    try {
      const fullPhone = phoneLocal.length === 8 ? `+216${phoneLocal}` : data.phone
      setData(prev => ({ ...prev, phone: fullPhone }))
      await new Promise(r => setTimeout(r, 900))
      setSaved("ok")
    } catch {
      setSaved("err")
    } finally {
      setSaving(false)
    }
  }

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
          <span className="text-xs px-2 py-1 rounded bg-destructive/10 text-destructive border border-destructive/20">Erreur</span>
        )}
      </div>

      {/* Avatar */}
      <div className="flex items-center gap-4 mb-5">
        <div className="relative">
          <div className="w-20 h-20 rounded-lg overflow-hidden border border-border bg-muted/30">
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatar}
                alt="Avatar"
                className="w-full h-full object-cover"
                onError={() => setAvatar(null)}
              />
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
            aria-label="Changer l’avatar"
          >
            <Camera size={14} />
          </button>

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onFile}
          />
        </div>

        <div className="text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Photo de profil</p>
          <p>PNG/JPG, carré recommandé (≥ 256×256)</p>
        </div>
      </div>

      {/* Username (read-only) */}
      <div className="mb-4">
        <Input
          label="Nom d'utilisateur"
          value={data.username}
          onChange={() => {}}
          disabled
          readOnly
          className="sm:col-span-2"
        />
      </div>

      {/* Names (read-only), Email, Phone TN, Birthdate */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Prénom" value={data.firstName} onChange={() => {}} disabled readOnly />
        <Input label="Nom" value={data.lastName} onChange={() => {}} disabled readOnly />

        <Input
          label="Email"
          type="email"
          value={data.email}
          onChange={v => setData({ ...data, email: v })}
          className="sm:col-span-2"
        />

        <PhoneTNInput
          label="Téléphone"
          localValue={phoneLocal}
          onChangeLocal={setPhoneLocal}
          className="sm:col-span-2"
        />
      </div>

      <div className="mt-4">
        <Input
          label="Date de naissance"
          type="date"
          value={data.birthDate}
          onChange={() => {}}
          disabled
          readOnly
          className="sm:col-span-2"
        />
      </div>

      <div className="mt-5 flex justify-end">
        <button
          type="submit"
          disabled={saving || phoneLocal.length !== 8}
          className="px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-colors disabled:opacity-50 flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Save size={16} />
          {saving ? "Enregistrement..." : "Enregistrer"}
        </button>
      </div>
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
        onChange={e => onChange(e.target.value)}
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
    const onlyDigits = v.replace(/\D/g, "").slice(0, 8)
    onChangeLocal(onlyDigits)
  }

  const isValid = localValue.length === 8

  return (
    <div className={className}>
      <label className="block text-xs text-muted-foreground mb-1">{label}</label>
      <div className="flex items-stretch gap-1">
        {/* Prefix box */}
        <div className="flex items-center gap-2 px-2 rounded-lg bg-background border border-border">
          <span role="img" aria-label="Drapeau de la Tunisie" className="text-xl">🇹🇳</span>
          <span className="text-sm text-foreground/80 select-none">+216</span>
        </div>

        {/* Local 8-digit input */}
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
