"use client"

import { useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { User, Eye, EyeOff, AlertCircle } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { useEffect } from "react"


/* ---------- Types ---------- */
type Step = "username" | "password"

/* ---------- Animations ---------- */
const stepVariants = {
  hidden: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? 40 : -40,
  }),
  visible: {
    opacity: 1,
    x: 0,
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? -40 : 40,
  }),
}

/* ---------- Page ---------- */
export default function LoginPage() {
  const router = useRouter()

  useEffect(() => {
    const userString = localStorage.getItem("user")
    const user = userString ? JSON.parse(userString) : null

    if (!user) return

    if (user.usePassword === false) {
      router.push("/force-change-password")
    } else if (user.role === "admin") {
      router.push("/admin-dashboard")
    } else if (user.role === "instructor") {
      router.push("/instructor-dashboard")
    } else {
      router.push("/student-dashboard")
    }
  }, [router])

  const [step, setStep] = useState<Step>("username")
  const [direction, setDirection] = useState(1)

  // Username
  const [username, setUsername] = useState("")
  const [userErr, setUserErr] = useState<string | null>(null)

  // Password
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loginErr, setLoginErr] = useState<string | null>(null)

  /* ---------- Handlers ---------- */
  const submitUsername = (e: React.FormEvent) => {
    e.preventDefault()

    if (!username.trim()) {
      setUserErr("Veuillez saisir un nom d'utilisateur.")
      return
    }

    setUserErr(null)
    setLoginErr(null)
    setDirection(1)
    setStep("password")
  }

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginErr(null)

    const u = username.trim()
    const pwd = password

    if (!u || !pwd) {
      setLoginErr("Nom d'utilisateur ou mot de passe manquant.")
      return
    }

    setSaving(true)

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: u, password: pwd }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setLoginErr(data?.error ?? "Identifiants invalides.")
        return
      }

      const authUser = data?.user
      const role = authUser?.role ?? "student"

      if (typeof window !== "undefined" && authUser) {
        localStorage.setItem("user", JSON.stringify(authUser))
      }

      if (authUser?.usePassword === false) {
        router.push("/force-change-password")
      } else if (role === "admin") {
        router.push("/admin-dashboard")
      } else if (role === "instructor") {
        router.push("/instructor-dashboard")
      } else {
        router.push("/student-dashboard")
      }
    } catch (err) {
      console.error(err)
      setLoginErr("Erreur lors de la connexion. Réessayez.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex flex-1">
        {/* IMAGE */}
        <div className="hidden md:flex w-[58%] relative px-10 py-10">
          <Image
            src="/login.webp"
            alt="Login illustration"
            fill
            className="object-contain"
            priority
          />
        </div>

        {/* FORM */}
        <div className="w-full md:w-[35%] flex flex-col items-center justify-center px-4">
          <div className="w-full max-w-md">
            {/* TITLE */}
            <h1 className="text-3xl font-semibold mb-8 leading-snug sticky top-0">
              Connectez-vous <br />
              pour continuer votre <br />
              <span className="text-accent">parcours d’apprentissage</span>
            </h1>

            {/* ANIMATED FORM CONTAINER */}
            <div className="relative min-h-[220px]">
              <AnimatePresence mode="wait" custom={direction}>
                {/* ---------- USERNAME ---------- */}
                {step === "username" && (
                  <motion.div
                    key="username"
                    custom={direction}
                    variants={stepVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    transition={{ duration: 0.35, ease: "easeInOut" }}
                    className="space-y-6"
                  >
                    <div>
                      <label className="block text-sm text-gray-600 mb-2">
                        Nom d'utilisateur
                      </label>
                      <div className="relative">
                        <input
                          autoFocus
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="w-full px-4 py-3 pl-10 border ring-1 rounded-sm bg-gray-50 focus:ring-2 focus:ring-purple-300"
                        />
                        <User
                          size={18}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        />
                      </div>

                      {userErr && (
                        <p className="text-sm text-red-500 mt-2">{userErr}</p>
                      )}

                      <button
                        type="button"
                        onClick={() => router.push("/forgot-username")}
                        className="mt-2 text-sm text-accent hover:underline"
                      >
                        Nom d’utilisateur oublié ?
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* ---------- PASSWORD ---------- */}
                {step === "password" && (
                  <motion.div
                    key="password"
                    custom={direction}
                    variants={stepVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    transition={{ duration: 0.35, ease: "easeInOut" }}
                    className="space-y-6"
                  >
                    <PasswordInput
                      label="Mot de passe"
                      value={password}
                      onChange={setPassword}
                      shown={showPassword}
                      toggle={() => setShowPassword((s) => !s)}
                    />

                    {loginErr && (
                      <div className="flex items-center gap-2 text-sm text-red-500">
                        <AlertCircle size={16} />
                        {loginErr}
                      </div>
                    )}

                    <div className="flex justify-between text-sm">
                      <button
                        type="button"
                        onClick={() => {
                          setDirection(-1)
                          setStep("username")
                        }}
                        className="text-gray-500 hover:underline"
                      >
                        Changer de nom d’utilisateur
                      </button>

                      <button
                        type="button"
                        onClick={() => router.push("/forgot-password")}
                        className="text-accent hover:underline"
                      >
                        Mot de passe oublié ?
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* FIXED BUTTON */}
            <button
              onClick={(e) => {
                if (step === "username") submitUsername(e as any)
                else submitPassword(e as any)
              }}
              disabled={step === "password" && (!password || saving)}
              className="mt-6 w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-3 rounded-lg transition-colors"
            >
              {step === "username"
                ? "Continuer"
                : saving
                ? "Connexion..."
                : "Se connecter"}
            </button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

/* ---------- Password Input ---------- */
function PasswordInput({
  label,
  value,
  onChange,
  shown,
  toggle,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  shown: boolean
  toggle: () => void
}) {
  return (
    <div>
      <label className="block text-sm text-gray-600 mb-2">{label}</label>
      <div className="relative">
        <input
          type={shown ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-4 py-3 pr-12 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-purple-300"
        />
        <button
          type="button"
          onClick={toggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
          aria-label={shown ? "Masquer" : "Afficher"}
        >
          {shown ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      </div>
    </div>
  )
}
