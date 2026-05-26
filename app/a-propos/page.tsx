"use client"

import Image from "next/image"
import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight, Users, Briefcase, Award, MessageCircle, Lightbulb, Target } from "lucide-react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { TestimonialsSection } from "@/components/TestimonialsSection"
import { FaqSection } from "@/components/FaqSection"
import { ContactSection } from "@/components/ContactSection"

// ─── Data ────────────────────────────────────────────────────────────────────



const values = [
  { num: "01", icon: Target,        title: "Ancrage terrain",          desc: "Chaque formateur est un professionnel en activité. Pas de théorie abstraite — chaque cours est construit autour de situations réelles." },
  { num: "02", icon: Briefcase,     title: "Apprentissage par le projet", desc: "Vous construisez un portfolio dès le premier jour. Nos projets sont conçus pour être montrés en entretien." },
  { num: "03", icon: Users,         title: "Accompagnement humain",    desc: "Un mentor attitré, des retours personnalisés, un suivi qui ne s'arrête pas à la fin de la session." },
  { num: "04", icon: Award,         title: "Excellence accessible",    desc: "La qualité de formation ne doit pas être un luxe. Nous rendons l'expertise tech disponible pour tous." },
  { num: "05", icon: Lightbulb,     title: "Innovation pédagogique",   desc: "Nos programmes évoluent en permanence pour refléter les technologies et pratiques qui recrutent aujourd'hui." },
  { num: "06", icon: MessageCircle, title: "Impact mesurable",         desc: "Votre réussite professionnelle est notre seule métrique. Nous vous suivons jusqu'à votre prochain poste." },
]


// ─── Shared components ────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#8b0f82]">
      <span className="h-px w-8 bg-[#8b0f82]" />
      {children}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#fbfaf8] text-zinc-950">
      <Navbar />

      <main>

        {/* ── 1. Hero ─────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden border-b border-zinc-200 bg-white">
          <div className="mx-auto grid min-h-[calc(100vh-64px)] max-w-7xl items-center gap-8 px-4 py-16 md:grid-cols-[1.1fr_0.9fr] md:px-6 md:py-20">

            <div className="relative z-10 max-w-2xl">
              <SectionLabel>À propos de BI Geek</SectionLabel>

              <h1 className="text-4xl font-semibold tracking-tight text-zinc-950 sm:text-5xl md:text-6xl">
                Le centre tech qui<br />
                accélère les carrières<br />
                <span className="text-[#8b0f82]">en Tunisie.</span>
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-8 text-zinc-600">
                Fondé en 2020, BI GEEK forme des professionnels tech immédiatement
                opérationnels grâce à des formateurs en activité, des projets réels
                et un accompagnement qui ne s'arrête pas à la fin de la session.
              </p>

              <div className="mt-10 grid max-w-xl grid-cols-3 gap-4 border-t border-zinc-200 pt-6">
                {[
                  ["+500", "Apprenants formés"],
                  ["+200", "Cours disponibles"],
                  ["2020", "Fondé en"],
                ].map(([value, label]) => (
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
                  src="/about-bi-geek.webp"
                  alt="BI Geek — centre de formation tech en Tunisie"
                  width={820}
                  height={820}
                  priority
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── 2. Mission ──────────────────────────────────────────────── */}
        <section className="border-b border-zinc-200 bg-white">
          <div className="mx-auto max-w-5xl px-4 py-20 md:px-6 md:py-28">
            <div className="flex justify-center">
              <span className="text-sm font-semibold uppercase tracking-[0.22em] text-[#8b0f82] md:text-base">Notre mission</span>
            </div>
            <div className="mt-10 flex flex-col items-center text-center">
              <blockquote className="text-3xl font-semibold tracking-tight text-zinc-950 md:text-4xl lg:text-5xl leading-tight">
                <svg aria-hidden="true" viewBox="0 0 45 36" fill="currentColor" className="mr-3 inline-block h-8 w-8 rotate-180 align-top text-[#8b0f82] md:h-10 md:w-10">
                  <path d="M13 0C6 0 0 6 0 13c0 7 5 12 12 12 1 0 2 0 3-1-1 5-5 9-10 11l3 1c8-2 14-9 14-18C22 8 18 0 13 0zm23 0c-7 0-13 6-13 13 0 7 5 12 12 12 1 0 2 0 3-1-1 5-5 9-10 11l3 1c8-2 14-9 14-18C45 8 41 0 36 0z"/>
                </svg>
                Rendre l&apos;expertise tech{" "}
                <span className="text-[#8b0f82]">accessible, concrète</span>{" "}
                et <span className="text-[#8b0f82]">immédiatement</span> utile pour chaque apprenant.
                <svg aria-hidden="true" viewBox="0 0 45 36" fill="currentColor" className="ml-3 inline-block h-8 w-8 align-bottom text-[#8b0f82] md:h-10 md:w-10">
                  <path d="M13 0C6 0 0 6 0 13c0 7 5 12 12 12 1 0 2 0 3-1-1 5-5 9-10 11l3 1c8-2 14-9 14-18C22 8 18 0 13 0zm23 0c-7 0-13 6-13 13 0 7 5 12 12 12 1 0 2 0 3-1-1 5-5 9-10 11l3 1c8-2 14-9 14-18C45 8 41 0 36 0z"/>
                </svg>
              </blockquote>
            </div>
          </div>
        </section>

        {/* ── 6. Nos valeurs ──────────────────────────────────────────── */}
        <section className="border-b border-zinc-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-24">
            <div className="mb-10 flex flex-col gap-5 md:mb-14 md:flex-row md:items-end md:justify-between">
              <div className="max-w-2xl">
                <SectionLabel>Nos valeurs</SectionLabel>
                <h2 className="text-3xl font-semibold tracking-tight text-zinc-950 md:text-4xl">
                  Ce en quoi{" "}
                  <span className="text-[#8b0f82]">nous croyons.</span>
                </h2>
              </div>
              <p className="max-w-sm text-sm leading-6 text-zinc-600 md:text-right">
                Six principes qui guident chaque décision pédagogique que nous prenons chez BI GEEK.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              {values.map((v, i) => {
                const Icon = v.icon
                return (
                  <div
                    key={v.num}
                    className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm"
                  >
                    <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-lg bg-[#8b0f82]/10 text-[#8b0f82]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-semibold text-zinc-950">{v.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-zinc-600">{v.desc}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <TestimonialsSection />
        <FaqSection />
        <ContactSection />

        {/* ── 7. CTA ──────────────────────────────────────────────────── */}
        <section className="bg-zinc-950 px-4 py-16 text-white md:px-6 md:py-20">
          <div className="mx-auto flex max-w-7xl flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-[#f5a7ee]">Commencez maintenant</p>
              <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">
                Prêt à construire votre<br />prochaine compétence tech ?
              </h2>
              <p className="mt-5 max-w-xl text-base leading-7 text-zinc-300">
                Parcourez nos formations et bootcamps, ou contactez-nous pour être guidé
                vers le programme qui correspond à vos objectifs.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/formations"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-6 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-100"
              >
                Voir les formations
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  )
}
