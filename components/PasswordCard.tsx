"use client"

import { useMemo, useState } from "react"
import { KeyRound, ShieldCheck, Eye, EyeOff } from "lucide-react"

/* ---------- Stable subcomponent (outside to avoid remount/focus loss) ---------- */
type InputProps = {
  label: string
  value: string
  onChange: (v: string) => void
  shown: boolean
  toggle: () => void
  autoComplete?: string
  testId?: string
}

function PasswordInput({
  label,
  value,
  onChange,
  shown,
  toggle,
  autoComplete = "new-password",
  testId,
}: InputProps) {
  return (
    <div>
      <label className="block text-xs text-muted-foreground mb-1">{label}</label>
      <div className="relative">
        <input
          data-testid={testId}
          type={shown ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          autoCorrect="off"
          spellCheck={false}
          className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 pr-10 text-sm text-foreground placeholder:text-muted-foreground
                     focus:border-ring focus:ring-2 focus:ring-ring outline-none transition"
        />
        <button
          type="button"
          onClick={toggle}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label={shown ? "Masquer" : "Afficher"}
        >
          {shown ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  )
}

/* --------------------------------- Main card --------------------------------- */

export default function PasswordCard() {
  const [show, setShow] = useState({ current: false, next: false, confirm: false })
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [confirm, setConfirm] = useState("")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<null | "ok" | "err">(null)

  // Symbols NOT required: length + upper + lower + digit (max 4)
  const strength = useMemo(() => {
    let s = 0
    if (next.length >= 8) s++
    if (/[A-Z]/.test(next)) s++
    if (/[a-z]/.test(next)) s++
    if (/\d/.test(next)) s++
    return Math.min(s, 4)
  }, [next])

  const match = next && confirm && next === confirm

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSaved(null)
    try {
      // TODO: call your API route to change password
      await new Promise((r) => setTimeout(r, 900))
      setSaved("ok")
      setCurrent("")
      setNext("")
      setConfirm("")
    } catch {
      setSaved("err")
    } finally {
      setSaving(false)
    }
  }

  const barWidth = ["0%", "25%", "50%", "75%", "100%"][strength]
  const barColor = [
    "bg-muted",
    "bg-red-500/80",
    "bg-yellow-500/80",
    "bg-green-500/80",
    "bg-accent",
  ][strength]

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-xl border border-border bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/80 shadow-md p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <KeyRound className="text-accent" size={20} />
          Sécurité & Mot de passe
        </h3>
        {saved === "ok" && (
          <span className="text-xs px-2 py-1 rounded bg-accent text-accent-foreground">Mis à jour ✓</span>
        )}
        {saved === "err" && (
          <span className="text-xs px-2 py-1 rounded bg-destructive/10 text-destructive border border-destructive/20">
            Erreur
          </span>
        )}
      </div>

      <div className="space-y-4">
        <PasswordInput
          label="Mot de passe actuel"
          value={current}
          onChange={setCurrent}
          shown={show.current}
          toggle={() => setShow((s) => ({ ...s, current: !s.current }))}
          autoComplete="current-password"
          testId="pwd-current"
        />

        <PasswordInput
          label="Nouveau mot de passe"
          value={next}
          onChange={setNext}
          shown={show.next}
          toggle={() => setShow((s) => ({ ...s, next: !s.next }))}
          autoComplete="new-password"
          testId="pwd-next"
        />

        {/* Strength meter (appears smoothly when typing) */}
        <div
          className={`transition-all duration-500 ease-out overflow-hidden ${
            next.length > 0 ? "opacity-100 max-h-10 translate-y-0" : "opacity-0 max-h-0 translate-y-1"
          }`}
        >
          <div className="space-y-1 mt-1">
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full ${barColor} transition-all duration-300 ease-in-out`}
                style={{ width: barWidth }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Utilisez au moins 8 caractères, avec lettres majuscules/minuscules et chiffres.
            </p>
          </div>
        </div>

        <PasswordInput
          label="Confirmer le nouveau mot de passe"
          value={confirm}
          onChange={setConfirm}
          shown={show.confirm}
          toggle={() => setShow((s) => ({ ...s, confirm: !s.confirm }))}
          autoComplete="new-password"
          testId="pwd-confirm"
        />

        {!match && confirm.length > 0 && (
          <p className="text-xs text-destructive -mt-2">La confirmation ne correspond pas.</p>
        )}

        <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
          <ShieldCheck
            size={16}
            className={match && strength >= 3 ? "text-accent" : "text-muted-foreground"}
          />
          <span>
            {match && strength >= 3
              ? "Mot de passe fort et confirmé"
              : "Assurez-vous de confirmer et renforcer le mot de passe"}
          </span>
        </div>
      </div>

      <div className="mt-5 flex justify-end">
        <button
          type="submit"
          disabled={!match || strength < 2 || saving}
          className="px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {saving ? "Mise à jour..." : "Mettre à jour"}
        </button>
      </div>
    </form>
  )
}
