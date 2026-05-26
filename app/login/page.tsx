"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { User, Eye, EyeOff, AlertCircle, ArrowRight, ChevronLeft } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

type Step = "username" | "password"
type LoginUser = {
  id?: string
  role?: string
  usePassword?: boolean
}

const stepVariants = {
  hidden: (d: number) => ({ opacity: 0, x: d > 0 ? 32 : -32 }),
  visible: { opacity: 1, x: 0 },
  exit: (d: number) => ({ opacity: 0, x: d > 0 ? -32 : 32 }),
}

function dashboardPathFor(user: LoginUser | null | undefined) {
  const role = user?.role ?? "student"
  if (user?.usePassword === false) return "/force-change-password"
  if (role === "admin" || role === "admin_agent") return "/admin-dashboard"
  if (role === "instructor") return "/instructor-dashboard"
  return "/student-dashboard"
}


export default function LoginPage() {
  const router = useRouter()

  useEffect(() => {
    let cancelled = false

    async function restoreServerSession() {
      try {
        const res = await fetch("/api/session", { cache: "no-store" })
        const data = await res.json().catch(() => ({}))

        if (!res.ok || !data?.user?.id) {
          localStorage.removeItem("user")
          return
        }

        if (cancelled) return
        localStorage.setItem("user", JSON.stringify(data.user))
        window.location.assign(dashboardPathFor(data.user))
      } catch {
        localStorage.removeItem("user")
      }
    }

    restoreServerSession()
    return () => {
      cancelled = true
    }
  }, [])

  const [step, setStep] = useState<Step>("username")
  const [direction, setDirection] = useState(1)
  const [username, setUsername] = useState("")
  const [userErr, setUserErr] = useState<string | null>(null)
  const [password, setPassword] = useState("")
  const [showPwd, setShowPwd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loginErr, setLoginErr] = useState<string | null>(null)

  const submitUsername = (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim()) { setUserErr("Veuillez saisir un nom d'utilisateur."); return }
    setUserErr(null); setLoginErr(null); setDirection(1); setStep("password")
  }

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginErr(null)
    const u = username.trim()
    if (!u || !password) { setLoginErr("Nom d'utilisateur ou mot de passe manquant."); return }
    setSaving(true)
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: u, password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setLoginErr(data?.error ?? "Identifiants invalides."); return }
      const authUser = data?.user
      if (!authUser?.id) {
        setLoginErr("Connexion invalide. Réessayez.")
        return
      }
      localStorage.setItem("user", JSON.stringify(authUser))
      window.location.assign(dashboardPathFor(authUser))
    } catch {
      setLoginErr("Erreur lors de la connexion. Réessayez.")
    } finally {
      setSaving(false)
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
        {/* Large soft glow bottom-left */}
        <div
          className="absolute pointer-events-none"
          style={{
            width: "70%",
            paddingBottom: "70%",
            bottom: "-15%",
            left: "-15%",
            borderRadius: "50%",
            background: "radial-gradient(circle, oklch(0.55 0.26 308 / 0.22) 0%, transparent 70%)",
            filter: "blur(40px)",
          }}
        />
        {/* Smaller accent top-right */}
        <div
          className="absolute pointer-events-none"
          style={{
            width: "45%",
            paddingBottom: "45%",
            top: "-10%",
            right: "-10%",
            borderRadius: "50%",
            background: "radial-gradient(circle, oklch(0.60 0.22 280 / 0.15) 0%, transparent 70%)",
            filter: "blur(32px)",
          }}
        />
        {/* Dot grid */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle, oklch(0.80 0.15 308 / 0.12) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        {/* Logo */}
        <div className="relative z-10 p-10">
          <Link href="/" className="inline-flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity">
            <span className="font-display text-2xl font-bold tracking-tight" style={{ color: "var(--accent)" }}>BI</span>
            <span className="font-display text-2xl font-bold tracking-tight text-white"> GEEK</span>
          </Link>
        </div>

        {/* Copy */}
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
            <span style={{ color: "oklch(0.80 0.22 308)" }}>
              Data & l'IA
            </span>
          </h2>
          <p className="text-base leading-relaxed max-w-[300px]" style={{ color: "oklch(0.72 0.05 300)" }}>
            Formations pratiques en Data Science, IA, Cloud et Cybersécurité — avec de vrais projets et des mentors experts.
          </p>
        </motion.div>
      </div>

      {/* ─── RIGHT PANEL — Form ─── */}
      <div
        className="flex-1 flex items-center justify-center px-6 py-12 relative"
        style={{ background: "var(--background)" }}
      >
        {/* Subtle background accent */}
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

          {/* Step indicator */}
          <div className="flex items-center gap-3 mb-8">
            <div className="flex gap-2">
              <div className="h-1 w-8 rounded-full" style={{ background: "var(--accent)" }} />
              <div
                className="h-1 w-8 rounded-full transition-all duration-500"
                style={{ background: step === "password" ? "var(--accent)" : "var(--border)" }}
              />
            </div>
            <span className="text-sm" style={{ color: "var(--muted-foreground)" }}>
              {step === "username" ? "1" : "2"} / 2
            </span>
          </div>

          {/* Heading */}
          <AnimatePresence mode="wait">
            <motion.div
              key={step + "-heading"}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
            >
              <h1
                className="text-4xl font-bold leading-tight mb-2"
                style={{ fontFamily: "var(--ff-display)", color: "var(--foreground)" }}
              >
                {step === "username" ? "Bon retour !" : `Bonjour, ${username}`}
              </h1>
              <p className="text-base mb-8" style={{ color: "var(--muted-foreground)" }}>
                {step === "username"
                  ? "Saisissez votre identifiant pour accéder à votre espace."
                  : "Entrez votre mot de passe pour vous connecter."}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Form fields */}
          <div>
            <AnimatePresence mode="wait" custom={direction}>
              {step === "username" && (
                <motion.form
                  key="username"
                  custom={direction}
                  variants={stepVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  transition={{ duration: 0.28, ease: "easeInOut" }}
                  onSubmit={submitUsername}
                  className="space-y-5"
                >
                  <StyledInput
                    label="Nom d'utilisateur"
                    icon={<User size={16} />}
                    value={username}
                    onChange={setUsername}
                    placeholder="votre-identifiant"
                    error={userErr}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => router.push("/forgot-username")}
                    className="text-sm transition-colors hover:underline cursor-pointer"
                    style={{ color: "var(--accent)" }}
                  >
                    Nom d'utilisateur oublié ?
                  </button>
                </motion.form>
              )}

              {step === "password" && (
                <motion.form
                  key="password"
                  custom={direction}
                  variants={stepVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  transition={{ duration: 0.28, ease: "easeInOut" }}
                  onSubmit={submitPassword}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: "var(--muted-foreground)" }}>
                      Mot de passe
                    </label>
                    <PasswordInput
                      value={password}
                      onChange={setPassword}
                      shown={showPwd}
                      toggle={() => setShowPwd((s) => !s)}
                    />
                  </div>

                  <AnimatePresence>
                    {loginErr && (
                      <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.98 }}
                        transition={{ duration: 0.22, ease: "easeOut" }}
                        className="flex items-start gap-3 text-sm px-4 py-3 rounded-xl overflow-hidden relative"
                        style={{
                          color: "oklch(0.38 0.16 25)",
                          borderLeft: "3px solid oklch(0.60 0.22 25)",
                        }}
                      >
<AlertCircle size={15} className="shrink-0 mt-[1px]" style={{ color: "oklch(0.55 0.22 25)" }} />
                        <span style={{ lineHeight: 1.5 }}>{loginErr}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex justify-between items-center pt-1">
                    <button
                      type="button"
                      onClick={() => { setDirection(-1); setStep("username") }}
                      className="flex items-center gap-1 text-sm transition-colors hover:underline cursor-pointer"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      <ChevronLeft size={14} />
                      Changer d'identifiant
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push("/forgot-password")}
                      className="text-sm transition-colors hover:underline cursor-pointer"
                      style={{ color: "var(--accent)" }}
                    >
                      Mot de passe oublié ?
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </div>

          {/* CTA button */}
          <motion.button
            onClick={(e) => {
              if (step === "username") submitUsername(e as any)
              else submitPassword(e as any)
            }}
            disabled={step === "password" && (!password || saving)}
            className="mt-7 w-full py-4 rounded-xl text-base font-semibold text-white flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: "linear-gradient(135deg, oklch(0.70 0.30 300), oklch(0.66 0.28 316))",
              boxShadow: "0 4px 24px oklch(0.68 0.28 308 / 0.35)",
            }}
            whileHover={{ scale: 1.015, boxShadow: "0 6px 28px oklch(0.68 0.28 308 / 0.45)" }}
            whileTap={{ scale: 0.985 }}
          >
            {saving ? (
              <>
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Connexion en cours…
              </>
            ) : (
              <>
                {step === "username" ? "Continuer" : "Se connecter"}
                <ArrowRight size={18} />
              </>
            )}
          </motion.button>
        </motion.div>
      </div>
    </div>
  )
}

/* ─── Sub-components ─── */

function StyledInput({
  label, icon, value, onChange, placeholder, error, autoFocus,
}: {
  label: string
  icon: React.ReactNode
  value: string
  onChange: (v: string) => void
  placeholder?: string
  error?: string | null
  autoFocus?: boolean
}) {
  const [focused, setFocused] = useState(false)
  return (
    <div>
      <label className="block text-sm font-medium mb-2" style={{ color: "var(--muted-foreground)" }}>
        {label}
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
          {icon}
        </span>
        <input
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
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
  )
}

function PasswordInput({
  value, onChange, shown, toggle,
}: {
  value: string; onChange: (v: string) => void; shown: boolean; toggle: () => void
}) {
  const [focused, setFocused] = useState(false)
  return (
    <div
      className="relative flex items-center transition-all duration-200"
      style={{
        borderBottom: focused ? "2px solid var(--accent)" : "2px solid var(--border)",
      }}
    >
      <input
        autoFocus
        type={shown ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="••••••••"
        className="w-full py-3 pr-10 text-base bg-transparent outline-none"
        style={{ color: "var(--foreground)" }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      <button
        type="button"
        onClick={toggle}
        className="absolute right-0 top-1/2 -translate-y-1/2 transition-colors cursor-pointer"
        style={{ color: focused ? "var(--accent)" : "var(--muted-foreground)" }}
        aria-label={shown ? "Masquer" : "Afficher"}
      >
        {shown ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  )
}
