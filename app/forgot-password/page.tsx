"use client"

import { useState } from "react"
import type React from "react"
import Link from "next/link"
import { AlertCircle, ArrowRight, ChevronLeft, CheckCircle, HelpCircle, KeyRound, Mail, User } from "lucide-react"
import { motion } from "framer-motion"

type Role = "student" | "instructor"
type Step = "form" | "emailSent" | "helpSent"

export default function ForgotPasswordPage() {
  const [identity, setIdentity] = useState("")
  const [role, setRole] = useState<Role>("student")
  const [focused, setFocused] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState<"email" | "help" | null>(null)
  const [step, setStep] = useState<Step>("form")
  const [maskedEmail, setMaskedEmail] = useState("")

  const submitEmailReset = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!identity.trim()) {
      setError("Veuillez saisir votre nom d'utilisateur ou votre email.")
      return
    }

    setError(null)
    setLoading("email")
    try {
      const res = await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identity: identity.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error ?? "Une erreur est survenue.")
        return
      }
      setMaskedEmail(data?.maskedEmail ?? "")
      setStep("emailSent")
    } catch {
      setError("Erreur de connexion. Réessayez.")
    } finally {
      setLoading(null)
    }
  }

  const submitManualHelp = async () => {
    if (!identity.trim()) {
      setError("Veuillez saisir votre nom d'utilisateur ou votre email.")
      return
    }

    setError(null)
    setLoading("help")
    try {
      const res = await fetch("/api/password-reset-help", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identity: identity.trim(),
          role,
          note: "Le code email n'a pas permis de réinitialiser le mot de passe.",
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error ?? "Impossible d'envoyer la demande.")
        return
      }
      setStep("helpSent")
    } catch {
      setError("Erreur de connexion. Réessayez.")
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen flex" style={{ fontFamily: "var(--ff-body)" }}>
      <div
        className="hidden lg:flex flex-col w-[42%] relative overflow-hidden select-none"
        style={{ background: "linear-gradient(160deg, oklch(0.13 0.06 310) 0%, oklch(0.09 0.03 290) 60%, oklch(0.07 0.02 270) 100%)" }}
      >
        <div className="relative z-10 p-10">
          <Link href="/" className="inline-flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity">
            <span className="font-display text-2xl font-bold tracking-tight" style={{ color: "var(--accent)" }}>BI</span>
            <span className="font-display text-2xl font-bold tracking-tight text-white"> GEEK</span>
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
          className="relative z-10 px-10 pt-2"
        >
          <h2 className="text-5xl font-bold text-white leading-[1.1] mb-5" style={{ fontFamily: "var(--ff-display)" }}>
            Récupérez<br />
            <span style={{ color: "oklch(0.80 0.22 308)" }}>votre accès</span>
          </h2>
          <p className="text-base leading-relaxed max-w-[320px]" style={{ color: "oklch(0.72 0.05 300)" }}>
            Essayez d'abord le code par email. Si cela ne fonctionne pas, envoyez une demande directe à l'administration.
          </p>
        </motion.div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12 relative" style={{ background: "var(--background)" }}>
        <motion.div
          className="w-full max-w-[460px] relative z-10"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="lg:hidden mb-10">
            <Link href="/" className="inline-flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity">
              <span className="font-display text-2xl font-bold tracking-tight" style={{ color: "var(--accent)" }}>BI</span>
              <span className="font-display text-2xl font-bold tracking-tight" style={{ color: "var(--foreground)" }}> GEEK</span>
            </Link>
          </div>

          {step === "emailSent" ? (
            <SuccessState
              icon={Mail}
              title="Code de vérification prêt"
              message={maskedEmail ? `L'interface est prête pour envoyer un code à ${maskedEmail}. L'envoi email sera branché plus tard.` : "L'interface email est prête. L'envoi du code sera branché plus tard."}
              actionLabel="Je n'ai pas reçu le code"
              onAction={() => setStep("form")}
              secondaryAction={submitManualHelp}
              secondaryLoading={loading === "help"}
            />
          ) : step === "helpSent" ? (
            <SuccessState
              icon={CheckCircle}
              title="Demande envoyée"
              message="Votre demande est maintenant visible dans les notifications admin. Un administrateur pourra générer un mot de passe temporaire."
              actionLabel="Retour à la connexion"
              href="/login"
            />
          ) : (
            <>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6" style={{ background: "color-mix(in oklch, var(--accent) 12%, transparent)" }}>
                <KeyRound size={24} style={{ color: "var(--accent)" }} />
              </div>
              <h1 className="text-4xl font-bold leading-tight mb-2" style={{ fontFamily: "var(--ff-display)", color: "var(--foreground)" }}>
                Mot de passe oublié ?
              </h1>
              <p className="text-base mb-8" style={{ color: "var(--muted-foreground)" }}>
                Saisissez votre identifiant pour préparer une réinitialisation par email, puis demandez l'aide admin si le code ne fonctionne pas.
              </p>

              <form onSubmit={submitEmailReset} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: "var(--muted-foreground)" }}>
                    Nom d'utilisateur ou email
                  </label>
                  <div
                    className="relative flex items-center transition-all duration-200"
                    style={{
                      borderBottom: error ? "2px solid var(--destructive)" : focused ? "2px solid var(--accent)" : "2px solid var(--border)",
                    }}
                  >
                    <span className="absolute left-0" style={{ color: focused ? "var(--accent)" : "var(--muted-foreground)" }}>
                      <User size={16} />
                    </span>
                    <input
                      autoFocus
                      value={identity}
                      onChange={(e) => setIdentity(e.target.value)}
                      placeholder="votre-identifiant"
                      className="w-full pl-7 pr-4 py-3 text-base bg-transparent outline-none"
                      style={{ color: "var(--foreground)" }}
                      onFocus={() => setFocused(true)}
                      onBlur={() => setFocused(false)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: "var(--muted-foreground)" }}>
                    Profil
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["student", "instructor"] as Role[]).map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setRole(item)}
                        className="h-11 rounded-xl text-sm font-semibold transition-colors"
                        style={{
                          border: role === item ? "1.5px solid var(--accent)" : "1px solid var(--border)",
                          background: role === item ? "color-mix(in oklch, var(--accent) 10%, white)" : "#fff",
                          color: role === item ? "var(--accent)" : "var(--foreground)",
                        }}
                      >
                        {item === "student" ? "Étudiant" : "Instructeur"}
                      </button>
                    ))}
                  </div>
                </div>

                {error && (
                  <p className="text-sm flex items-center gap-1" style={{ color: "var(--destructive)" }}>
                    <AlertCircle size={13} className="shrink-0" />
                    {error}
                  </p>
                )}

                <motion.button
                  type="submit"
                  disabled={loading !== null}
                  className="w-full py-4 rounded-xl text-base font-semibold text-white flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: "linear-gradient(135deg, oklch(0.70 0.30 300), oklch(0.66 0.28 316))",
                    boxShadow: "0 4px 24px oklch(0.68 0.28 308 / 0.35)",
                  }}
                  whileHover={{ scale: 1.015 }}
                  whileTap={{ scale: 0.985 }}
                >
                  {loading === "email" ? "Préparation..." : "Continuer avec le code email"}
                  <ArrowRight size={18} />
                </motion.button>
              </form>

              <button
                type="button"
                onClick={submitManualHelp}
                disabled={loading !== null}
                className="mt-3 w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                style={{
                  border: "1px solid var(--border)",
                  color: "var(--foreground)",
                  background: "#fff",
                }}
              >
                <HelpCircle size={16} />
                {loading === "help" ? "Envoi..." : "Demander l'aide admin"}
              </button>

              <div className="mt-6">
                <Link href="/login" className="inline-flex items-center gap-1 text-sm transition-colors hover:underline cursor-pointer" style={{ color: "var(--muted-foreground)" }}>
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

function SuccessState({
  icon: Icon,
  title,
  message,
  actionLabel,
  href,
  onAction,
  secondaryAction,
  secondaryLoading,
}: {
  icon: React.ElementType
  title: string
  message: string
  actionLabel: string
  href?: string
  onAction?: () => void
  secondaryAction?: () => void
  secondaryLoading?: boolean
}) {
  const content = (
    <>
      <ChevronLeft size={14} />
      {actionLabel}
    </>
  )

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6" style={{ background: "color-mix(in oklch, var(--accent) 12%, transparent)" }}>
        <Icon size={28} style={{ color: "var(--accent)" }} />
      </div>
      <h1 className="text-4xl font-bold leading-tight mb-2" style={{ fontFamily: "var(--ff-display)", color: "var(--foreground)" }}>
        {title}
      </h1>
      <p className="text-base mb-7" style={{ color: "var(--muted-foreground)" }}>
        {message}
      </p>
      {secondaryAction && (
        <button
          type="button"
          onClick={secondaryAction}
          disabled={secondaryLoading}
          className="mb-5 w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          style={{ border: "1px solid var(--border)", color: "var(--foreground)", background: "#fff" }}
        >
          <HelpCircle size={16} />
          {secondaryLoading ? "Envoi..." : "Envoyer une demande admin"}
        </button>
      )}
      {href ? (
        <Link href={href} className="inline-flex items-center gap-2 text-sm font-medium cursor-pointer hover:underline transition-colors" style={{ color: "var(--accent)" }}>
          {content}
        </Link>
      ) : (
        <button type="button" onClick={onAction} className="inline-flex items-center gap-2 text-sm font-medium cursor-pointer hover:underline transition-colors" style={{ color: "var(--accent)" }}>
          {content}
        </button>
      )}
    </motion.div>
  )
}
