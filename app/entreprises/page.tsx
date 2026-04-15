"use client"

import Image from "next/image"
import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight, BarChart3, Users, Award, Settings, Clock, ShieldCheck } from "lucide-react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"

// ─── Data ────────────────────────────────────────────────────────────────────

const impacts = [
  {
    icon: BarChart3,
    value: "3×",
    label: "Plus de productivité",
    desc: "Les équipes formées produisent en moyenne trois fois plus rapidement sur leurs nouvelles compétences.",
  },
  {
    icon: Users,
    value: "92%",
    label: "Rétention des talents",
    desc: "Les entreprises qui investissent dans la formation conservent leurs meilleurs profils significativement plus longtemps.",
  },
  {
    icon: Award,
    value: "100%",
    label: "Certifiés à la fin",
    desc: "Chaque collaborateur reçoit une certification BI Geek validant ses nouvelles compétences auprès des pairs.",
  },
]

const formats = [
  {
    num: "01",
    title: "Sessions courtes intensives",
    desc: "De une à trois journées ciblées sur une compétence précise. Idéal pour une mise à niveau rapide d'une équipe sur un outil ou une technologie spécifique.",
    tags: ["1–3 jours", "Sur site ou distanciel", "Groupe de 5 à 20"],
  },
  {
    num: "02",
    title: "Parcours thématiques",
    desc: "Un programme de plusieurs semaines couvrant un domaine complet : Data, IA, Cloud ou Cyber. Format structuré avec projets pratiques et évaluations.",
    tags: ["4–8 semaines", "Hybride", "Groupe de 8 à 15"],
  },
  {
    num: "03",
    title: "Bootcamp d'équipe",
    desc: "Une immersion intensive sur 8 à 12 semaines, calibrée pour transformer des profils non techniques en spécialistes opérationnels dans un domaine donné.",
    tags: ["8–12 semaines", "Présentiel privilégié", "Jusqu'à 20 personnes"],
  },
  {
    num: "04",
    title: "Programme sur mesure",
    desc: "Nous auditons vos équipes, identifions les lacunes et concevons un programme entièrement adapté à vos outils internes, vos cas d'usage et vos objectifs.",
    tags: ["Durée variable", "Tous formats", "Toutes tailles"],
  },
]

const process = [
  {
    num: "01",
    title: "Audit des besoins",
    desc: "Nous rencontrons vos équipes et votre direction pour comprendre vos objectifs, évaluer le niveau actuel de vos collaborateurs et identifier les priorités.",
  },
  {
    num: "02",
    title: "Programme personnalisé",
    desc: "Nos experts conçoivent un curriculum adapté à votre contexte, vos outils et vos cas d'usage métiers. Aucun programme générique.",
  },
  {
    num: "03",
    title: "Formation & accompagnement",
    desc: "Vos équipes sont formées par des professionnels en activité, avec des exercices pratiques directement applicables dans votre environnement de travail.",
  },
  {
    num: "04",
    title: "Bilan & certification",
    desc: "Un rapport de progression détaillé, des évaluations individuelles et une certification BI Geek pour chaque participant à la clé.",
  },
]

const domains = [
  { title: "Data & Business Intelligence", desc: "Power BI, SQL, Python analytique, dashboarding, modélisation de données." },
  { title: "Intelligence Artificielle", desc: "Machine Learning, LLM, automatisation, cas d'usage IA métier." },
  { title: "Cloud & DevOps", desc: "Azure, AWS, infrastructure as code, CI/CD, conteneurisation." },
  { title: "Cyber Security", desc: "Sensibilisation, gestion des risques, audit sécurité, réponse aux incidents." },
  { title: "Développement Web", desc: "React, Node.js, APIs, architecture moderne, bonnes pratiques." },
  { title: "Gestion de projet", desc: "Agile, Scrum, pilotage de roadmap, outils de collaboration." },
]

const differentiators = [
  {
    icon: Settings,
    title: "Aucun programme générique",
    desc: "Chaque formation est construite en fonction de vos outils, votre secteur et vos objectifs. Pas de contenu copié-collé d'un client à l'autre.",
  },
  {
    icon: Users,
    title: "Formateurs praticiens",
    desc: "Nos formateurs exercent leur métier en entreprise. Ce qu'ils enseignent, ils le font encore aujourd'hui.",
  },
  {
    icon: Clock,
    title: "Délai de déploiement rapide",
    desc: "De la prise de contact à la première session : deux semaines en moyenne. Nous nous adaptons à votre calendrier.",
  },
  {
    icon: ShieldCheck,
    title: "Résultats garantis",
    desc: "Si votre équipe n'atteint pas les objectifs définis ensemble, nous reprenons les modules concernés sans frais supplémentaires.",
  },
]

// ─── Helper ───────────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="h-px w-8 bg-accent" />
      <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent font-medium">
        {children}
      </span>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EntreprisesPage() {
  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="px-4 md:px-16">

        {/* ── 1. Hero ─────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden pt-20 pb-16 md:pt-32 md:pb-28 -mx-4 md:-mx-16 px-4 md:px-16 border-b border-border">

          {/* Right — image bleeding from edge */}
          <div
            className="hidden md:block absolute right-0 top-0 bottom-0 w-[44%] bg-muted"
            style={{
              maskImage: "linear-gradient(to right, transparent 0%, black 18%)",
              WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 18%)",
            }}
          >
            <Image
              src="/enterprise-hero.webp"
              alt="Formation professionnelle pour équipes — BI Geek Entreprises"
              fill
              priority
              className="object-cover"
            />
            <div
              className="absolute inset-0"
              style={{ background: "oklch(0.68 0.28 308 / 0.06)" }}
              aria-hidden
            />
          </div>

          {/* Ambient orb */}
          <div
            aria-hidden
            className="pointer-events-none absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full blur-[120px] opacity-[0.12]"
            style={{ background: "#C84FFF" }}
          />

          {/* Left — content */}
          <div className="relative z-10 md:max-w-[54%]">

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <SectionLabel>BI Geek Entreprises</SectionLabel>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.1 }}
              className="font-display font-bold text-foreground leading-tight tracking-tight mt-4 mb-6"
              style={{ fontSize: "clamp(2.2rem, 4.5vw, 3.8rem)" }}
            >
              Des équipes tech<br />
              <span className="text-accent">à la hauteur de vos ambitions.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.22 }}
              className="text-base md:text-lg text-muted-foreground leading-relaxed mb-10 max-w-md"
            >
              Nous concevons des programmes de formation sur mesure pour les entreprises
              qui veulent transformer les compétences de leurs équipes et ancrer une
              culture tech durable dans leur organisation.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.32 }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <Link
                href="/#contact"
                className="group inline-flex items-center justify-center gap-2 bg-accent text-white px-7 py-3.5 text-sm font-semibold hover:bg-accent/90 transition-all"
              >
                Demander un devis
                <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform duration-200" />
              </Link>
              <Link
                href="#programmes"
                className="inline-flex items-center justify-center gap-2 border border-foreground/20 text-foreground px-7 py-3.5 text-sm font-semibold hover:border-accent hover:text-accent transition-colors"
              >
                Voir les programmes
              </Link>
            </motion.div>

          </div>
        </section>

        {/* ── 2. Impact chiffré ───────────────────────────────────────── */}
        <section className="py-20 md:py-28 border-b border-border">
          <div className="container mx-auto px-4 md:px-6">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="mb-12"
            >
              <SectionLabel>Pourquoi former ses équipes</SectionLabel>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground leading-tight mt-4">
                La formation tech,<br />
                <span className="text-accent">un investissement qui se mesure.</span>
              </h2>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-border">
              {impacts.map((item, i) => {
                const Icon = item.icon
                return (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ duration: 0.45, delay: i * 0.1 }}
                    className="group relative overflow-hidden p-8 md:p-10 border-r border-border last:border-r-0 hover:bg-accent/[0.02] transition-colors duration-300"
                  >
                    <div className="absolute -bottom-4 -right-2 font-display text-[7rem] font-black leading-none select-none pointer-events-none text-foreground/[0.035] group-hover:text-accent/[0.07] transition-colors duration-500">
                      {item.value}
                    </div>
                    <div className="relative">
                      <div className="w-10 h-10 border border-border flex items-center justify-center mb-6 group-hover:border-accent group-hover:text-accent transition-colors duration-300">
                        <Icon size={18} />
                      </div>
                      <div className="font-display text-4xl font-black text-accent leading-none mb-1">{item.value}</div>
                      <div className="font-display font-bold text-base text-foreground mb-3">{item.label}</div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ── 3. Formats ──────────────────────────────────────────────── */}
        <section
          id="programmes"
          className="py-20 md:py-28 border-b border-border -mx-4 md:-mx-16 px-4 md:px-16"
          style={{ backgroundColor: "oklch(0.965 0.004 80)" }}
        >
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14">
              <div>
                <SectionLabel>Nos formats</SectionLabel>
                <motion.h2
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                  className="font-display text-3xl md:text-4xl font-bold text-foreground leading-tight mt-4"
                >
                  Un format adapté<br />
                  <span className="text-accent">à chaque besoin.</span>
                </motion.h2>
              </div>
              <p className="text-sm text-muted-foreground max-w-xs md:text-right leading-relaxed">
                Du stage d'une journée au parcours de transformation complet,<br className="hidden md:block" />
                nous nous adaptons à votre rythme et vos contraintes.
              </p>
            </div>

            <div className="space-y-0 border border-border">
              {formats.map((f, i) => (
                <motion.div
                  key={f.num}
                  initial={{ opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.45, delay: i * 0.08 }}
                  className="group flex gap-8 p-7 border-b border-border last:border-0 hover:bg-white/60 transition-colors duration-300"
                >
                  <div className="shrink-0 font-display text-5xl font-black text-accent/[0.15] group-hover:text-accent/30 transition-colors duration-500 leading-none w-14 tabular-nums">
                    {f.num}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display font-bold text-base md:text-lg text-foreground mb-2 group-hover:text-accent transition-colors duration-300">
                      {f.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4">{f.desc}</p>
                    <div className="flex flex-wrap gap-2">
                      {f.tags.map((tag) => (
                        <span
                          key={tag}
                          className="font-mono text-[10px] px-2.5 py-1 border border-border text-muted-foreground uppercase tracking-wide"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 4. Processus ────────────────────────────────────────────── */}
        <section className="py-20 md:py-28 border-b border-border">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20 items-start">
              <div className="md:sticky md:top-24">
                <SectionLabel>Notre processus</SectionLabel>
                <motion.h2
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                  className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground leading-tight mt-4"
                >
                  De l'audit au<br />
                  <span className="text-accent">résultat concret.</span>
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.15 }}
                  className="mt-5 text-muted-foreground text-base leading-relaxed max-w-sm"
                >
                  Un processus structuré, transparent et entièrement piloté par vos
                  objectifs — pas les nôtres.
                </motion.p>
              </div>

              <div className="space-y-0">
                {process.map((step, i) => (
                  <motion.div
                    key={step.num}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: 0.45, delay: i * 0.1 }}
                    className="group flex gap-8 py-7 border-b border-border last:border-0 hover:bg-accent/[0.02] transition-colors duration-300 px-4 -mx-4"
                  >
                    <div className="shrink-0 font-display text-6xl font-black text-accent/[0.15] group-hover:text-accent/30 transition-colors duration-500 leading-none w-16 text-right tabular-nums">
                      {step.num}
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-base md:text-lg text-foreground mb-1.5 group-hover:text-accent transition-colors duration-300">
                        {step.title}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── 5. Domaines ─────────────────────────────────────────────── */}
        <section
          className="py-20 md:py-28 border-b border-border -mx-4 md:-mx-16 px-4 md:px-16"
          style={{ backgroundColor: "oklch(0.965 0.004 80)" }}
        >
          <div className="container mx-auto px-4 md:px-6">
            <div className="mb-12">
              <SectionLabel>Domaines couverts</SectionLabel>
              <motion.h2
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="font-display text-3xl md:text-4xl font-bold text-foreground leading-tight mt-4"
              >
                Six expertises,<br />
                <span className="text-accent">un seul partenaire.</span>
              </motion.h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0 border border-border">
              {domains.map((d, i) => (
                <motion.div
                  key={d.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.4, delay: i * 0.07 }}
                  className="group p-6 border-r border-b border-border hover:bg-white/60 transition-colors duration-300
                    [&:nth-child(2n)]:border-r-0 sm:[&:nth-child(2n)]:border-r lg:[&:nth-child(2n)]:border-r
                    lg:[&:nth-child(3n)]:border-r-0"
                >
                  <h3 className="font-display font-bold text-sm text-foreground mb-2 group-hover:text-accent transition-colors duration-300">
                    {d.title}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{d.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 6. Différenciateurs ─────────────────────────────────────── */}
        <section className="py-20 md:py-28 border-b border-border">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14">
              <div>
                <SectionLabel>Pourquoi nous choisir</SectionLabel>
                <motion.h2
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                  className="font-display text-3xl md:text-4xl font-bold text-foreground leading-tight mt-4"
                >
                  Ce qui nous distingue<br />
                  <span className="text-accent">des autres.</span>
                </motion.h2>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 border border-border">
              {differentiators.map((d, i) => {
                const Icon = d.icon
                return (
                  <motion.div
                    key={d.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ duration: 0.45, delay: i * 0.09 }}
                    className="group relative overflow-hidden p-8 border-r border-b border-border [&:nth-child(2n)]:border-r-0 hover:bg-accent/[0.02] transition-colors duration-300"
                  >
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                      style={{ background: "linear-gradient(135deg, transparent 50%, oklch(0.68 0.28 308 / 0.05) 100%)" }}
                    />
                    <div className="relative">
                      <div className="w-10 h-10 border border-border flex items-center justify-center mb-5 group-hover:border-accent group-hover:text-accent transition-colors duration-300">
                        <Icon size={17} />
                      </div>
                      <h3 className="font-display font-bold text-base text-foreground mb-2 group-hover:text-accent transition-colors duration-300">
                        {d.title}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{d.desc}</p>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ── 7. CTA ──────────────────────────────────────────────────── */}
        <section className="py-20 md:py-28">
          <div className="container mx-auto px-4 md:px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.6 }}
              className="flex flex-col md:flex-row md:items-center justify-between gap-8 border-t-4 border-accent pt-10"
            >
              <div>
                <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground leading-tight mb-3">
                  Prêt à faire monter<br />
                  <span className="text-accent">vos équipes en compétences&nbsp;?</span>
                </h2>
                <p className="text-muted-foreground text-base max-w-sm leading-relaxed">
                  Contactez-nous pour un premier échange sans engagement. Nous vous
                  proposons une analyse gratuite des besoins de vos équipes.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 shrink-0">
                <Link
                  href="/#contact"
                  className="group inline-flex items-center justify-center gap-2 bg-accent text-white px-7 py-3.5 text-sm font-semibold hover:bg-accent/90 transition-all"
                >
                  Nous contacter
                  <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform duration-200" />
                </Link>
                <Link
                  href="/bootcamps"
                  className="inline-flex items-center justify-center gap-2 border border-foreground/20 text-foreground px-7 py-3.5 text-sm font-semibold hover:border-accent hover:text-accent transition-colors"
                >
                  Explorer les programmes
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  )
}
