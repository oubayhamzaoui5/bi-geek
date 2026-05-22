"use client"

import Image from "next/image"
import Link from "next/link"
import {
  ArrowRight,
  BarChart3,
  Users,
  Award,
  Settings,
  Clock,
} from "lucide-react"
import { SiWhatsapp } from "react-icons/si"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { ContactSection } from "@/components/ContactSection"

// ─── Data ─────────────────────────────────────────────────────────────────────

const stats = [
  { value: "3×",   label: "Plus de productivité" },
  { value: "92%",  label: "Rétention des talents" },
  { value: "100%", label: "Certifiés à la fin" },
]

const formats = [
  {
    icon: Clock,
    title: "Sessions courtes intensives",
    desc: "De 1 à 3 journées ciblées sur une compétence précise. Mise à niveau rapide d'une équipe sur un outil ou une technologie spécifique.",
    meta: "1–3 jours · 5 à 20 personnes",
  },
  {
    icon: BarChart3,
    title: "Parcours thématiques",
    desc: "Un programme de plusieurs semaines couvrant un domaine complet : Data, IA, Cloud ou Cyber. Format structuré avec projets pratiques et évaluations.",
    meta: "4–8 semaines · Hybride",
  },
  {
    icon: Users,
    title: "Bootcamp d'équipe",
    desc: "Immersion intensive de 8 à 12 semaines pour transformer des profils non techniques en spécialistes opérationnels dans un domaine donné.",
    meta: "8–12 semaines · Présentiel",
  },
  {
    icon: Settings,
    title: "Programme sur mesure",
    desc: "Nous auditons vos équipes, identifions les lacunes et concevons un programme entièrement adapté à vos outils, vos cas d'usage et vos objectifs.",
    meta: "Durée variable · Tous formats",
  },
]

const steps = [
  {
    title: "Audit des besoins",
    desc: "Nous rencontrons vos équipes pour comprendre vos objectifs, évaluer le niveau actuel et identifier les priorités.",
  },
  {
    title: "Programme personnalisé",
    desc: "Nos experts conçoivent un curriculum adapté à votre contexte, vos outils et vos cas d'usage métiers.",
  },
  {
    title: "Formation & accompagnement",
    desc: "Vos équipes sont formées par des professionnels en activité, avec des exercices directement applicables.",
  },
  {
    title: "Certification",
    desc: "Chaque participant reçoit une certification BI Geek validant ses compétences, avec une préparation aux certifications officielles Microsoft, Google et autres éditeurs.",
  },
]

// ─── Helper ───────────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: string }) {
  return (
    <div className="mb-4 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#8b0f82]">
      <span className="h-px w-8 bg-[#8b0f82]" />
      {children}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EntreprisesPage() {
  return (
    <div className="min-h-screen bg-[#fbfaf8] text-zinc-950">
      <Navbar />

      <main>

        {/* ── 1. Hero ─────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden border-b border-zinc-200 bg-white">
          <div className="mx-auto grid min-h-[calc(100vh-64px)] max-w-7xl items-center gap-8 px-4 py-16 md:grid-cols-[1.1fr_0.9fr] md:px-6 md:py-20">

            <div className="relative z-10 max-w-2xl">
              <SectionLabel>BI Geek Entreprises</SectionLabel>

              <h1 className="text-4xl font-semibold tracking-tight text-zinc-950 sm:text-5xl md:text-6xl">
                Formez vos équipes<br />
                avec des experts<br />
                <span className="text-[#8b0f82]">du terrain.</span>
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-8 text-zinc-600">
                BI GEEK conçoit des programmes de formation tech sur mesure pour les entreprises
                qui veulent renforcer les compétences de leurs collaborateurs et ancrer
                une culture tech durable.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="https://wa.me/21658611283"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-[#25D366] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#1ebe5d]"
                >
                  <SiWhatsapp className="h-4 w-4" />
                  Nous contacter
                </Link>
                <Link
                  href="/formations"
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-zinc-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800"
                >
                  Explorer les formations
                </Link>
              </div>

              <div className="mt-10 grid max-w-xl grid-cols-3 gap-4 border-t border-zinc-200 pt-6">
                {stats.map(({ value, label }) => (
                  <div key={label}>
                    <div className="text-2xl font-semibold text-zinc-950">{value}</div>
                    <div className="mt-1 text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="relative overflow-hidden rounded-2xl border border-zinc-200">
                <Image
                  src="/enterprise-bi-geek.webp"
                  alt="Formation professionnelle pour entreprises BI Geek"
                  width={820}
                  height={820}
                  priority
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── 2. Processus ────────────────────────────────────────────── */}
        <section className="border-b border-zinc-200">
          <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 md:grid-cols-[0.85fr_1.15fr] md:px-6 md:py-24">
            <div className="flex flex-col justify-center">
              <SectionLabel>Notre processus</SectionLabel>
              <h2 className="text-3xl font-semibold tracking-tight text-zinc-950 md:text-4xl">
                De l'audit au résultat en 4 étapes.
              </h2>
              <p className="mt-5 max-w-sm text-sm leading-6 text-zinc-600">
                Un processus structuré, transparent et piloté par vos objectifs — pas les nôtres.
              </p>
            </div>
            <div className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
              {steps.map((step, index) => (
                <div key={step.title} className="grid gap-4 p-6 sm:grid-cols-[80px_1fr]">
                  <div className="text-sm font-semibold text-[#8b0f82]">{String(index + 1).padStart(2, "0")}</div>
                  <div>
                    <h3 className="font-semibold text-zinc-950">{step.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-zinc-600">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 3. Formats ──────────────────────────────────────────────── */}
        <section id="programmes" className="border-b border-zinc-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-24">
            <div className="mb-10 flex flex-col gap-5 md:mb-14 md:flex-row md:items-end md:justify-between">
              <div className="max-w-2xl">
                <SectionLabel>Nos formats</SectionLabel>
                <h2 className="text-3xl font-semibold tracking-tight text-zinc-950 md:text-4xl">
                  Un format adapté à{" "}
                  <span className="text-[#8b0f82]">chaque besoin.</span>
                </h2>
              </div>
              <p className="max-w-sm text-sm leading-6 text-zinc-600 md:text-right">
                Du stage d'une journée au parcours de transformation complet, nous nous
                adaptons à votre rythme et vos contraintes.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {formats.map(({ icon: Icon, title, desc, meta }) => (
                <div
                  key={title}
                  className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm"
                >
                  <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-lg bg-[#8b0f82]/10 text-[#8b0f82]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-zinc-950">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-zinc-600">{desc}</p>
                  <p className="mt-4 text-xs font-medium uppercase tracking-wide text-zinc-400">{meta}</p>
                </div>
              ))}
            </div>
          </div>
        </section>


        <ContactSection />

        {/* ── 5. CTA ──────────────────────────────────────────────────── */}
        <section className="bg-zinc-950 py-16 text-white md:py-20">
          <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 md:flex-row md:items-end md:justify-between md:px-6">
            <div className="max-w-2xl">
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-[#f5a7ee]">Commencez maintenant</p>
              <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">
                Prêt à faire monter<br />vos équipes en compétences ?
              </h2>
              <p className="mt-5 max-w-xl text-base leading-7 text-zinc-300">
                Contactez-nous pour un premier échange sans engagement. Nous vous proposons
                une analyse gratuite des besoins de vos équipes.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/formations"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-6 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-100"
              >
                Explorer les formations
              </Link>
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  )
}
