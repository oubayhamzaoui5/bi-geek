"use client"

import { useState } from "react"
import type React from "react"
import Link from "next/link"
import { AlertCircle, ArrowRight, CheckCircle, ChevronLeft, HelpCircle, KeyRound, Mail, ShieldCheck, User } from "lucide-react"
import { motion } from "framer-motion"

type Role = "student" | "instructor"
type Step = "form" | "code" | "done" | "helpSent"

export default function ForgotPasswordPage() {
  const [identity, setIdentity] = useState("")
  const [role, setRole] = useState<Role>("student")
  const [code, setCode] = useState("")
  const [password, setPassword] = useState("")
  const [passwordConfirm, setPasswordConfirm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState<"email" | "reset" | "help" | null>(null)
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
        body: JSON.stringify({ identity: identity.trim(), role }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error ?? "Une erreur est survenue.")
        return
      }
      setMaskedEmail(data?.maskedEmail ?? "")
      setStep("code")
    } catch {
      setError("Erreur de connexion. Reessayez.")
    } finally {
      setLoading(null)
    }
  }

  const submitReset = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!code.trim() || !password || !passwordConfirm) {
      setError("Code et nouveau mot de passe requis.")
      return
    }
    if (password !== passwordConfirm) {
      setError("Les mots de passe ne correspondent pas.")
      return
    }

    setError(null)
    setLoading("reset")
    try {
      const res = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identity: identity.trim(),
          code: code.trim(),
          password,
          passwordConfirm,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error ?? "Impossible de reinitialiser le mot de passe.")
        return
      }
      setStep("done")
    } catch {
      setError("Erreur de connexion. Reessayez.")
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
          note: "Le code email n'a pas permis de reinitialiser le mot de passe.",
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error ?? "Impossible d'envoyer la demande.")
        return
      }
      setStep("helpSent")
    } catch {
      setError("Erreur de connexion. Reessayez.")
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
          <Link href="/" className="inline-flex items-center gap-1 hover:opacity-80 transition-opacity">
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
            Recuperez<br />
            <span style={{ color: "oklch(0.80 0.22 308)" }}>votre acces</span>
          </h2>
          <p className="text-base leading-relaxed max-w-[330px]" style={{ color: "oklch(0.72 0.05 300)" }}>
            Recevez un code de verification par email, choisissez un nouveau mot de passe, puis connectez-vous.
          </p>
        </motion.div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12" style={{ background: "var(--background)" }}>
        <motion.div
          className="w-full max-w-[460px]"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="lg:hidden mb-10">
            <Link href="/" className="inline-flex items-center gap-1 hover:opacity-80 transition-opacity">
              <span className="font-display text-2xl font-bold tracking-tight" style={{ color: "var(--accent)" }}>BI</span>
              <span className="font-display text-2xl font-bold tracking-tight" style={{ color: "var(--foreground)" }}> GEEK</span>
            </Link>
          </div>

          {step === "done" ? (
            <SuccessState
              icon={ShieldCheck}
              title="Mot de passe mis a jour"
              message="Vos nouveaux identifiants ont ete envoyes par email. Vous pouvez maintenant vous connecter."
              actionLabel="Retour a la connexion"
              href="/login"
            />
          ) : step === "helpSent" ? (
            <SuccessState
              icon={CheckCircle}
              title="Demande envoyee"
              message="Votre demande est visible par l'administration. Un administrateur pourra generer un mot de passe temporaire."
              actionLabel="Retour a la connexion"
              href="/login"
            />
          ) : (
            <>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6" style={{ background: "color-mix(in oklch, var(--accent) 12%, transparent)" }}>
                {step === "code" ? <Mail size={24} style={{ color: "var(--accent)" }} /> : <KeyRound size={24} style={{ color: "var(--accent)" }} />}
              </div>
              <h1 className="text-4xl font-bold leading-tight mb-2" style={{ fontFamily: "var(--ff-display)", color: "var(--foreground)" }}>
                {step === "code" ? "Entrez le code" : "Mot de passe oublie ?"}
              </h1>
              <p className="text-base mb-8" style={{ color: "var(--muted-foreground)" }}>
                {step === "code"
                  ? `Nous avons envoye un code a ${maskedEmail || "votre email"}. Il expire dans 15 minutes.`
                  : "Saisissez votre identifiant pour recevoir un code de verification par email."}
              </p>

              {step === "form" ? (
                <form onSubmit={submitEmailReset} className="space-y-5">
                  <TextField
                    icon={<User size={16} />}
                    label="Nom d'utilisateur ou email"
                    value={identity}
                    onChange={setIdentity}
                    placeholder="votre-identifiant"
                    autoFocus
                  />

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
                          {item === "student" ? "Apprenant" : "Formateur"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <ErrorText error={error} />
                  <PrimaryButton loading={loading === "email"} label="Envoyer le code" loadingLabel="Envoi..." />
                </form>
              ) : (
                <form onSubmit={submitReset} className="space-y-5">
                  <TextField label="Code de verification" value={code} onChange={setCode} placeholder="123456" autoFocus />
                  <TextField label="Nouveau mot de passe" value={password} onChange={setPassword} placeholder="********" type="password" />
                  <TextField label="Confirmer le mot de passe" value={passwordConfirm} onChange={setPasswordConfirm} placeholder="********" type="password" />
                  <ErrorText error={error} />
                  <PrimaryButton loading={loading === "reset"} label="Reinitialiser le mot de passe" loadingLabel="Mise a jour..." />
                </form>
              )}

              <button
                type="button"
                onClick={submitManualHelp}
                disabled={loading !== null}
                className="mt-3 w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                style={{ border: "1px solid var(--border)", color: "var(--foreground)", background: "#fff" }}
              >
                <HelpCircle size={16} />
                {loading === "help" ? "Envoi..." : "Demander l'aide admin"}
              </button>

              <div className="mt-6 flex items-center justify-between">
                <Link href="/login" className="inline-flex items-center gap-1 text-sm hover:underline" style={{ color: "var(--muted-foreground)" }}>
                  <ChevronLeft size={14} />
                  Retour a la connexion
                </Link>
                {step === "code" && (
                  <button type="button" onClick={() => setStep("form")} className="text-sm hover:underline" style={{ color: "var(--accent)" }}>
                    Renvoyer un code
                  </button>
                )}
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  )
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  icon,
  type = "text",
  autoFocus = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  icon?: React.ReactNode
  type?: string
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
        style={{ borderBottom: focused ? "2px solid var(--accent)" : "2px solid var(--border)" }}
      >
        {icon && <span className="absolute left-0" style={{ color: focused ? "var(--accent)" : "var(--muted-foreground)" }}>{icon}</span>}
        <input
          autoFocus={autoFocus}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`${icon ? "pl-7" : "pl-0"} w-full pr-4 py-3 text-base bg-transparent outline-none`}
          style={{ color: "var(--foreground)" }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </div>
    </div>
  )
}

function ErrorText({ error }: { error: string | null }) {
  if (!error) return null
  return (
    <p className="text-sm flex items-center gap-1" style={{ color: "var(--destructive)" }}>
      <AlertCircle size={13} className="shrink-0" />
      {error}
    </p>
  )
}

function PrimaryButton({ loading, label, loadingLabel }: { loading: boolean; label: string; loadingLabel: string }) {
  return (
    <motion.button
      type="submit"
      disabled={loading}
      className="w-full py-4 rounded-xl text-base font-semibold text-white flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50"
      style={{
        background: "linear-gradient(135deg, oklch(0.70 0.30 300), oklch(0.66 0.28 316))",
        boxShadow: "0 4px 24px oklch(0.68 0.28 308 / 0.35)",
      }}
      whileHover={{ scale: 1.015 }}
      whileTap={{ scale: 0.985 }}
    >
      {loading ? loadingLabel : label}
      <ArrowRight size={18} />
    </motion.button>
  )
}

function SuccessState({
  icon: Icon,
  title,
  message,
  actionLabel,
  href,
}: {
  icon: React.ElementType
  title: string
  message: string
  actionLabel: string
  href: string
}) {
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
      <Link href={href} className="inline-flex items-center gap-2 text-sm font-medium hover:underline" style={{ color: "var(--accent)" }}>
        <ChevronLeft size={14} />
        {actionLabel}
      </Link>
    </motion.div>
  )
}
