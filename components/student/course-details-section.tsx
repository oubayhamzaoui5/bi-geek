"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowRight,
  Award,
  BarChart3,
  BookOpen,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  Clock,
  GraduationCap,
  Monitor,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
} from "lucide-react"
import { SiWhatsapp } from "react-icons/si"
import { CourseEnrollDialog } from "@/components/course-enroll-dialog"
import { TestimonialsSection } from "@/components/TestimonialsSection"
import { FaqSection } from "@/components/FaqSection"
import { ContactSection } from "@/components/ContactSection"

type Certification = {
  title: string
  issuer?: string
  sourceTitle?: string
  imageUrl?: string | null
}

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
  coverImage?: string | null
  certifications?: Certification[]
}

type ProgramModule = {
  title: string
  duration?: string
  lessons?: {
    title: string
    duration?: string
    contents?: { title: string; type?: string }[]
  }[]
}

type CourseDetailsSectionProps = {
  variant?: "student" | "guest"
  context?: "course" | "bootcamp"
  courseFromPb?: GuestCourse
  courseId?: string
  courses?: GuestCourse[]
  modules?: ProgramModule[]
}

const WHATSAPP = "21658611283"

const COURSE_FEATURES = [
  { icon: Monitor, label: "Accès présentiel & en ligne" },
  { icon: Award, label: "Certificat de réussite" },
  { icon: Users, label: "Formateurs experts actifs" },
  { icon: ShieldCheck, label: "Suivi pédagogique inclus" },
]

const BOOTCAMP_FEATURES = [
  { icon: Sparkles, label: "Parcours intensif orienté emploi" },
  { icon: Award, label: "Certifications et portfolio" },
  { icon: Users, label: "Cohortes limitées" },
  { icon: BriefcaseBusiness, label: "Accompagnement carrière" },
]

const DEFAULT_OUTCOMES = [
  "Construire des projets présentables dans un portfolio",
  "Pratiquer sur des cas proches du monde professionnel",
  "Recevoir des retours d'experts en activité",
  "Valider vos compétences avec une attestation BI GEEK",
]

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
  title: string
  description?: string
}) {
  return (
    <div className="mb-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        <SectionLabel>{eyebrow}</SectionLabel>
        <h2 className="text-3xl font-semibold tracking-tight text-zinc-950 md:text-4xl">{title}</h2>
      </div>
      {description ? <p className="max-w-md text-sm leading-6 text-zinc-600 md:text-right">{description}</p> : null}
    </div>
  )
}

function RatingLine({ rating, reviewsCount }: { rating: number; reviewsCount: number }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-600">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${star <= Math.round(rating) ? "fill-[#8b0f82] text-[#8b0f82]" : "text-zinc-300"}`}
          />
        ))}
      </div>
      <span className="font-semibold text-zinc-950">{rating.toFixed(1)}</span>
      {reviewsCount > 0 ? <span>({reviewsCount} avis)</span> : <span>Apprenants satisfaits</span>}
    </div>
  )
}

export function CourseDetailsSection({
  variant = "student",
  context = "course",
  courseFromPb,
  courseId,
  courses,
  modules = [],
}: CourseDetailsSectionProps) {
  const isGuest = variant === "guest"
  const isBootcamp = context === "bootcamp"
  const resolvedCourseId = courseId ?? courseFromPb?.id ?? ""
  const coursesList = isBootcamp ? courses ?? [] : courseFromPb ? [courseFromPb] : []

  const title = courseFromPb?.title ?? "Titre du cours"
  const longDescription = courseFromPb?.longDescription ?? "Description complète du programme."
  const shortDescription = courseFromPb?.shortDescription ?? ""
  const rating = courseFromPb?.rating ?? 4.8
  const reviewsCount = courseFromPb?.reviewsCount ?? 0
  const durationText = courseFromPb?.durationLabel ?? "40 heures"
  const levelText = courseFromPb?.levelLabel || "Tous niveaux"
  const coverImage = courseFromPb?.coverImage || "/placeholder-course.webp"
  const ctaLabel = isBootcamp ? "S'inscrire au bootcamp" : "S'inscrire à la formation"
  const programLabel = isBootcamp ? "Bootcamp intensif" : "Formation professionnelle"
  const features = isBootcamp ? BOOTCAMP_FEATURES : COURSE_FEATURES

  const [enrollOpen, setEnrollOpen] = useState(false)
  const [openIndex, setOpenIndex] = useState(0)

  const certifications = useMemo(
    () =>
      [
        ...(isBootcamp && courseFromPb ? [courseFromPb] : []),
        ...coursesList,
      ].flatMap((course) =>
        (course.certifications ?? [])
          .filter((cert) => cert?.title?.trim())
          .map((cert) => ({
            ...cert,
            sourceTitle: isBootcamp && course.id !== courseFromPb?.id ? course.title : undefined,
          }))
      ),
    [courseFromPb, coursesList, isBootcamp]
  )

  const certificationItems = useMemo(
    (): Certification[] => {
      if (certifications.length) return certifications
      if (courseFromPb?.certificate || coursesList.some((course) => course.certificate)) {
        return [
          {
            title: isBootcamp ? "Certification BI GEEK Bootcamp" : "Certification BI GEEK",
            issuer: "BI GEEK",
          },
        ]
      }
      return []
    },
    [certifications, courseFromPb?.certificate, coursesList, isBootcamp]
  )

  const outcomes = useMemo(() => {
    const learned = isBootcamp
      ? coursesList.flatMap((course) => course.whatYouWillLearn ?? [])
      : courseFromPb?.whatYouWillLearn ?? []
    const unique = Array.from(new Set(learned.filter(Boolean)))
    return (unique.length ? unique : DEFAULT_OUTCOMES).slice(0, 8)
  }, [courseFromPb?.whatYouWillLearn, coursesList, isBootcamp])

  const curriculumItems = useMemo(() => {
    if (modules.length) return modules
    if (isBootcamp && coursesList.length) {
      return coursesList.map((course, index) => ({
        title: `Module ${index + 1} : ${course.title}`,
        duration: course.durationLabel,
        lessons: (course.whatYouWillLearn ?? []).slice(0, 4).map((item) => ({ title: item })),
      }))
    }
    return outcomes.slice(0, 5).map((item, index) => ({
      title: `Séquence ${index + 1}`,
      duration: "",
      lessons: [{ title: item }],
    }))
  }, [coursesList, isBootcamp, modules, outcomes])

  useEffect(() => {
    if (!courseFromPb?.id) return
    // @ts-ignore
    window.fbq?.("track", "ViewContent", {
      content_name: courseFromPb.title,
      content_ids: [courseFromPb.id],
      content_type: isBootcamp ? "bootcamp" : "course",
    })
  }, [courseFromPb, isBootcamp])

  return (
    <div className="-mx-4 overflow-x-clip bg-[#fbfaf8] text-zinc-950 md:-mx-16">
      <section className="border-b border-zinc-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-16">
          <div className="grid gap-10 md:grid-cols-[1.05fr_0.95fr] md:items-start md:gap-14">

            {/* Left — text */}
            <div className="flex flex-col">
              <SectionLabel>{programLabel}</SectionLabel>
              <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl md:text-5xl">
                {title}
              </h1>
              <p className="mt-4 text-base leading-7 text-zinc-600">
                {shortDescription || longDescription}
              </p>

              <div className="mt-4"><RatingLine rating={rating} reviewsCount={reviewsCount} /></div>

              {/* Stats pills */}
              <div className="mt-5 flex flex-wrap gap-2">
                {[
                  { icon: Clock,    value: durationText },
                  { icon: BookOpen, value: levelText },
                  { icon: Monitor,  value: "Présentiel / En ligne" },
                  { icon: Award,    value: courseFromPb?.certificate ? "Certifié" : "Attestation" },
                ].map(({ icon: Icon, value }) => (
                  <span key={value} className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-700">
                    <Icon className="h-3.5 w-3.5 text-[#8b0f82]" />
                    {value}
                  </span>
                ))}
              </div>

              {/* CTAs */}
              <div className="mt-7 flex flex-wrap gap-3">
                {isGuest && (
                  <button
                    type="button"
                    onClick={() => setEnrollOpen(true)}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-[#8b0f82] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#710c6a]"
                  >
                    {ctaLabel}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                )}
                <Link
                  href={`https://wa.me/${WHATSAPP}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-md bg-[#25D366] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#1ebe5d]"
                >
                  <SiWhatsapp className="h-4 w-4" />
                  Parler à un conseiller
                </Link>
              </div>
            </div>

            {/* Right — image */}
            <div className="relative w-full overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 shadow-sm">
              <div className="relative w-full" style={{ aspectRatio: "16 / 9" }}>
                <img src={coverImage} alt={title} className="absolute inset-0 h-full w-full object-cover" />
              </div>
            </div>

          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[86rem] gap-10 px-4 py-14 md:px-6 md:py-20 lg:grid-cols-[1fr_360px] lg:items-start">
        <div className="space-y-16">
          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm md:p-8">
            <div className="mb-8 grid gap-6 md:grid-cols-[0.85fr_1.15fr] md:items-end">
              <div>
                <SectionLabel>Résultat attendu</SectionLabel>
                <h2 className="text-3xl font-semibold tracking-tight text-zinc-950 md:text-4xl">
                  {isBootcamp ? "Des compétences prêtes à l'emploi" : "Des acquis clairs et actionnables"}
                </h2>
              </div>
              <p className="max-w-xl text-sm leading-6 text-zinc-600 md:justify-self-end md:text-right">
                Un aperçu concret de ce que vous serez capable de réaliser à la fin du parcours.
              </p>
            </div>

            <div className="grid overflow-hidden rounded-xl border border-zinc-200 md:grid-cols-2">
              {outcomes.map((item) => (
                <div
                  key={item}
                  className="flex gap-4 border-b border-zinc-200 bg-white p-5 last:border-b-0 md:border-r md:even:border-r-0 md:[&:nth-last-child(-n+2)]:border-b-0"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#8b0f82]/10 text-[#8b0f82]">
                    <Check className="h-4 w-4" />
                  </span>
                  <p className="text-sm leading-6 text-zinc-700">{item}</p>
                </div>
              ))}
            </div>
          </section>

          {isBootcamp && curriculumItems.length > 0 ? (
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm md:p-8">
            <SectionHeader
              eyebrow="Programme"
              title="Les formations incluses"
              description="Chaque module est une formation complète animée par un expert."
            />
            <div className="grid gap-4 sm:grid-cols-2">
              {curriculumItems.map((item, index) => (
                <div key={`${item.title}-${index}`} className="rounded-xl border border-zinc-200 bg-[#fbfaf8] p-5">
                  <div className="mb-3">
                    <span className="text-xs font-bold uppercase tracking-widest text-[#8b0f82]">
                      Formation {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <h3 className="font-semibold leading-snug text-zinc-950">
                    {item.title.replace(/^Module \d+ : /, "")}
                  </h3>
                  {(item.lessons ?? []).length > 0 && (
                    <ul className="mt-3 space-y-1.5">
                      {(item.lessons ?? []).slice(0, 4).map((lesson, li) => (
                        <li key={li} className="flex items-start gap-2 text-xs leading-5 text-zinc-600">
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#8b0f82]" />
                          {lesson.title}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </section>
          ) : null}

          <section className="grid gap-5 md:grid-cols-3">
            {[
              {
                icon: BarChart3,
                title: "Pratique mesurable",
                desc: "Des exercices, projets et cas d'usage pour passer de la compréhension à l'exécution.",
              },
              {
                icon: Users,
                title: "Mentorat expert",
                desc: "Un formateur en activité vous guide avec des exemples et retours issus du terrain.",
              },
              {
                icon: GraduationCap,
                title: "Signal carrière",
                desc: "Attestation, livrables et compétences formulées pour votre CV ou portfolio.",
              },
            ].map(({ icon: Icon, title: cardTitle, desc }) => (
              <div key={cardTitle} className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-lg bg-[#8b0f82]/10 text-[#8b0f82]">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-zinc-950">{cardTitle}</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-600">{desc}</p>
              </div>
            ))}
          </section>

          {certificationItems.length > 0 ? (
            <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
              <div className="border-b border-zinc-200 p-6 md:p-8">
                <SectionLabel>Certification</SectionLabel>
                <h2 className="text-3xl font-semibold tracking-tight text-zinc-950 md:text-4xl">
                  Certification{certificationItems.length > 1 ? "s" : ""} du parcours
                </h2>
              </div>

              <div className="grid gap-5 p-6 md:grid-cols-2 md:p-8">
                {certificationItems.map((cert, index) => (
                  <article key={`${cert.title}-${index}`} className="overflow-hidden rounded-xl border border-zinc-200 bg-[#fbfaf8]">
                    <div className="relative aspect-video w-full bg-white">
                      {cert.imageUrl ? (
                        <img
                          src={cert.imageUrl}
                          alt={cert.title}
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-zinc-50 text-[#8b0f82]">
                          <Award className="h-12 w-12" />
                        </div>
                      )}
                    </div>
                    <div className="space-y-2 p-4">
                      <h3 className="text-base font-semibold leading-snug text-zinc-950">{cert.title}</h3>
                      <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-wide">
                        {cert.issuer ? (
                          <span className="rounded-full bg-white px-3 py-1 text-zinc-600">{cert.issuer}</span>
                        ) : null}
                        {cert.sourceTitle ? (
                          <span className="rounded-full bg-[#8b0f82]/10 px-3 py-1 text-[#8b0f82]">{cert.sourceTitle}</span>
                        ) : null}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        {isGuest ? (
          <aside className="self-start lg:sticky lg:top-20">
            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
              <div className="border-b border-zinc-200 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8b0f82]">
                  {isBootcamp ? "Candidature ouverte" : "Inscription ouverte"}
                </p>
                <h2 className="mt-2 text-xl font-semibold leading-tight text-zinc-950">{title}</h2>
              </div>
              <div className="space-y-5 p-5">
                <button
                  type="button"
                  onClick={() => setEnrollOpen(true)}
                  className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-[#8b0f82] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#710c6a]"
                >
                  {ctaLabel}
                  <ArrowRight className="h-4 w-4" />
                </button>
                <Link
                  href={`https://wa.me/${WHATSAPP}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#25D366] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#20c05c]"
                >
                  <SiWhatsapp className="h-4 w-4" />
                  WhatsApp
                </Link>
                <div className="space-y-3 border-t border-zinc-200 pt-5">
                  {features.map(({ icon: Icon, label }) => (
                    <div key={label} className="flex items-center gap-3 text-sm text-zinc-700">
                      <Icon className="h-4 w-4 shrink-0 text-[#8b0f82]" />
                      {label}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3 border-t border-zinc-200 pt-5">
                  {[
                    ["Durée", durationText],
                    ["Niveau", levelText],
                    ["Note", rating.toFixed(1)],
                    ["Format", "Hybride"],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-lg bg-[#fbfaf8] p-3">
                      <p className="text-sm font-semibold text-zinc-950">{value}</p>
                      <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <p className="mt-4 text-center text-xs leading-5 text-zinc-500">
              Réponse rapide de l'équipe BI GEEK après votre demande.
            </p>
          </aside>
        ) : null}
      </section>

      <TestimonialsSection />
      <FaqSection />
      <ContactSection />

      <section className="bg-zinc-950 px-4 py-16 text-white md:px-6 md:py-20">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-[#f5a7ee]">Passez à l'action</p>
            <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">
              Prêt à construire une compétence qui se voit ?
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-zinc-300">
              Inscrivez-vous, ou échangez avec un conseiller pour valider le programme le plus adapté à votre objectif.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            {isGuest ? (
              <button
                type="button"
                onClick={() => setEnrollOpen(true)}
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md bg-white px-6 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-100"
              >
                {ctaLabel}
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : null}
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
    </div>
  )
}
