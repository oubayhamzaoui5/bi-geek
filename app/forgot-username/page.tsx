"use client"

import { useState } from "react"
import Link from "next/link"
import { Mail, AlertCircle, ArrowRight, ChevronLeft, CheckCircle } from "lucide-react"
import { motion } from "framer-motion"

export default function ForgotUsernamePage() {
  const [email, setEmail] = useState("")
  const [focused, setFocused] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) { setError("Veuillez saisir votre adresse e-mail."); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError("Adresse e-mail invalide."); return }
    setError(null)
    setLoading(true)
    try {
      const res = await fetch("/api/forgot-username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data?.error ?? "Une erreur est survenue.")
        return
      }
      setSent(true)
    } catch {
      setError("Erreur de connexion. Réessayez.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex" style={{ fontFamily: "var(--ff-body)" }}>

      {/* ─── LEFT PANEL ─── */}
      <div
        className="hidden lg:flex flex-col w-[42%] relative overflow-hidden select-none"
        style={{
          background: "linear-gradient(160deg, oklch(0.13 0.06 310) 0%, oklch(0.09 0.03 290) 60%, oklch(0.07 0.02 270) 100%)",
        }}
      >
        <div
          className="absolute pointer-events-none"
          style={{
            width: "70%", paddingBottom: "70%", bottom: "-15%", left: "-15%",
            borderRadius: "50%",
            background: "radial-gradient(circle, oklch(0.55 0.26 308 / 0.22) 0%, transparent 70%)",
            filter: "blur(40px)",
          }}
        />
        <div
          className="absolute pointer-events-none"
          style={{
            width: "45%", paddingBottom: "45%", top: "-10%", right: "-10%",
            borderRadius: "50%",
            background: "radial-gradient(circle, oklch(0.60 0.22 280 / 0.15) 0%, transparent 70%)",
            filter: "blur(32px)",
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle, oklch(0.80 0.15 308 / 0.12) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        <div className="relative z-10 p-10">
          <Link href="/" className="inline-flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity">
            <span className="font-display text-2xl font-bold tracking-tight" style={{ color: "var(--accent)" }}>BI</span>
            <span className="font-display text-2xl font-bold tracking-tight text-white"> GEEK</span>
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.9, ease: "easeOut" }}
          className="relative z-10 px-10 pt-2"
        >
          <h2
            className="text-5xl font-bold text-white leading-[1.1] mb-5"
            style={{ fontFamily: "var(--ff-display)" }}
          >
            Maîtrisez la<br />
            <span style={{ color: "oklch(0.80 0.22 308)" }}>Data & l'IA</span>
          </h2>
          <p className="text-base leading-relaxed max-w-[300px]" style={{ color: "oklch(0.72 0.05 300)" }}>
            Formations pratiques en Data Science, IA, Cloud et Cybersécurité — avec de vrais projets et des mentors experts.
          </p>
        </motion.div>
      </div>

      {/* ─── RIGHT PANEL ─── */}
      <div
        className="flex-1 flex items-center justify-center px-6 py-12 relative"
        style={{ background: "var(--background)" }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 60% 50% at 80% 20%, oklch(0.68 0.28 308 / 0.06) 0%, transparent 70%)",
          }}
        />

        <motion.div
          className="w-full max-w-[420px] relative z-10"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Mobile logo */}
          <div className="lg:hidden mb-10">
            <Link href="/" className="inline-flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity">
              <span className="font-display text-2xl font-bold tracking-tight" style={{ color: "var(--accent)" }}>BI</span>
              <span className="font-display text-2xl font-bold tracking-tight" style={{ color: "var(--foreground)" }}> GEEK</span>
            </Link>
          </div>

          {sent ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
                style={{ background: "color-mix(in oklch, var(--accent) 12%, transparent)" }}
              >
                <CheckCircle size={28} style={{ color: "var(--accent)" }} />
              </div>
              <h1 className="text-4xl font-bold leading-tight mb-2" style={{ fontFamily: "var(--ff-display)", color: "var(--foreground)" }}>
                E-mail envoyé
              </h1>
              <p className="text-base mb-8" style={{ color: "var(--muted-foreground)" }}>
                Si un compte est associé à cette adresse, vous recevrez votre identifiant par e-mail.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-sm font-medium cursor-pointer hover:underline transition-colors"
                style={{ color: "var(--accent)" }}
              >
                <ChevronLeft size={14} />
                Retour à la connexion
              </Link>
            </motion.div>
          ) : (
            <>
              <h1 className="text-4xl font-bold leading-tight mb-2" style={{ fontFamily: "var(--ff-display)", color: "var(--foreground)" }}>
                Identifiant oublié ?
              </h1>
              <p className="text-base mb-8" style={{ color: "var(--muted-foreground)" }}>
                Saisissez votre adresse e-mail et nous vous enverrons votre identifiant.
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: "var(--muted-foreground)" }}>
                    Adresse e-mail
                  </label>
                  <div
                    className="relative flex items-center transition-all duration-200"
                    style={{
                      borderBottom: error
                        ? "2px solid var(--destructive)"
                        : focused
                        ? "2px solid var(--accent)"
                        : "2px solid var(--border)",
                    }}
                  >
                    <span className="absolute left-0" style={{ color: focused ? "var(--accent)" : "var(--muted-foreground)" }}>
                      <Mail size={16} />
                    </span>
                    <input
                      autoFocus
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="vous@exemple.com"
                      className="w-full pl-7 pr-4 py-3 text-base bg-transparent outline-none"
                      style={{ color: "var(--foreground)" }}
                      onFocus={() => setFocused(true)}
                      onBlur={() => setFocused(false)}
                    />
                  </div>
                  {error && (
                    <p className="text-sm mt-2 flex items-center gap-1" style={{ color: "var(--destructive)" }}>
                      <AlertCircle size={13} className="shrink-0" />
                      {error}
                    </p>
                  )}
                </div>
              </form>

              <motion.button
                onClick={handleSubmit as any}
                disabled={loading}
                className="mt-7 w-full py-4 rounded-xl text-base font-semibold text-white flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: "linear-gradient(135deg, oklch(0.70 0.30 300), oklch(0.66 0.28 316))",
                  boxShadow: "0 4px 24px oklch(0.68 0.28 308 / 0.35)",
                }}
                whileHover={{ scale: 1.015, boxShadow: "0 6px 28px oklch(0.68 0.28 308 / 0.45)" }}
                whileTap={{ scale: 0.985 }}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Envoi en cours…
                  </>
                ) : (
                  <>
                    Envoyer
                    <ArrowRight size={18} />
                  </>
                )}
              </motion.button>

              <div className="mt-6">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1 text-sm transition-colors hover:underline cursor-pointer"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  <ChevronLeft size={14} />
                  Retour à la connexion
                </Link>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  )
}
