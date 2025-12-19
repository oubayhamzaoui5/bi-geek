// app/login/page.tsx (or wherever your login page is)
"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { User, Eye, EyeOff, ShieldCheck, AlertCircle, ArrowLeft } from "lucide-react"

type Step = "username" | "password"

export default function LoginPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>("username")

  // Username
  const [username, setUsername] = useState("")
  const [userErr, setUserErr] = useState<string | null>(null)

  // Password
  const [show, setShow] = useState({ next: false, confirm: false })
  const [next, setNext] = useState("")
  const [confirm, setConfirm] = useState("")
  const [saving, setSaving] = useState(false)
  const [loginErr, setLoginErr] = useState<string | null>(null)

  // Strength logic
  const strength = useMemo(() => {
    let s = 0
    if (next.length >= 8) s++
    if (/[A-Z]/.test(next)) s++
    if (/[a-z]/.test(next)) s++
    if (/\d/.test(next)) s++
    return Math.min(s, 4)
  }, [next])

  const match = next && confirm && next === confirm
  const barWidth = ["0%", "25%", "50%", "75%", "100%"][strength]
  const barColor = ["bg-gray-200", "bg-red-400", "bg-yellow-400", "bg-green-500", "bg-primary"][strength]

  const submitUsername = (e: React.FormEvent) => {
    e.preventDefault()
    const u = username.trim()

    if (!u) {
      setUserErr("Veuillez saisir un nom d'utilisateur.")
      return
    }

    setUserErr(null)
    setLoginErr(null)
    setStep("password")
  }

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginErr(null)

    const u = username.trim()
    const pwd = next

    if (!u || !pwd) {
      setLoginErr("Nom d'utilisateur ou mot de passe manquant.")
      return
    }

    setSaving(true)
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: u,
          password: pwd,
        }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setLoginErr(data?.error ?? "Identifiants invalides.")
        return
      }

      const authUser = data?.user
      const role = authUser?.role ?? "student"

      // ✅ store the real user object, not the Lucide <User /> icon
      if (typeof window !== "undefined" && authUser) {
        localStorage.setItem("user", JSON.stringify(authUser))
      }

      if (role === "admin") {
        router.push("/admin-dashboard")
      } else if (role === "instructor") {
        router.push("/instructor-dashboard")
      } else {
        router.push("/student-dashboard")
      }
    } catch (err) {
      console.error("Login error:", err)
      setLoginErr("Erreur lors de la connexion. Réessayez.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      {/* 2-column layout 70/30 */}
      <div className="grid h-full w-full grid-rows-[auto_1fr_auto] md:grid-rows-1 md:grid-cols-[7fr_3fr]">
        {/* LEFT: Image */}
        <div className="relative row-start-2 md:row-auto md:col-start-1">
          <Image src="/login.jpg" alt="Login illustration" fill priority className="object-cover" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-40 bg-gradient-to-l from-white/0 via-black/10 to-transparent md:block hidden" />
          <div className="absolute right-0 top-0 h-full w-[8px] bg-accent shadow-[0_0_18px_rgba(149,74,191,0.45)]" />
        </div>

        {/* RIGHT: Form */}
        <div className="relative flex h-full w-full flex-col items-start justify-center bg-white md:col-start-2 px-8 sm:px-12">
          {/* Back to home */}
          <div className="absolute top-6 left-8 sm:left-12">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-base text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              Retour à l’accueil
            </Link>
          </div>

          {/* Card */}
          <div className="w-full max-w-lg">
            <header className="mb-6">
              <h1 className="text-3xl font-semibold text-accent">Connexion</h1>
              <p className="text-base text-gray-500">
                {step === "username" ? "Entrez votre nom d’utilisateur" : "Entrez votre mot de passe"}
              </p>
            </header>

            {step === "username" ? (
              <form onSubmit={submitUsername} className="space-y-6">
                <div>
                  <label className="block text-sm text-gray-600 mb-2">Nom d'utilisateur</label>
                  <div className="relative">
                    <input
                      autoFocus
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder='Ex. "admin"'
                      className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 pl-10 text-base text-gray-800 placeholder:text-gray-400
                                 focus:border-purple-500 focus:ring-2 focus:ring-purple-300 outline-none transition"
                    />
                    <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                  {userErr && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-red-500">
                      <AlertCircle size={16} /> <span>{userErr}</span>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full px-5 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-base font-medium transition-colors cursor-pointer"
                >
                  Continuer
                </button>
              </form>
            ) : (
              <form onSubmit={submitPassword} className="space-y-6">
                <div className="space-y-5">
                  <PasswordInput
                    label="Mot de passe"
                    value={next}
                    onChange={setNext}
                    shown={show.next}
                    toggle={() => setShow((s) => ({ ...s, next: !s.next }))}
                    autoComplete="current-password"
                  />

                  {/* Strength meter */}
                  <div
                    className={`transition-all duration-300 ease-in-out overflow-hidden ${
                      next.length > 0 ? "opacity-100 max-h-24 translate-y-0" : "opacity-0 max-h-0 translate-y-1"
                    }`}
                  >
                    <div className="space-y-2 mt-1">
                      <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${barColor} transition-all duration-300 ease-in-out`}
                          style={{ width: barWidth }}
                        />
                      </div>
                      <p className="text-sm text-gray-500">
                        Utilisez au moins 8 caractères, avec lettres majuscules/minuscules et chiffres.
                      </p>
                    </div>
                  </div>

                  <PasswordInput
                    label="Confirmer le mot de passe"
                    value={confirm}
                    onChange={setConfirm}
                    shown={show.confirm}
                    toggle={() => setShow((s) => ({ ...s, confirm: !s.confirm }))}
                    autoComplete="current-password"
                  />

                  {!match && confirm.length > 0 && (
                    <p className="text-sm text-red-500 -mt-2">La confirmation ne correspond pas.</p>
                  )}

                  <div className="mt-1 flex items-center gap-2 text-base text-gray-600">
                    <ShieldCheck
                      size={18}
                      className={match && strength >= 3 ? "text-purple-600" : "text-gray-400"}
                    />
                    <span>
                      {match && strength >= 3
                        ? "Mot de passe fort et confirmé"
                        : "Assurez-vous de confirmer et renforcer le mot de passe"}
                    </span>
                  </div>

                  {loginErr && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-red-500">
                      <AlertCircle size={16} /> <span>{loginErr}</span>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!match || strength < 2 || saving}
                  className="w-full px-5 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-base font-medium transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                >
                  {saving ? "Connexion..." : "Terminer et accéder au tableau de bord"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep("username")
                    setLoginErr(null)
                  }}
                  className="w-full text-center text-sm text-gray-500 hover:text-gray-700 mt-2 cursor-pointer"
                >
                  ← Revenir au nom d’utilisateur
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Mobile top bar */}
        <div className="md:hidden row-start-1 px-5 py-3 flex items-center justify-between bg-white/70 backdrop-blur">
          <Link href="/" className="inline-flex items-center gap-2 text-base text-gray-700">
            <ArrowLeft className="h-5 w-5" />
            Accueil
          </Link>
        </div>
      </div>
    </div>
  )
}

/* ---------- Password Input ---------- */
type InputProps = {
  label: string
  value: string
  onChange: (v: string) => void
  shown: boolean
  toggle: () => void
  autoComplete?: string
}

function PasswordInput({ label, value, onChange, shown, toggle, autoComplete = "new-password" }: InputProps) {
  return (
    <div>
      <label className="block text-sm text-gray-600 mb-2">{label}</label>
      <div className="relative">
        <input
          type={shown ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          autoCorrect="off"
          spellCheck={false}
          className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-2.5 pr-12 text-base text-gray-800 placeholder:text-gray-400
                     focus:border-purple-500 focus:ring-2 focus:ring-purple-300 outline-none transition"
        />
        <button
          type="button"
          onClick={toggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
          aria-label={shown ? "Masquer" : "Afficher"}
        >
          {shown ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      </div>
    </div>
  )
}
