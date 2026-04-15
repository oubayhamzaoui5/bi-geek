"use client"

import { useState, useEffect, useRef } from "react"
import {
  Star, Clock, Award, CheckCircle, Monitor, ClipboardCheck,
  ChevronDown, Users, BookOpen, Zap, Shield, ArrowRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { CourseEnrollDialog } from "@/components/course-enroll-dialog"
import Link from "next/link"
import { SiWhatsapp } from "react-icons/si"
import { Testimonials } from "../testimonials"
import { Faq } from "../faq"
import { motion, AnimatePresence } from "framer-motion"

type GuestCourse = {
  id?: string
  title: string
  shortDescription: string
  longDescription: string
  durationLabel: string
  levelLabel?: string
  prerequis?: string
  certificate: boolean
  rating: number
  reviewsCount: number
  whatYouWillLearn?: string[]
  coverImage?: string
  certifications?: { title: string; issuer?: string }[]
}

type CourseDetailsSectionProps = {
  variant?: "student" | "guest"
  context?: "course" | "bootcamp"
  courseFromPb?: GuestCourse
  courseId?: string
  courses?: GuestCourse[]
}

const WHATSAPP = "21658611283"

// Static trust / feature bullets shown in the sticky card
const COURSE_FEATURES = [
  { icon: Monitor, label: "Accès présentiel & en ligne" },
  { icon: Award, label: "Certificat de réussite" },
  { icon: Users, label: "Formateurs experts actifs" },
  { icon: Shield, label: "Satisfaction garantie" },
]

const BOOTCAMP_FEATURES = [
  { icon: Zap, label: "Programme intensif et ciblé" },
  { icon: Award, label: "Certifications reconnues" },
  { icon: Users, label: "Cohortes limitées à 20 participants" },
  { icon: Shield, label: "Accompagnement post-formation" },
]

export function CourseDetailsSection({
  variant = "student",
  context = "course",
  courseFromPb,
  courseId,
  courses,
}: CourseDetailsSectionProps) {
  const isGuest = variant === "guest"
  const isBootcamp = context === "bootcamp"
  const resolvedCourseId = courseId ?? courseFromPb?.id ?? ""
  const coursesList = isBootcamp ? courses ?? [] : [courseFromPb!]

  const title = courseFromPb?.title ?? "Titre du cours"
  const longDescription = courseFromPb?.longDescription ?? "Description complète du cours."
  const shortDescription = courseFromPb?.shortDescription ?? ""
  const rating = courseFromPb?.rating ?? 4.8
  const reviewsCount = courseFromPb?.reviewsCount ?? 0
  const durationText = courseFromPb?.durationLabel ?? "40 heures"
  const prerequisText = courseFromPb?.prerequis ?? "Aucun prérequis"
  const levelText = courseFromPb?.levelLabel ?? "Tous niveaux"
  const coverImage = courseFromPb?.coverImage

  const certifications = coursesList.flatMap((c) => c.certifications ?? [])
  const features = isBootcamp ? BOOTCAMP_FEATURES : COURSE_FEATURES

  const [enrollOpen, setEnrollOpen] = useState(false)
  const [openModuleIndex, setOpenModuleIndex] = useState<number | null>(null)
  const [certIndex, setCertIndex] = useState(0)

  // Rotate certifications
  useEffect(() => {
    if (certifications.length < 2) return
    const id = setInterval(() => setCertIndex((p) => (p + 1) % certifications.length), 3500)
    return () => clearInterval(id)
  }, [certifications.length])

  // Facebook pixel
  useEffect(() => {
    if (!courseFromPb?.id) return
    // @ts-ignore
    window.fbq?.("track", "ViewContent", {
      content_name: courseFromPb.title,
      content_ids: [courseFromPb.id],
      content_type: isBootcamp ? "bootcamp" : "course",
    })
  }, [courseFromPb])

  const ctaLabel = isBootcamp ? "S'inscrire au bootcamp" : "S'inscrire à la formation"

  return (
    <>
      {/* ─────────────────────────────────────────────
          HERO — full-bleed off-white
      ───────────────────────────────────────────── */}
      <section
        className="relative -mx-4 md:-mx-16 px-4 md:px-16 pt-16 pb-14 md:pt-24 md:pb-20 border-b border-border overflow-hidden"
        style={{ backgroundColor: "oklch(0.965 0.004 80)" }}
      >
        {/* Ghost label */}
        <div
          aria-hidden
          className="pointer-events-none select-none absolute right-0 top-1/2 -translate-y-1/2 font-display font-black leading-none text-accent"
          style={{ fontSize: "clamp(5rem, 16vw, 16rem)", opacity: 0.04, letterSpacing: "-0.04em" }}
        >
          {isBootcamp ? "BOOT" : "FORM."}
        </div>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-10 lg:gap-16 items-start max-w-7xl mx-auto">

          {/* LEFT — info */}
          <div>
            {/* Eyebrow */}
            <div className="flex items-center gap-3 mb-6">
              <div className="h-px w-8 bg-accent" />
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent font-medium">
                {isBootcamp ? "Bootcamp intensif" : "Formation"}
              </span>
            </div>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="font-display font-black text-foreground leading-[1.0] tracking-tight mb-5"
              style={{ fontSize: "clamp(2rem, 4.5vw, 3.6rem)" }}
            >
              {title}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.1 }}
              className="text-base md:text-lg text-muted-foreground leading-relaxed mb-8 max-w-xl"
            >
              {shortDescription || longDescription}
            </motion.p>

            {/* Stats row */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex flex-wrap gap-6 mb-8"
            >
              {/* Rating */}
              <div className="flex items-center gap-2">
                <div className="flex">
                  {[1,2,3,4,5].map((s) => (
                    <Star
                      key={s}
                      className={`w-4 h-4 ${s <= Math.round(rating) ? "fill-accent text-accent" : "text-border"}`}
                    />
                  ))}
                </div>
                <span className="font-display font-bold text-foreground text-sm">{rating.toFixed(1)}</span>
                {reviewsCount > 0 && (
                  <span className="text-muted-foreground text-sm">({reviewsCount} avis)</span>
                )}
              </div>

              {/* Duration */}
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground border-l border-border pl-6">
                <Clock className="w-4 h-4 text-accent" />
                <span>{durationText}</span>
              </div>

              {/* Level */}
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground border-l border-border pl-6">
                <BookOpen className="w-4 h-4 text-accent" />
                <span>{levelText}</span>
              </div>

              {/* Format */}
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground border-l border-border pl-6">
                <Monitor className="w-4 h-4 text-accent" />
                <span>Présentiel / En ligne</span>
              </div>
            </motion.div>

            {/* Mobile CTAs */}
            {isGuest && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.3 }}
                className="flex flex-col sm:flex-row gap-3 lg:hidden"
              >
                <button
                  onClick={() => setEnrollOpen(true)}
                  className="inline-flex items-center justify-center gap-2 bg-accent text-white px-6 py-3.5 text-sm font-semibold hover:bg-accent/90 transition-all"
                >
                  {ctaLabel}
                  <ArrowRight size={15} />
                </button>
                <Link
                  href={`https://wa.me/${WHATSAPP}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 border border-[#25D366] text-[#25D366] px-6 py-3.5 text-sm font-semibold hover:bg-[#25D366] hover:text-white transition-colors"
                >
                  <SiWhatsapp className="w-4 h-4" />
                  Nous contacter
                </Link>
              </motion.div>
            )}
          </div>

          {/* RIGHT — image card (visible on lg) */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="hidden lg:block"
          >
            <div className="relative">
              <div
                className="absolute top-3 right-3 w-full h-full border-2 border-accent/20 pointer-events-none z-0"
                aria-hidden
              />
              <div className="relative z-10 aspect-video w-full overflow-hidden bg-muted">
                <img
                  src={coverImage ?? "/placeholder-course.png"}
                  alt={title}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────
          MAIN BODY — two-col sticky sidebar
      ───────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto py-14 md:py-20 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-12 lg:gap-16 items-start">

        {/* LEFT — main content */}
        <div className="space-y-16">

          {/* ── What you'll learn ── */}
          <div>
            <div className="flex items-center gap-3 mb-8">
              <div className="h-px w-8 bg-accent" />
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent font-medium">
                Compétences acquises
              </span>
            </div>
            <h2 className="font-display font-bold text-2xl md:text-3xl text-foreground mb-8">
              Ce que vous <span className="text-accent">apprendrez</span>
            </h2>

            {isBootcamp ? (
              /* Bootcamp — accordion per course */
              <div className="space-y-3">
                {coursesList.map((course, index) => {
                  const isOpen = openModuleIndex === index
                  return (
                    <div key={index} className="border border-border">
                      <button
                        onClick={() => setOpenModuleIndex(isOpen ? null : index)}
                        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-muted/40 transition-colors"
                      >
                        <span className="font-display font-bold text-base text-foreground">
                          {course.title}
                        </span>
                        <ChevronDown
                          className={`w-4 h-4 text-accent transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                        />
                      </button>
                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                          >
                            <div className="px-5 pb-5 grid grid-cols-1 md:grid-cols-2 gap-5 border-t border-border">
                              <div className="pt-4">
                                <div className="aspect-video overflow-hidden bg-muted mb-3">
                                  <img
                                    src={course.coverImage ?? "/placeholder-course.png"}
                                    alt={course.title}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                  {course.shortDescription}
                                </p>
                              </div>
                              <div className="pt-4 space-y-2">
                                <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-accent mb-3">
                                  Contenu
                                </p>
                                <ul className="space-y-2">
                                  {(course.whatYouWillLearn ?? []).map((item, i) => (
                                    <li key={i} className="flex items-start gap-2.5 text-sm text-foreground/80">
                                      <div className="shrink-0 mt-0.5 w-4 h-4 border border-accent flex items-center justify-center">
                                        <div className="w-1.5 h-1.5 bg-accent" />
                                      </div>
                                      {item}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )
                })}
              </div>
            ) : (
              /* Course — grid checklist */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(courseFromPb?.whatYouWillLearn ?? []).map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.35, delay: i * 0.05 }}
                    className="flex items-start gap-3 p-4 border border-border"
                  >
                    <div className="shrink-0 mt-0.5 w-4 h-4 border border-accent flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-accent" />
                    </div>
                    <span className="text-sm text-foreground/85 leading-relaxed">{item}</span>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* ── Prerequisites ── */}
          <div
            className="-mx-4 md:-mx-16 px-4 md:px-16 py-12 border-y border-border"
            style={{ backgroundColor: "oklch(0.965 0.004 80)" }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="h-px w-8 bg-accent" />
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent font-medium">
                Prérequis
              </span>
            </div>
            <div className="flex items-start gap-3">
              <ClipboardCheck className="w-5 h-5 text-accent shrink-0 mt-0.5" />
              <p className="text-foreground/80 text-base leading-relaxed">{prerequisText}</p>
            </div>
          </div>

          {/* ── Instructor (static for now) ── */}
          <div>
            <div className="flex items-center gap-3 mb-8">
              <div className="h-px w-8 bg-accent" />
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent font-medium">
                Formateur
              </span>
            </div>
            <h2 className="font-display font-bold text-2xl text-foreground mb-6">
              Appris auprès d'experts <span className="text-accent">en activité</span>
            </h2>
            <div className="flex items-start gap-5 p-6 border border-border">
              <div className="w-16 h-16 shrink-0 bg-muted flex items-center justify-center border border-border">
                <Users className="w-6 h-6 text-accent" />
              </div>
              <div>
                <p className="font-display font-bold text-foreground mb-1">Expert BI Geek</p>
                <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-accent mb-3">
                  Formateur certifié
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
                  Nos formateurs sont des professionnels en activité, issus de grands groupes
                  et startups tech. Ils partagent des cas réels, des outils utilisés en
                  production et une expérience terrain directement applicable.
                </p>
              </div>
            </div>
          </div>

          {/* ── Certifications (if any) ── */}
          {certifications.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-8">
                <div className="h-px w-8 bg-accent" />
                <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent font-medium">
                  Certifications
                </span>
              </div>
              <h2 className="font-display font-bold text-2xl text-foreground mb-6">
                Certifiez vos <span className="text-accent">compétences</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {certifications.map((cert, i) => (
                  <div key={i} className="border border-border p-5 flex items-start gap-4">
                    <div className="w-10 h-10 shrink-0 border border-accent/30 flex items-center justify-center">
                      <Award className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <p className="font-display font-bold text-sm text-foreground">{cert.title}</p>
                      {cert.issuer && (
                        <p className="text-xs text-muted-foreground mt-0.5">{cert.issuer}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Testimonials ── */}
          <Testimonials />

          {/* ── FAQ ── */}
          <Faq />
        </div>

        {/* RIGHT — sticky enrollment card */}
        {isGuest && (
          <div className="hidden lg:block">
            <div className="sticky top-6 space-y-4">

              {/* Enrollment card */}
              <div className="border border-border bg-white">
                {/* Image preview */}
                <div className="aspect-video overflow-hidden bg-muted lg:hidden">
                  <img
                    src={coverImage ?? "/placeholder-course.png"}
                    alt={title}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="p-6 space-y-5">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent mb-1">
                      {isBootcamp ? "Prochain bootcamp" : "Inscription ouverte"}
                    </p>
                    <p className="font-display font-black text-2xl text-foreground leading-tight">
                      {title}
                    </p>
                  </div>

                  <button
                    onClick={() => setEnrollOpen(true)}
                    className="w-full inline-flex items-center justify-center gap-2 bg-accent text-white px-6 py-4 text-sm font-semibold hover:bg-accent/90 transition-all"
                  >
                    {ctaLabel}
                    <ArrowRight size={15} />
                  </button>

                  <Link
                    href={`https://wa.me/${WHATSAPP}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 border border-[#25D366] text-[#25D366] px-6 py-3 text-sm font-semibold hover:bg-[#25D366] hover:text-white transition-colors"
                  >
                    <SiWhatsapp className="w-4 h-4" />
                    Nous contacter
                  </Link>

                  {/* Feature list */}
                  <div className="pt-2 border-t border-border space-y-3">
                    {features.map(({ icon: Icon, label }, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm text-foreground/75">
                        <Icon className="w-4 h-4 text-accent shrink-0" />
                        {label}
                      </div>
                    ))}
                  </div>

                  {/* Key stats */}
                  <div className="pt-2 border-t border-border grid grid-cols-2 gap-3">
                    <div>
                      <p className="font-display font-black text-xl text-foreground">{durationText}</p>
                      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Durée</p>
                    </div>
                    <div>
                      <p className="font-display font-black text-xl text-foreground">{levelText}</p>
                      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Niveau</p>
                    </div>
                    <div>
                      <p className="font-display font-black text-xl text-foreground">{rating.toFixed(1)}</p>
                      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Note moyenne</p>
                    </div>
                    <div>
                      <p className="font-display font-black text-xl text-foreground">✓</p>
                      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Certifié</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Trust note */}
              <p className="text-center text-xs text-muted-foreground">
                +500 apprenants formés · Satisfaits ou remboursés
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────
          BOTTOM CTA BANNER
      ───────────────────────────────────────────── */}
      <section
        className="-mx-4 md:-mx-16 px-4 md:px-16 py-20 md:py-28 border-t-4 border-accent relative overflow-hidden"
        style={{ backgroundColor: "oklch(0.965 0.004 80)" }}
      >
        {/* Ghost stat */}
        <div
          aria-hidden
          className="pointer-events-none select-none absolute right-0 top-1/2 -translate-y-1/2 font-display font-black leading-none text-accent"
          style={{ fontSize: "clamp(6rem, 20vw, 18rem)", opacity: 0.045, letterSpacing: "-0.04em" }}
        >
          +500
        </div>

        <div className="relative z-10 max-w-5xl">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-px w-8 bg-accent" />
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent font-medium">
              Passez à l'action
            </span>
          </div>

          <h2
            className="font-display font-black text-foreground leading-[0.95] tracking-tight mb-10"
            style={{ fontSize: "clamp(2.4rem, 6vw, 5rem)" }}
          >
            Prêt à transformer<br />
            <span className="text-accent whitespace-nowrap">votre carrière&nbsp;?</span>
          </h2>

          <div className="flex flex-col sm:flex-row gap-4">
            {isGuest && (
              <button
                onClick={() => setEnrollOpen(true)}
                className="group inline-flex items-center justify-center gap-2 bg-accent text-white px-8 py-4 text-sm font-semibold hover:bg-accent/90 transition-all"
              >
                {ctaLabel}
                <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform duration-200" />
              </button>
            )}
            <Link
              href={`https://wa.me/${WHATSAPP}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 border border-foreground/20 text-foreground px-8 py-4 text-sm font-semibold hover:border-accent hover:text-accent transition-colors"
            >
              <SiWhatsapp className="w-4 h-4" />
              Nous contacter sur WhatsApp
            </Link>
          </div>
        </div>
      </section>

      <CourseEnrollDialog
        open={enrollOpen}
        onOpenChange={setEnrollOpen}
        title={title}
        ctaLabel={ctaLabel}
        courseId={resolvedCourseId}
        context={isBootcamp ? "bootcamp" : "course"}
      />
    </>
  )
}
