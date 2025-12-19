"use client"

import { useState, useRef, FormEvent } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  ArrowRight,
  Mail,
  MapPin,
  Phone,
  Facebook,
  Linkedin,
  Instagram,
} from "lucide-react"

type FormState = "idle" | "submitting" | "success" | "error"

const CONTACT_INFO = {
  email: "contact@bigeek.tn",
  phone: "+216 12 345 678",
  location: "Tunis, Tunisie",
  socials: [
    { name: "Facebook", href: "https://www.facebook.com", icon: Facebook },
    { name: "LinkedIn", href: "https://www.linkedin.com", icon: Linkedin },
    { name: "Instagram", href: "https://www.instagram.com", icon: Instagram },
  ],
}

export function Contact() {
  const formRef = useRef<HTMLFormElement | null>(null)
  const [state, setState] = useState<FormState>("idle")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<string>("")

  function validate(form: HTMLFormElement) {
    const data = new FormData(form)
    const name = (data.get("name") as string)?.trim()
    const email = (data.get("email") as string)?.trim()
    const subject = (data.get("subject") as string)?.trim()
    const content = (data.get("message") as string)?.trim()
    const errs: Record<string, string> = {}

    if (!name) errs.name = "Nom requis."
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) errs.email = "Email invalide."
    if (!subject) errs.subject = "Sujet requis."
    if (!content || content.length < 10) errs.message = "Message trop court."

    return { valid: Object.keys(errs).length === 0, errs }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    setErrors({})
    setMessage("")
    const { valid, errs } = validate(form)
    if (!valid) {
      setErrors(errs)
      return
    }

    try {
      setState("submitting")
      await new Promise((r) => setTimeout(r, 800))
      setState("success")
      setMessage("Merci ! Votre message a été envoyé avec succès.")
      form.reset()
    } catch {
      setState("error")
      setMessage("Une erreur est survenue. Réessayez plus tard.")
    } finally {
      setTimeout(() => setState("idle"), 1500)
    }
  }

  return (
    <section id="contact" className="relative overflow-hidden py-10 md:py-16 -mx-2 md:mx:0">
      <div className="container mx-auto px-3 sm:px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full"
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-accent mb-3">
            Contactez-nous
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground mb-6 md:mb-8 leading-relaxed max-w-[820px]">
            Une question, un projet ou une formation en tête ? Dites-nous en plus et nous revenons vers vous rapidement.
          </p>

          {/* Grid: left = info, right = form */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-10 items-stretch">
            {/* LEFT — Coordonnées (kept as is) */}
            <div className="flex flex-col h-full rounded-2xl border border-black/40 bg-white/60 p-6 shadow-sm">
              <h3 className="text-xl font-semibold mb-4">Coordonnées</h3>

              <ul className="space-y-4 text-sm mb-8">
                <li className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-accent mt-0.5" />
                  <div>
                    <div className="font-medium">Email</div>
                    <Link
                      href={`mailto:${CONTACT_INFO.email}`}
                      className="text-muted-foreground hover:text-foreground underline underline-offset-2"
                    >
                      {CONTACT_INFO.email}
                    </Link>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-accent mt-0.5" />
                  <div>
                    <div className="font-medium">Téléphone</div>
                    <Link
                      href={`tel:${CONTACT_INFO.phone.replace(/\s+/g, "")}`}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {CONTACT_INFO.phone}
                    </Link>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-accent mt-0.5" />
                  <div>
                    <div className="font-medium">Localisation</div>
                    <p className="text-muted-foreground">{CONTACT_INFO.location}</p>
                  </div>
                </li>
              </ul>

              <div>
                <h3 className="text-xl font-semibold mb-4">Réseaux sociaux</h3>
                <div className="flex flex-wrap items-center gap-3">
                  {CONTACT_INFO.socials.map(({ name, href, icon: Icon }) => (
                    <Link
                      key={name}
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={name}
                      className="inline-flex items-center gap-2 rounded-xl border border-black/40 px-3 py-2 text-sm  hover:border-accent hover:text-white hover:bg-accent transition"
                    >
                      <Icon className="h-4 w-4" />
                      <span className="hidden sm:inline">{name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT — Form (smaller inputs, tighter spacing) */}
            <div className="flex flex-col h-full rounded-2xl border border-black/40 bg-white/60 p-4 sm:p-6 shadow-sm">
              {/* status message */}
              <div role="status" aria-live="polite" className="min-h-[1.1rem] mb-2 text-xs sm:text-sm">
                {message && (
                  <span
                    className={
                      state === "success"
                        ? "text-green-600"
                        : state === "error"
                        ? "text-red-600"
                        : "text-muted-foreground"
                    }
                  >
                    {message}
                  </span>
                )}
              </div>

              <form ref={formRef} onSubmit={onSubmit} className="grid grid-cols-1 gap-4 flex-1 text-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  <div>
                    <label htmlFor="name" className="block text-xs sm:text-sm font-medium mb-1">
                      Nom complet
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      placeholder="Ex. Oubay Hamzaoui"
                      className={`w-full rounded-xl border bg-white px-3 py-2.5 sm:px-4 sm:py-3 text-sm outline-none transition focus:ring-2   ${
                        errors.name ? "border-red-500" : "border-black/40"
                      }`}
                      aria-invalid={!!errors.name}
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-xs sm:text-sm font-medium mb-1">
                      Email
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="vous@exemple.com"
                      className={`w-full rounded-xl border bg-white px-3 py-2.5 sm:px-4 sm:py-3 text-sm outline-none transition focus:ring-2   ${
                        errors.email ? "border-red-500" : "border-black/40"
                      }`}
                      aria-invalid={!!errors.email}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="subject" className="block text-xs sm:text-sm font-medium mb-1">
                    Sujet
                  </label>
                  <input
                    id="subject"
                    name="subject"
                    type="text"
                    placeholder="Ex. Formation Power BI pour l’équipe"
                    className={`w-full rounded-xl border bg-white px-3 py-2.5 sm:px-4 sm:py-3 text-sm outline-none transition focus:ring-2   ${
                      errors.subject ? "border-red-500" : "border-black/40"
                    }`}
                    aria-invalid={!!errors.subject}
                  />
                </div>

                <div className="flex-1">
                  <label htmlFor="message" className="block text-xs sm:text-sm font-medium mb-1">
                    Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={5}
                    placeholder="Décrivez vos besoins, objectifs, délais…"
                    className={`w-full h-full resize-none rounded-xl border bg-white px-3 py-2.5 sm:px-4 sm:py-3 text-sm outline-none transition focus:ring-2   ${
                      errors.message ? "border-red-500" : "border-black/40"
                    }`}
                    aria-invalid={!!errors.message}
                  />
                </div>

                <div className="flex items-center gap-4 mt-2 sm:mt-6">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={state === "submitting"}
                    className={`bg-accent text-white hover:bg-[#7d3d9f] px-4 sm:px-6 py-2 sm:py-2.5 text-sm ${
                      state === "submitting" ? "opacity-80 cursor-not-allowed" : ""
                    }`}
                  >
                    {state === "submitting" ? "Envoi…" : "Envoyer le message"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
