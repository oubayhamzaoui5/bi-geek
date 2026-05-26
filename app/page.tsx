"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  ArrowRight,
  Award,
  BarChart3,
  BriefcaseBusiness,
  Check,
  Cloud,
  Code2,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react"
import { motion } from "framer-motion"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { TestimonialsSection } from "@/components/TestimonialsSection"
import { FaqSection } from "@/components/FaqSection"
import { ContactSection } from "@/components/ContactSection"
import { ProgramCard } from "@/components/program-card"
import { SiWhatsapp } from "react-icons/si"

type Program = {
  id: string
  type?: "course" | "bootcamp"
  order?: number
  title: string
  shortDescription: string
  durationLabel?: string
  levelLabel?: string
  tags?: string[]
  image?: string | null
  slug?: string
}

const partnerImages = [
  "/p1.webp",
  "/p2.webp",
  "/p3.webp",
  "/p4.webp",
  "/p5.webp",
  "/p6.webp",
  "/p7.webp",
  "/p8.webp",
  "/p9.webp",
  "/p10.webp",
]

const categories = [
  {
    title: "Data Analytics",
    description: "Analysez les données, créez des visualisations et maîtrisez SQL pour prendre des décisions basées sur les données.",
    image: "/category-data-analytics.webp",
    icon: BarChart3,
  },
  {
    title: "AI",
    description: "Découvrez l'intelligence artificielle, le machine learning, le deep learning et leurs applications concrètes.",
    image: "/category-ai.webp",
    icon: Sparkles,
  },
  {
    title: "Cloud",
    description: "Apprenez à déployer, gérer et sécuriser des applications sur des plateformes cloud modernes.",
    image: "/category-cloud.webp",
    icon: Cloud,
  },
  {
    title: "Cyber Security",
    description: "Protégez les systèmes, réseaux et données contre les cyberattaques et menaces numériques.",
    image: "/category-cyber-security.webp",
    icon: ShieldCheck,
  },
  {
    title: "Web Development",
    description: "Développez des sites et applications web modernes en frontend, backend et full-stack.",
    image: "/category-web-development.webp",
    icon: Code2,
  },
  {
    title: "Project Management",
    description: "Planifiez, gérez et pilotez des projets efficacement avec des méthodes agiles et classiques.",
    image: "/category-project-management.webp",
    icon: BriefcaseBusiness,
  },
]

const pillars = [
  {
    icon: Users,
    title: "Experts du terrain",
    desc: "Nos formateurs exercent en entreprise. Pas de théorie creuse : chaque session est ancrée dans des situations professionnelles réelles.",
  },
  {
    icon: BriefcaseBusiness,
    title: "Projets concrets",
    desc: "Vous construisez un portfolio de projets professionnels présentables dès le premier jour. Apprenez en faisant.",
  },
  {
    icon: Award,
    title: "Certifié & reconnu",
    desc: "Certification BI GEEK à chaque fin de parcours. Préparation aux certifications officielles Microsoft, AWS et autres.",
  },
  {
    icon: MessageCircle,
    title: "Mentorat continu",
    desc: "Accès à votre mentor pendant et après la formation. Retours personnalisés et suivi jusqu'à votre prochain poste.",
  },
]

const steps = [
  {
    title: "Choisissez votre programme",
    desc: "Parcourez formations et bootcamps, filtrez par domaine ou niveau. Trouvez le parcours qui correspond à votre objectif.",
  },
  {
    title: "Apprenez avec des experts",
    desc: "Sessions live avec des professionnels en activité. Posez des questions, échangez, apprenez de vraies expériences terrain.",
  },
  {
    title: "Pratiquez sur des cas réels",
    desc: "Chaque programme intègre des projets concrets issus de contextes professionnels. Construisez un portfolio solide.",
  },
  {
    title: "Certifiez & progressez",
    desc: "Obtenez votre certification BI GEEK et accédez au réseau de nos partenaires recruteurs pour accélérer votre carrière.",
  },
]

const certifications = ["/i1.webp", "/i2.webp", "/i3.webp", "/i4.webp", "/i5.webp", "/i6.webp"]

const certCards = [
  // Microsoft
  { code: "PL-300",   name: "Power BI Data Analyst Associate",              org: "Microsoft",       desc: "Analysez et visualisez des données métier avec Power BI.",                           featured: true  },
  { code: "PL-500",   name: "Power Automate RPA Developer",                 org: "Microsoft",       desc: "Automatisez les processus avec Power Automate Desktop et les flux RPA.",             featured: false },
  { code: "DP-900",   name: "Azure Data Fundamentals",                      org: "Microsoft",       desc: "Maîtrisez les fondamentaux des données cloud avec Microsoft Azure.",                 featured: false },
  { code: "PL-100",   name: "Power Platform App Maker",                     org: "Microsoft",       desc: "Créez des applications métier low-code avec Power Apps.",                            featured: false },
  { code: "AZ-900",   name: "Azure Fundamentals",                           org: "Microsoft",       desc: "Comprenez les bases du cloud computing avec Microsoft Azure.",                       featured: false },
  { code: "DP-203",   name: "Azure Data Engineer Associate",                org: "Microsoft",       desc: "Concevez des solutions de données à grande échelle sur Azure.",                      featured: false },
  { code: "PL-400",   name: "Power Platform Developer",                     org: "Microsoft",       desc: "Développez des connecteurs et solutions avancées Power Platform.",                   featured: false },
  { code: "PL-200",   name: "Power Platform Functional Consultant",         org: "Microsoft",       desc: "Configurez et déployez Power Platform en environnement d'entreprise.",              featured: false },
  // Python Institute
  { code: "PCEP",     name: "Certified Entry-Level Python Programmer",      org: "Python Institute", desc: "Maîtrisez les bases de Python — variables, boucles, fonctions et fichiers.",        featured: false },
  { code: "PCAP",     name: "Certified Associate in Python Programming",    org: "Python Institute", desc: "Approfondissez Python avec OOP, modules, exceptions et bibliothèques standard.",    featured: false },
  { code: "PCPP1",    name: "Certified Professional Python Programming 1",  org: "Python Institute", desc: "Python avancé — métaclasses, décorateurs, concurrence et performance.",            featured: false },
  // NVIDIA DLI
  { code: "DLI",      name: "Fundamentals of Deep Learning",                org: "NVIDIA",          desc: "Construisez et entraînez des réseaux de neurones avec TensorFlow et Keras.",         featured: false },
  { code: "DLI-NLP",  name: "Transformer-Based NLP Applications",           org: "NVIDIA",          desc: "Développez des applications NLP avec des modèles Transformer et BERT.",              featured: false },
  { code: "DLI-CV",   name: "Computer Vision with Deep Learning",           org: "NVIDIA",          desc: "Maîtrisez la vision par ordinateur avec CNN et architectures modernes.",             featured: false },
  // Scrum Institute
  { code: "SSM",      name: "Scrum Master Certified",                       org: "Scrum Institute", desc: "Dirigez des équipes agiles avec les principes et pratiques Scrum.",                  featured: false },
  { code: "SSPO",     name: "Scrum Product Owner Certified",                org: "Scrum Institute", desc: "Gérez le backlog produit et maximisez la valeur des sprints.",                       featured: false },
  { code: "SKSF",     name: "Scrum at Scale Framework",                     org: "Scrum Institute", desc: "Appliquez Scrum à l'échelle dans de grandes organisations.",                        featured: false },
  // IQBBA
  { code: "CFLBA",    name: "Certified Foundation Level Business Analyst",  org: "IQBBA",           desc: "Analysez les besoins métier et rédigez des spécifications fonctionnelles.",          featured: false },
  { code: "CPRE-FL",  name: "Certified Professional Requirements Engineer", org: "IQBBA",           desc: "Maîtrisez l'ingénierie des exigences logicielles au niveau fondation.",              featured: false },
  // ISTQB
  { code: "CTFL",     name: "Certified Tester Foundation Level",            org: "ISTQB",           desc: "Maîtrisez les fondamentaux du test logiciel selon les standards internationaux.",    featured: false },
  { code: "CTAL-TA",  name: "Certified Tester Advanced — Test Analyst",    org: "ISTQB",           desc: "Test structurel et fonctionnel avancé — techniques et analyse de risques.",          featured: false },
  { code: "CTAL-TM",  name: "Certified Tester Advanced — Test Manager",    org: "ISTQB",           desc: "Planification, suivi et gestion complète d'une stratégie de test.",                  featured: false },
]

const orgMeta: Record<string, { accent: string; label: string }> = {
  "Microsoft":       { accent: "#8b0f82", label: "Microsoft"        },
  "Python Institute":{ accent: "#3776AB", label: "Python Institute"  },
  "NVIDIA":          { accent: "#76B900", label: "NVIDIA"            },
  "Scrum Institute": { accent: "#009FDA", label: "Scrum Institute"   },
  "IQBBA":           { accent: "#E55B2D", label: "IQBBA"             },
  "ISTQB":           { accent: "#003F7F", label: "ISTQB"             },
}

const dataAnalyticsBootcampStats = [
  { label: "Durée", value: "192 Heures / 6 Mois" },
  { label: "Format", value: "Présentiel / En ligne" },
  { label: "Certifications", value: "5" },
]

const dataAnalyticsBootcampSkills = ["Excel", "SQL", "Python", "Power BI", "Tableau", "Data Storytelling"]

const dataAnalyticsBootcampOutcomes = [
  "Maîtriser l'analyse de données de bout en bout",
  "Construire des dashboards professionnels",
  "Préparer un portfolio orienté recrutement",
  "Possibilité de stage après le parcours",
]

const heroDomains = [
  "Business Intelligence",
  "Data Analytics",
  "Data Engineering",
  "Machine Learning",
  "Cloud & DevOps",
  "Développement Web",
]

type TypingPhase = "typing" | "pausing" | "deleting"

function SectionLabel({ children }: { children: string }) {
  return (
    <div className="mb-4 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#8b0f82]">
      <span className="h-px w-8 bg-[#8b0f82]" />
      {children}
    </div>
  )
}

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title: React.ReactNode
  description?: string
}) {
  return (
    <div className="mb-10 flex flex-col gap-5 md:mb-14 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        <SectionLabel>{eyebrow}</SectionLabel>
        <h2 className="text-3xl font-semibold tracking-tight text-zinc-950 md:text-4xl">{title}</h2>
      </div>
      {description ? <p className="max-w-sm text-sm leading-6 text-zinc-600 md:text-right">{description}</p> : null}
    </div>
  )
}

function HeroTitle() {
  const [domainIndex, setDomainIndex] = useState(0)
  const [phase, setPhase] = useState<TypingPhase>("typing")
  const [displayText, setDisplayText] = useState("")

  useEffect(() => {
    const current = heroDomains[domainIndex]
    const delay = phase === "pausing" ? 1200 : phase === "deleting" ? 35 : 55

    const timeout = window.setTimeout(() => {
      if (phase === "typing") {
        if (displayText.length < current.length) {
          setDisplayText(current.slice(0, displayText.length + 1))
        } else {
          setPhase("pausing")
        }
        return
      }

      if (phase === "deleting") {
        if (displayText.length > 0) {
          setDisplayText(current.slice(0, displayText.length - 1))
        } else {
          setDomainIndex((index) => (index + 1) % heroDomains.length)
          setPhase("typing")
        }
        return
      }

      setPhase("deleting")
    }, delay)

    return () => window.clearTimeout(timeout)
  }, [displayText, domainIndex, phase])

  return (
    <h1 className="text-4xl font-semibold tracking-tight text-zinc-950 sm:text-5xl md:text-6xl">
      <span className="block">Formations modernes</span>
      <span>en </span>
      <span className="inline-flex min-h-[1.15em] items-baseline text-[#8b0f82]">
        <span>{displayText || "\u00A0"}</span>
        <span className="ml-1 inline-block h-[0.85em] w-[3px] animate-pulse rounded-full bg-[#8b0f82] translate-y-1" aria-hidden />
      </span>
    </h1>
  )
}

function DataAnalyticsBootcampAd() {
  return (
    <section className="py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
      <div className="overflow-hidden rounded-2xl bg-zinc-950 text-white">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr] md:items-stretch">

          {/* Left — content */}
          <div className="relative flex flex-col justify-center px-8 py-10 md:px-12 md:py-14">
            {/* subtle purple glow */}
            <div className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full bg-[#8b0f82]/30 blur-3xl" aria-hidden />

            <div className="relative">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#f5a7ee]">
                <Sparkles className="h-3.5 w-3.5" />
                Bootcamp Data Analytics
              </div>

              <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
                Devenez Data Analyst en 6 mois — intensif, concret, certifiant.
              </h2>

              <p className="mt-4 text-sm leading-7 text-zinc-400">
                Maîtrisez les outils les plus demandés du marché, de l'analyse à la visualisation, avec un accompagnement structuré jusqu'à la certification.
              </p>

              {/* Stats row */}
              <div className="mt-6 flex divide-x divide-white/10 rounded-xl border border-white/10 bg-white/5">
                {dataAnalyticsBootcampStats.map((stat) => (
                  <div key={stat.label} className="flex-1 px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">{stat.label}</p>
                    <p className="mt-1 text-sm font-semibold text-white">{stat.value}</p>
                  </div>
                ))}
              </div>

              {/* Skills */}
              <div className="mt-5">
                <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Outils maîtrisés</p>
                <div className="flex flex-wrap gap-1.5">
                  {dataAnalyticsBootcampSkills.map((skill) => (
                    <span key={skill} className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs font-medium text-zinc-300">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* CTAs */}
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link
                  href="/bootcamp/bootcamp-data-analytics"
                  className="inline-flex items-center gap-2 rounded-md bg-white px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-100"
                >
                  Voir le bootcamp
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/formations"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-400 transition hover:text-white"
                >
                  Toutes les formations
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>

          {/* Right — image flush */}
          <Link href="/bootcamp/bootcamp-data-analytics" className="group relative block aspect-[16/10] overflow-hidden md:aspect-auto">
            <div className="absolute inset-0 bg-[#8b0f82]/10 opacity-0 transition group-hover:opacity-100" />
            <Image
              src="/bootcamp-data-analytics-new.webp"
              alt="Bootcamp Data Analytics BI Geek"
              width={1672}
              height={941}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
              sizes="(min-width: 768px) 50vw, 100vw"
            />
          </Link>

        </div>
      </div>
      </div>
    </section>
  )
}


function ProgramGrid() {
  const [programs, setPrograms] = useState<Program[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function loadFeatured() {
      try {
        const res = await fetch("/api/featured")
        const contentType = res.headers.get("content-type") ?? ""
        if (!res.ok || !contentType.includes("application/json")) return

        const data = await res.json()
        if (!mounted || !data.ok) return

        const items = Array.isArray(data.programs)
          ? data.programs
          : [
              ...(data.bootcamps || []).map((p: Program) => ({ ...p, type: "bootcamp" as const })),
              ...(data.courses || []).map((p: Program) => ({ ...p, type: "course" as const })),
            ]
        setPrograms(items.slice(0, 3))
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadFeatured()
    return () => {
      mounted = false
    }
  }, [])

  const skeletons = [1, 2, 3]

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-24">
      <div className="mb-10 flex flex-col gap-5 md:mb-14 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <SectionLabel>Programmes populaires</SectionLabel>
          <h2 className="text-3xl font-semibold tracking-tight text-zinc-950 md:text-4xl">Nos <span className="text-[#8b0f82]">formations</span></h2>
          <Link
            href="/formations"
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[#8b0f82] transition hover:text-[#710c6a]"
          >
            Voir toutes les formations
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <p className="max-w-sm text-sm leading-6 text-zinc-600 md:text-right">Des parcours courts ou intensifs, construits autour de projets et compétences immédiatement utiles.</p>
      </div>

      {loading ? (
        <div className="grid gap-5 md:grid-cols-3">
          {skeletons.map((i) => (
            <div key={i} className="h-80 animate-pulse rounded-lg border border-zinc-200 bg-zinc-100" />
          ))}
        </div>
      ) : (
        <div>
          {programs.length > 0 && (
            <div>
              <div className="grid gap-5 md:grid-cols-3">
                {programs.map((p) => (
                  <ProgramCard key={`${p.type ?? "course"}-${p.id}`} program={p} />
                ))}
              </div>
            </div>
          )}
          {programs.length === 0 && (
            <div className="rounded-lg border border-zinc-200 bg-white p-8 text-sm text-zinc-600">
              Les programmes populaires seront affichés ici dès que la sélection sera disponible.
            </div>
          )}
        </div>
      )}

    </section>
  )
}

function OrgLogo({ org, accent }: { org: string; accent: string }) {
  if (org === "Microsoft") return (
    <svg width="18" height="18" viewBox="0 0 21 21" fill="none" className="shrink-0">
      <rect x="0" y="0" width="10" height="10" fill="#F25022"/>
      <rect x="11" y="0" width="10" height="10" fill="#7FBA00"/>
      <rect x="0" y="11" width="10" height="10" fill="#00A4EF"/>
      <rect x="11" y="11" width="10" height="10" fill="#FFB900"/>
    </svg>
  )
  if (org === "Python Institute") return (
    <svg width="18" height="18" viewBox="0 0 256 255" className="shrink-0">
      <defs>
        <linearGradient id="pyBlue" x1="12%" y1="12%" x2="75%" y2="75%">
          <stop offset="0" stopColor="#387EB8"/>
          <stop offset="100%" stopColor="#366994"/>
        </linearGradient>
        <linearGradient id="pyYellow" x1="25%" y1="25%" x2="88%" y2="88%">
          <stop offset="0" stopColor="#FFE052"/>
          <stop offset="100%" stopColor="#FFC331"/>
        </linearGradient>
      </defs>
      <path fill="url(#pyBlue)" d="M126.9 2.2C62.7 2.2 66.3 30 66.3 30l.1 28.8h61.8v8.6H43.9S2 62.5 2 127.3c0 64.9 35.9 62.6 35.9 62.6h21.4v-30.1s-1.2-35.9 35.3-35.9h60.8s34.2.5 34.2-33V37.2s5.2-35-62.7-35zm-34 19.9a11.1 11.1 0 110 22.2 11.1 11.1 0 010-22.2z"/>
      <path fill="url(#pyYellow)" d="M129.1 252.8c64.2 0 60.6-27.8 60.6-27.8l-.1-28.8H127.8v-8.6h84.3s41.9 4.9 41.9-59.9c0-64.9-35.9-62.6-35.9-62.6H196.7v30.1s1.2 35.9-35.3 35.9H100.6S66.4 131.6 66.4 165v51.8s-5.2 35 62.7 35zm34-19.9a11.1 11.1 0 110-22.2 11.1 11.1 0 010 22.2z"/>
    </svg>
  )
  if (org === "NVIDIA") return (
    <svg width="18" height="18" viewBox="0 0 100 100" className="shrink-0" fill="none">
      <rect width="100" height="100" rx="8" fill="#76B900"/>
      <path d="M18 62V38l22 12-22 12zm0 0" fill="white"/>
      <path d="M46 32v36l10-6V38l-10-6zm0 0" fill="white"/>
      <path d="M62 38v24l20-12-20-12zm0 0" fill="white"/>
    </svg>
  )
  if (org === "Scrum Institute") return (
    <svg width="18" height="18" viewBox="0 0 100 100" className="shrink-0" fill="none">
      <circle cx="50" cy="50" r="46" stroke="#009FDA" strokeWidth="8" fill="none"/>
      <path d="M50 20 A30 30 0 0 1 80 50" stroke="#009FDA" strokeWidth="8" strokeLinecap="round" fill="none"/>
      <path d="M80 50 A30 30 0 0 1 50 80" stroke="#009FDA" strokeWidth="8" strokeLinecap="round" fill="none"/>
      <path d="M50 80 A30 30 0 0 1 20 50" stroke="#009FDA" strokeWidth="8" strokeLinecap="round" fill="none"/>
      <path d="M20 50 A30 30 0 0 1 50 20" stroke="#009FDA" strokeWidth="6" strokeLinecap="round" strokeDasharray="4 8" fill="none"/>
    </svg>
  )
  if (org === "IQBBA") return (
    <svg width="44" height="18" viewBox="0 0 110 40" className="shrink-0">
      <rect width="110" height="40" rx="5" fill="#1B3A5C"/>
      <text x="55" y="27" textAnchor="middle" fontFamily="Arial" fontWeight="700" fontSize="18" fill="white" letterSpacing="1">IQBBA</text>
    </svg>
  )
  if (org === "ISTQB") return (
    <svg width="44" height="18" viewBox="0 0 110 40" className="shrink-0">
      <rect width="110" height="40" rx="5" fill="#003F7F"/>
      <text x="55" y="27" textAnchor="middle" fontFamily="Arial" fontWeight="700" fontSize="18" fill="white" letterSpacing="1">ISTQB</text>
    </svg>
  )
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[9px] font-black text-white" style={{ backgroundColor: accent }}>
      {org.slice(0, 2).toUpperCase()}
    </span>
  )
}

function CertCarousel() {
  const [paused, setPaused] = useState(false)
  const doubled = [...certCards, ...certCards]
  return (
    <div className="mx-auto max-w-7xl px-4 md:px-6">
      <div
        className="overflow-hidden pb-10 cursor-default select-none"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
      <div
        className="flex gap-5"
        style={{
          width: "max-content",
          animation: "cert-marquee 80s linear infinite",
          animationPlayState: paused ? "paused" : "running",
        }}
      >
        {doubled.map((cert, i) => {
          const meta = orgMeta[cert.org] ?? { accent: "#8b0f82", label: cert.org }
          return (
            <div
              key={i}
              className="cert-card relative w-72 shrink-0 overflow-hidden rounded-2xl border border-zinc-200 bg-white p-6"
              style={{
                borderTopWidth: "3px",
                borderTopColor: meta.accent,
                boxShadow: "0 2px 12px 0 rgba(0,0,0,0.07)",
              }}
            >
              {/* Org logo row */}
              <div className="mb-5 flex items-center gap-2.5">
                <OrgLogo org={cert.org} accent={meta.accent} />
                <span className="cert-org text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
                  {meta.label}
                </span>
              </div>

              <div className="cert-code text-4xl font-bold tracking-tight leading-none text-zinc-950">
                {cert.code}
              </div>
              <div className="cert-name mt-2 text-[13px] font-medium leading-5 text-zinc-500">
                {cert.name}
              </div>
              <div className="cert-desc mt-4 text-[12px] leading-5 text-zinc-400">
                {cert.desc}
              </div>
            </div>
          )
        })}
      </div>
    </div>
    </div>
  )
}

export default function Home() {
  return (
    <div className="min-h-screen bg-[#fbfaf8] text-zinc-950">
      <Navbar />

      <main className="homepage-system-font">
        <section className="relative overflow-hidden border-b border-zinc-200 bg-white">
          <div className="mx-auto grid min-h-[calc(100vh-64px)] max-w-[86rem] items-center gap-8 px-3 py-16 md:grid-cols-[1.14fr_0.86fr] md:px-4 md:py-20">
            <div className="relative z-10 max-w-3xl">
              <SectionLabel>Centre de Formation Tech</SectionLabel>
              <HeroTitle />
              <p className="mt-6 max-w-xl text-lg leading-8 text-zinc-600">
                Des parcours concrets pour accélérer votre carrière avec des experts du terrain, des projets réels et
                un mentorat personnalisé.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/formations"
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-[#8b0f82] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#710c6a]"
                >
                  Nos formations
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="https://wa.me/21658611283"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-[#25D366] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#1ebe5d]"
                >
                  <SiWhatsapp className="h-4 w-4" />
                  Nous contacter
                </Link>
              </div>
              <div className="mt-10 grid max-w-xl grid-cols-2 gap-4 border-t border-zinc-200 pt-6">
                {[
                  ["+500", "Apprenants formés"],
                  ["+20", "Formateurs experts"],
                ].map(([value, label]) => (
                  <div key={label}>
                    <div className="text-2xl font-semibold text-zinc-950">{value}</div>
                    <div className="mt-1 text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="relative overflow-hidden rounded-2xl">
                <Image
                  src="/hero-training-room.webp"
                  alt="Apprentissage data et business intelligence"
                  width={1200}
                  height={900}
                  priority
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        <DataAnalyticsBootcampAd />

        <section id="about" className="mx-auto grid max-w-7xl gap-12 px-4 py-16 md:grid-cols-2 md:px-6 md:py-24">
          <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white">
            <Image
              src="/about-bi-geek.webp"
              alt="Formation BI Geek avec mentorat"
              width={820}
              height={820}
              className="h-full min-h-[360px] w-full object-cover"
            />
          </div>
          <div className="flex flex-col justify-center">
            <SectionLabel>Qui sommes-nous</SectionLabel>
            <h2 className="text-3xl font-semibold tracking-tight text-zinc-950 md:text-5xl">
              Nous accélérons les <span className="text-[#8b0f82]">carrières tech.</span>
            </h2>
            <p className="mt-6 text-base leading-7 text-zinc-600">
              Chez <strong className="font-semibold text-zinc-950">BI GEEK</strong>, nous formons des profils
              immédiatement opérationnels grâce à des experts du terrain, des projets réels et un mentorat personnalisé.
            </p>
            <div className="mt-8 flex gap-10">
              {[
                ["+500", "Apprenants formés"],
                ["+20", "Formateurs experts"],
              ].map(([value, label]) => (
                <div key={label}>
                  <div className="text-4xl font-semibold text-[#8b0f82]">{value}</div>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
                </div>
              ))}
            </div>
            <Link
              href="/a-propos"
              className="mt-8 inline-flex w-fit items-center gap-2 rounded-md bg-zinc-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800"
            >
              En savoir plus
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        <section className="border-y border-zinc-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-24">
            <div className="grid gap-12 md:grid-cols-2">
              <div>
                <SectionLabel>BI Geek Pour Entreprises</SectionLabel>
                <h2 className="text-3xl font-semibold tracking-tight text-zinc-950 md:text-4xl">
                  Investissez dans l'excellence de<br /><span className="text-[#8b0f82]">vos équipes.</span>
                </h2>
                <p className="mt-5 max-w-xl text-base leading-7 text-zinc-600">
                  Nous concevons et délivrons des programmes de formation tech sur mesure pour les entreprises qui
                  souhaitent renforcer les compétences de leurs collaborateurs et rester à la pointe de l'innovation.
                </p>
                <ul className="mt-8 space-y-3">
                  {[
                    "Programmes conçus autour de vos enjeux métiers réels",
                    "Formateurs experts en activité professionnelle",
                    "Suivi des progressions et certification collective",
                  ].map((item) => (
                    <li key={item} className="flex gap-3 text-sm font-medium text-zinc-700">
                      <Check className="mt-0.5 h-4 w-4 text-[#8b0f82]" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/entreprises"
                  className="mt-8 inline-flex items-center gap-2 rounded-md bg-zinc-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800"
                >
                  Découvrir nos offres entreprises
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100">
                <Image
                  src="/enterprise-bi-geek.webp"
                  alt="Formation professionnelle pour entreprises BI Geek"
                  width={900}
                  height={675}
                  className="h-full min-h-[360px] w-full object-cover"
                />
              </div>
            </div>

            <div className="mt-14 border-t border-zinc-200 pt-14">
              <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#8b0f82]">
                    Institutions partenaires
                  </p>
                  <h3 className="text-xl font-semibold tracking-tight text-zinc-950 md:text-2xl">
                    Un réseau qui donne du poids à votre parcours.
                  </h3>
                </div>
                <p className="max-w-sm text-sm leading-6 text-zinc-600 md:text-right">
                  BI GEEK s'inscrit dans un écosystème d'écoles, d'entreprises et d'organisations qui valorisent les compétences tech concrètes.
                </p>
              </div>
              <div className="grid grid-cols-2 items-center gap-x-8 gap-y-8 sm:grid-cols-5">
                {partnerImages.map((src) => (
                  <div key={src} className="flex items-center justify-center">
                    <div className="relative h-24 w-52 opacity-80 transition hover:opacity-100">
                      <Image src={src} alt="Partenaire BI Geek" fill className="object-contain" sizes="208px" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <ProgramGrid />

        <section className="border-b border-zinc-200 bg-[#fbfaf8]">
          <div className="mx-auto max-w-7xl px-4 pt-20 pb-6 md:px-6">
            <div className="mb-14 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div>
                <SectionLabel>Certifications</SectionLabel>
                <h2 className="mt-3 max-w-xl text-3xl font-semibold tracking-tight text-zinc-950 md:text-4xl">
                  Passez des certifications<br />officielles reconnues<br /><span className="text-[#8b0f82]">à l&apos;échelle internationale.</span>
                </h2>
              </div>
              <p className="max-w-sm text-sm leading-6 text-zinc-500">
                Nos parcours vous préparent aux certifications Microsoft officielles — PL-300, PL-500, DP-900 et plus — avec un accompagnement structuré jusqu&apos;à l&apos;examen.
              </p>
            </div>
          </div>
          <CertCarousel />
          <div className="pb-8" />
        </section>

        {/* ── Online Learning ─────────────────────────────────────── */}
        <section className="relative overflow-hidden border-b border-zinc-200 bg-white">
          {/* Above image */}
          <div className="mx-auto max-w-3xl px-4 pb-6 pt-10 text-center md:px-6 md:pt-14">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#8b0f82]/20 bg-[#8b0f82]/5 px-4 py-1.5">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#8b0f82]" />
              <span className="text-xs font-semibold uppercase tracking-widest text-[#8b0f82]">Au centre ou en ligne</span>
            </div>
            <h2 className="text-3xl font-semibold tracking-tight text-zinc-950 md:text-4xl">
              Apprenez <span className="text-[#8b0f82]">dans le format qui vous convient.</span>
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-zinc-600">
              Suivez votre formation dans notre centre avec un formateur, ou à distance en live avec replays et projets pratiques. Vous gardez le même accompagnement, quel que soit le format choisi.
            </p>
          </div>

          {/* Image — same container width as other sections */}
          <div className="mx-auto max-w-7xl px-4 md:px-6">
            <img
              src="/online-learning.webp"
              alt="Formation BI Geek au centre ou en ligne"
              className="w-full"
            />
          </div>

          {/* Below image — 4-col features */}
          <div className="mx-auto max-w-7xl px-4 pb-10 pt-6 md:px-6 md:pb-14">
            <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-4">
              {[
                { label: "Présentiel au centre", sub: "Apprenez avec nos formateurs sur place" },
                { label: "Sessions en ligne", sub: "Suivez les cours live à distance" },
                { label: "Replay et ressources", sub: "Revoyez les cours à votre rythme" },
                { label: "Projets pratiques", sub: "Corrigés et suivis avec votre mentor" },
              ].map(({ label, sub }) => (
                <div key={label} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#8b0f82]/10 text-[#8b0f82]">
                    <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-zinc-950">{label}</p>
                    <p className="mt-0.5 text-xs leading-5 text-zinc-500">{sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-zinc-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-24">
            <div>
              <SectionHeader
                eyebrow="Pourquoi BI Geek"
                title={<>Ce qui nous <span className="text-[#8b0f82]">différencie</span></>}
                description="Une formation pensée pour votre carrière, pas pour la salle de classe."
              />
            </div>
            <div className="grid gap-5 md:grid-cols-4">
              {pillars.map(({ icon: Icon, title, desc }, i) => (
                <div
                  key={title}
                  className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm"
                >
                  <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-lg bg-[#8b0f82]/10 text-[#8b0f82]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-zinc-950">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-zinc-600">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-24">
          <div>
            <SectionHeader eyebrow="Domaines" title={<>Explorez nos domaines d&apos;<span className="text-[#8b0f82]">expertise</span></>} />
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {categories.map(({ icon: Icon, title, description, image }, i) => (
              <div key={title}>
                <Link
                  href={`/formations?category=${encodeURIComponent(title)}`}
                  className="group block overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-zinc-200/70"
                >
                  <div className="relative aspect-[16/10]">
                    <Image src={image} alt={title} fill className="object-cover" sizes="(min-width: 768px) 33vw, 100vw" />
                  </div>
                  <div className="p-5">
                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-[#8b0f82]/10 text-[#8b0f82]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg font-semibold text-zinc-950">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-zinc-600">{description}</p>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </section>

        <TestimonialsSection />
        <FaqSection />
        <ContactSection />

        <section className="bg-zinc-950 py-16 text-white md:py-20">
          <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 md:flex-row md:items-end md:justify-between md:px-6">
            <div className="max-w-2xl">
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-[#f5a7ee]">Commencez maintenant</p>
              <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">Prêt à construire votre prochaine compétence tech ?</h2>
              <p className="mt-5 max-w-xl text-base leading-7 text-zinc-300">
                Rejoignez +500 apprenants qui ont choisi BI GEEK pour maîtriser les technologies qui recrutent.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/formations"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-6 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-100"
              >
                Parcourir les formations
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
