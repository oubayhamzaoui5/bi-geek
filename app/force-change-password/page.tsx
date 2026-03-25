"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { KeyRound, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react"

export default function ForceChangePasswordPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [role, setRole] = useState<string>("student")
  const [next, setNext] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showNext, setShowNext] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const raw = localStorage.getItem("user")
    if (!raw) {
      router.replace("/login")
      return
    }
    const user = JSON.parse(raw)
    // If password already set, skip this page
    if (user.usePassword === true) {
      if (user.role === "admin") router.replace("/admin-dashboard")
      else if (user.role === "instructor") router.replace("/instructor-dashboard")
      else router.replace("/student-dashboard")
      return
    }
    setUserId(user.id)
    setRole(user.role ?? "student")
  }, [router])

  const strength = useMemo(() => {
    let s = 0
    if (next.length >= 8) s++
    if (/[A-Z]/.test(next)) s++
    if (/[a-z]/.test(next)) s++
    if (/\d/.test(next)) s++
    return Math.min(s, 4)
  }, [next])

  const match = next && confirm && next === confirm

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return
    if (!match) { setError("Les mots de passe ne correspondent pas."); return }
    if (strength < 2) { setError("Mot de passe trop faible."); return }

    setSaving(true)
    setError(null)

    try {
      const res = await fetch("/api/student/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          newPassword: next,
          newPasswordConfirm: confirm,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error ?? "Erreur.")

      // Mark password as set in localStorage
      const raw = localStorage.getItem("user")
      if (raw) {
        const u = JSON.parse(raw)
        localStorage.setItem("user", JSON.stringify({ ...u, usePassword: true }))
      }

      if (role === "admin") router.replace("/admin-dashboard")
      else if (role === "instructor") router.replace("/instructor-dashboard")
      else router.replace("/student-dashboard")
    } catch (err: any) {
      setError(err?.message ?? "Erreur serveur.")
      setSaving(false)
    }
  }

  const barWidth = ["0%", "25%", "50%", "75%", "100%"][strength]
  const barColor = [
    "bg-muted",
    "bg-red-500",
    "bg-yellow-500",
    "bg-green-400",
    "bg-green-500",
  ][strength]

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-lg p-8 space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="w-12 h-12 rounded-full bg-accent/15 flex items-center justify-center">
            <KeyRound className="text-accent" size={22} />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Créez votre mot de passe</h1>
          <p className="text-sm text-muted-foreground">
            Pour des raisons de sécurité, vous devez définir un mot de passe personnel avant de continuer.
          </p>
        </div>

        {error && (
          <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* New password */}
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Nouveau mot de passe</label>
            <div className="relative">
              <input
                type={showNext ? "text" : "password"}
                value={next}
                onChange={(e) => setNext(e.target.value)}
                autoComplete="new-password"
                className="w-full border border-border rounded-lg px-3 py-2.5 pr-10 text-sm bg-background text-foreground focus:ring-2 focus:ring-accent outline-none transition"
              />
              <button
                type="button"
                onClick={() => setShowNext((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showNext ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Strength bar */}
            {next.length > 0 && (
              <div className="mt-2 space-y-1">
                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full ${barColor} transition-all duration-300`}
                    style={{ width: barWidth }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Au moins 8 caractères, majuscules, minuscules et chiffres.
                </p>
              </div>
            )}
          </div>

          {/* Confirm password */}
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Confirmer le mot de passe</label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                className="w-full border border-border rounded-lg px-3 py-2.5 pr-10 text-sm bg-background text-foreground focus:ring-2 focus:ring-accent outline-none transition"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {confirm.length > 0 && !match && (
              <p className="text-xs text-destructive mt-1">Les mots de passe ne correspondent pas.</p>
            )}
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
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

          <button
            type="submit"
            disabled={!match || strength < 2 || saving}
            className="w-full bg-accent text-accent-foreground rounded-lg py-2.5 text-sm font-medium hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            {saving ? "Enregistrement…" : "Définir mon mot de passe"}
          </button>
        </form>
      </div>
    </div>
  )
}
