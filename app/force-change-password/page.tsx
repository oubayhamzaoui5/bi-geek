"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Loader2, ShieldCheck, Lock, Check, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

export default function ForceChangePasswordPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [role, setRole] = useState("student")
  const [next, setNext] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showNext, setShowNext] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [focusedField, setFocusedField] = useState<"next" | "confirm" | null>(null)

  useEffect(() => {
    const raw = localStorage.getItem("user")
    if (!raw) { router.replace("/login"); return }
    const user = JSON.parse(raw)
    if (user.usePassword === true) {
      if (user.role === "admin" || user.role === "admin_agent") router.replace("/admin-dashboard")
      else if (user.role === "instructor") router.replace("/instructor-dashboard")
      else router.replace("/student-dashboard")
      return
    }
    setUserId(user.id)
    setRole(user.role ?? "student")
  }, [router])

  const rules = useMemo(() => [
    { label: "Au moins 8 caractères", ok: next.length >= 8 },
    { label: "Une lettre majuscule", ok: /[A-Z]/.test(next) },
    { label: "Une lettre minuscule", ok: /[a-z]/.test(next) },
    { label: "Un chiffre", ok: /\d/.test(next) },
  ], [next])

  const strength = rules.filter((r) => r.ok).length
  const match = next.length > 0 && confirm.length > 0 && next === confirm

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return
    if (!match) { setError("Les mots de passe ne correspondent pas."); return }
    if (strength < 2) { setError("Mot de passe trop faible."); return }
    setSaving(true); setError(null)
    try {
      const changePasswordEndpoint =
        role === "admin" || role === "admin_agent"
          ? "/api/admin/change-password"
          : role === "instructor"
            ? "/api/instructor/change-password"
            : "/api/student/change-password"

      const res = await fetch(changePasswordEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, newPassword: next, newPasswordConfirm: confirm, forceChange: true }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error ?? "Erreur.")
      const raw = localStorage.getItem("user")
      const refreshedUser = json?.user
      const nextUser = refreshedUser?.id
        ? refreshedUser
        : raw
        ? { ...JSON.parse(raw), usePassword: true }
        : null
      if (nextUser) localStorage.setItem("user", JSON.stringify(nextUser))

      const nextRole = nextUser?.role ?? role
      if (nextRole === "admin" || nextRole === "admin_agent") window.location.assign("/admin-dashboard")
      else if (nextRole === "instructor") window.location.assign("/instructor-dashboard")
      else window.location.assign("/student-dashboard")
    } catch (err: any) {
      setError(err?.message ?? "Erreur serveur.")
      setSaving(false)
    }
  }

  const strengthColors = [
    "var(--border)",
    "oklch(0.63 0.22 27)",
    "oklch(0.75 0.18 55)",
    "oklch(0.68 0.20 150)",
    "oklch(0.60 0.20 150)",
  ]
  const strengthLabels = ["", "Trop faible", "Faible", "Correct", "Fort"]

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden"
      style={{ background: "var(--background)", fontFamily: "var(--ff-body)" }}
    >
      {/* Background decoration */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 55% 45% at 90% 10%, oklch(0.68 0.28 308 / 0.10) 0%, transparent 65%),
            radial-gradient(ellipse 40% 50% at 5% 90%, oklch(0.68 0.28 308 / 0.08) 0%, transparent 60%)
          `,
        }}
      />

      {/* Faint grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage: `
            linear-gradient(oklch(0.68 0.28 308) 1px, transparent 1px),
            linear-gradient(90deg, oklch(0.68 0.28 308) 1px, transparent 1px)
          `,
          backgroundSize: "44px 44px",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-[400px] relative z-10"
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "20px",
          boxShadow: "0 24px 64px oklch(0 0 0 / 0.12), 0 0 0 1px oklch(0.68 0.28 308 / 0.08)",
          padding: "36px 32px",
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 mb-7">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-sm"
            style={{ background: "var(--accent)", fontFamily: "var(--ff-display)" }}
          >
            B
          </div>
          <span className="font-bold text-sm" style={{ fontFamily: "var(--ff-display)" }}>BI Geek</span>
        </div>

        {/* Icon + header */}
        <div className="flex items-start gap-4 mb-6">
          <div
            className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center"
            style={{
              background: "color-mix(in oklch, var(--accent) 12%, transparent)",
              border: "1px solid color-mix(in oklch, var(--accent) 20%, transparent)",
            }}
          >
            <Lock size={20} style={{ color: "var(--accent)" }} />
          </div>
          <div>
            <h1
              className="text-xl font-bold leading-tight"
              style={{ fontFamily: "var(--ff-display)", color: "var(--foreground)" }}
            >
              Créez votre mot de passe
            </h1>
            <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
              Pour des raisons de sécurité, définissez un mot de passe personnel avant de continuer.
            </p>
          </div>
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="flex items-center gap-2 text-xs px-3 py-2.5 rounded-xl mb-5"
              style={{
                color: "var(--destructive)",
                background: "color-mix(in oklch, var(--destructive) 8%, transparent)",
                border: "1px solid color-mix(in oklch, var(--destructive) 18%, transparent)",
              }}
            >
              <X size={13} className="shrink-0" />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* New password */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted-foreground)" }}>
              Nouveau mot de passe
            </label>
            <div
              className="relative flex items-center rounded-xl transition-all duration-200"
              style={{
                border: focusedField === "next" ? "1px solid var(--accent)" : "1px solid var(--border)",
                background: "var(--input)",
                boxShadow: focusedField === "next"
                  ? "0 0 0 3px color-mix(in oklch, var(--accent) 15%, transparent)"
                  : "none",
              }}
            >
              <input
                type={showNext ? "text" : "password"}
                value={next}
                onChange={(e) => setNext(e.target.value)}
                autoComplete="new-password"
                placeholder="••••••••"
                className="w-full px-4 py-2.5 pr-10 text-sm bg-transparent outline-none"
                style={{ color: "var(--foreground)" }}
                onFocus={() => setFocusedField("next")}
                onBlur={() => setFocusedField(null)}
              />
              <button
                type="button"
                onClick={() => setShowNext((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: "var(--muted-foreground)" }}
              >
                {showNext ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Strength bar */}
            {next.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2.5 space-y-2"
              >
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="h-1 flex-1 rounded-full transition-all duration-300"
                      style={{ background: i <= strength ? strengthColors[strength] : "var(--border)" }}
                    />
                  ))}
                  <span
                    className="text-[10px] font-medium ml-1 shrink-0"
                    style={{ color: strengthColors[strength] || "var(--muted-foreground)" }}
                  >
                    {strengthLabels[strength]}
                  </span>
                </div>

                {/* Rules checklist */}
                <div className="grid grid-cols-2 gap-1">
                  {rules.map((rule) => (
                    <div key={rule.label} className="flex items-center gap-1.5">
                      {rule.ok
                        ? <Check size={11} style={{ color: "oklch(0.60 0.20 150)" }} className="shrink-0" />
                        : <X size={11} style={{ color: "var(--muted-foreground)" }} className="shrink-0" />
                      }
                      <span
                        className="text-[10px] leading-none"
                        style={{ color: rule.ok ? "oklch(0.60 0.20 150)" : "var(--muted-foreground)" }}
                      >
                        {rule.label}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {/* Confirm password */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted-foreground)" }}>
              Confirmer le mot de passe
            </label>
            <div
              className="relative flex items-center rounded-xl transition-all duration-200"
              style={{
                border: confirm.length > 0 && !match
                  ? "1px solid var(--destructive)"
                  : focusedField === "confirm"
                  ? "1px solid var(--accent)"
                  : "1px solid var(--border)",
                background: "var(--input)",
                boxShadow: focusedField === "confirm"
                  ? `0 0 0 3px color-mix(in oklch, ${confirm.length > 0 && !match ? "var(--destructive)" : "var(--accent)"} 15%, transparent)`
                  : "none",
              }}
            >
              <input
                type={showConfirm ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                placeholder="••••••••"
                className="w-full px-4 py-2.5 pr-10 text-sm bg-transparent outline-none"
                style={{ color: "var(--foreground)" }}
                onFocus={() => setFocusedField("confirm")}
                onBlur={() => setFocusedField(null)}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: "var(--muted-foreground)" }}
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <AnimatePresence>
              {confirm.length > 0 && !match && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="text-[11px] mt-1.5 flex items-center gap-1"
                  style={{ color: "var(--destructive)" }}
                >
                  <X size={11} className="shrink-0" />
                  Les mots de passe ne correspondent pas.
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Status indicator */}
          <AnimatePresence>
            {match && strength >= 3 && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="flex items-center gap-2 text-xs px-3 py-2.5 rounded-xl"
                style={{
                  color: "oklch(0.55 0.18 150)",
                  background: "oklch(0.60 0.20 150 / 0.08)",
                  border: "1px solid oklch(0.60 0.20 150 / 0.2)",
                }}
              >
                <ShieldCheck size={14} className="shrink-0" />
                Mot de passe fort et confirmé — vous êtes prêt·e !
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit */}
          <motion.button
            type="submit"
            disabled={!match || strength < 2 || saving}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: "linear-gradient(135deg, oklch(0.70 0.30 300), oklch(0.66 0.28 316))",
              boxShadow: "0 4px 20px oklch(0.68 0.28 308 / 0.30)",
            }}
            whileHover={!saving && match && strength >= 2
              ? { scale: 1.015, boxShadow: "0 6px 26px oklch(0.68 0.28 308 / 0.42)" }
              : {}}
            whileTap={{ scale: 0.985 }}
          >
            {saving ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Enregistrement…
              </>
            ) : (
              <>
                <ShieldCheck size={15} />
                Définir mon mot de passe
              </>
            )}
          </motion.button>
        </form>
      </motion.div>
    </div>
  )
}
