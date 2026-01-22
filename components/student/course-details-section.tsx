"use client"

import { useState,useEffect } from "react"
import { Star, Clock, Award, CheckCircle, Monitor, ClipboardCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CourseEnrollDialog } from "@/components/course-enroll-dialog"
import Link from "next/link"
import { SiWhatsapp } from "react-icons/si"
import { Testimonials } from "../testimonials"
import { Faq } from "../faq"
import { motion } from "framer-motion"


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
  const rating = courseFromPb?.rating ?? 4.8
  const reviewsCount = courseFromPb?.reviewsCount ?? 324
  const durationText = courseFromPb?.durationLabel ?? "40 heures"
  const prerequisText = courseFromPb?.prerequis ?? "Aucun"
  const coverImage = courseFromPb?.coverImage

  const [enrollOpen, setEnrollOpen] = useState(false)

  const certifications = coursesList.flatMap((c) => c.certifications ?? [])

  const CONTACT_INFO = {
    whatsapp: "21658611283",
  }

const [openIndex, setOpenIndex] = useState<number | null>(null)
const toggleCard = (index: number) => {
  setOpenIndex(openIndex === index ? null : index)
}

useEffect(() => {
  if (!courseFromPb?.id) return

  // @ts-ignore
  window.fbq?.("track", "ViewContent", {
    content_name: courseFromPb.title,
    content_ids: [courseFromPb.id],
      content_type: isBootcamp ? "bootcamp" : "course",
  })
}, [courseFromPb])

useEffect(() => {
  if (certifications.length === 0) return

  const interval = setInterval(() => {
    setCertIndex((prev) => (prev + 1) % certifications.length)
  }, 3000)

  return () => clearInterval(interval)
}, [certifications.length])


const [certIndex, setCertIndex] = useState(0)


  return (
    <>
      <div className="space-y-6">
        {/* HERO HEADER */}
<div className="bg-gradient-to-r from-accent to-accent/85 py-2 px-2 md:py-10 md:px-8">
<div className="max-w-8xl mx-auto bg-white rounded-xl md:rounded-3xl p-6 md:p-12 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 items-center">
              {/* LEFT CONTENT */}
              <div className="order-2 md:order-1 space-y-6 py-8">
            <div className="space-y-6 py-8">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground leading-tight mb-2">
                {title}
              </h1>

              <p className="text-muted-foreground text-sm md:text-base">
                {longDescription}
              </p>

              {/* STATS */}
              <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 fill-accent text-accent" />
                  <span className="font-semibold text-foreground">{rating.toFixed(1)}</span>
                  <span>({reviewsCount} avis)</span>
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-accent" />
                  <span>{durationText}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Monitor className="w-5 h-5 text-accent" />
                  <span>Présentiel / En ligne</span>
                </div>
              </div>

              {/* CTA */}
              {isGuest && (
<div className="flex flex-col md:flex-row items-center gap-4 pt-4 w-full">
                  <Button
        onClick={() => {
  // Meta Pixel event
  // @ts-ignore
  window.fbq?.("track", "CompleteRegistration", {
    content_name: title,
    content_ids: [resolvedCourseId],
  content_type: isBootcamp ? "bootcamp" : "course",
  })

  setEnrollOpen(true)
}}
        className="w-full md:w-auto bg-accent hover:bg-[#7d3d9f] text-white px-6 py-2 text-sm font-semibold h-[40px] cursor-pointer"
      >
                    {isBootcamp ? "S'inscrire au bootcamp" : "S'inscrire à la formation"}
                  </Button>

                <Link
  href={`https://wa.me/${CONTACT_INFO.whatsapp}`}
  target="_blank"
  rel="noreferrer"
  aria-label="WhatsApp"
  className="w-full md:w-auto inline-flex items-center justify-center gap-2 rounded-sm bg-[#25D366] px-4 py-2 text-sm font-medium hover:bg-[#1ebe57] transition h-[40px]"
>
                    <SiWhatsapp className="h-6 w-6 text-white" />
                    <span className="text-white">Envoyez-nous un message</span>
                  </Link>
                </div>
              )}

              <p className="text-base text-foreground flex gap-2 items-center">
                <ClipboardCheck className="w-5 h-5 text-accent" />
                Prérequis : {prerequisText}
              </p>
            </div>
            </div>

            {/* RIGHT IMAGE */}
            <div className="order-1 md:order-2 relative aspect-video -mb-16 -mx-4 md:mx-0 md:mb-0">
            <div className="relative aspect-video ">
              <div className="rounded-2xl overflow-hidden bg-[#ECECEC] w-full h-full">
                <img
                  src={coverImage ?? "/placeholder-course.png"}
                  alt={title}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            </div>
          </div>
        </div>
{/* Wrapper */}
<div
  className={`max-w-7xl mx-auto px-4 lg:px-6 ${
    certifications.length > 0
      ? "lg:grid lg:grid-cols-3 lg:gap-12 items-stretch"
      : "flex flex-col items-center"
  }`}
>

      {/* ===== WHAT YOU WILL LEARN (Left on desktop) ===== */}
<div className="order-1 lg:order-1 lg:col-span-2 space-y-6 mt-4 lg:mt-0">

  <div className="h-20 sm:h-24 flex items-center justify-center">
    <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground text-center">
      Ce que vous <span className="text-accent">apprendrez</span>
    </h2>
  </div>

  {isBootcamp ? (
    <div className="space-y-4 sm:space-y-6 pt-4 sm:pt-5">
      {coursesList.map((course, index) => {
        const isOpen = openIndex === index

        return (
          <div
            key={index}
            className="rounded-2xl border border-border bg-white shadow-lg overflow-hidden"
          >
            {/* HEADER (always visible) */}
            <button
              onClick={() => toggleCard(index)}
              className="w-full flex items-center justify-between px-4 sm:px-6 py-4 sm:py-6 text-left hover:bg-muted/40 transition-colors"
            >
              <h3 className="text-lg sm:text-xl font-bold text-foreground">
                {course.title}
              </h3>

              <span
                className={`text-accent text-2xl sm:text-3xl transition-transform duration-300 ${
                  isOpen ? "rotate-180" : ""
                }`}
              >
                ▾
              </span>
            </button>

            {/* SMOOTH OPEN / CLOSE */}
            <div
              className={`grid transition-all duration-500 ease-in-out ${
                isOpen
                  ? "grid-rows-[1fr] opacity-100"
                  : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="overflow-hidden px-4 sm:px-6 pb-4 sm:pb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 pt-2">

                  {/* LEFT SIDE */}
                  <div className="space-y-3 sm:space-y-4">
                    <div className="w-full rounded-2xl overflow-hidden bg-muted aspect-video">
                      <img
                        src={course.coverImage ?? "/placeholder-course.png"}
                        alt={course.title}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {course.shortDescription}
                    </p>
                  </div>

                  {/* RIGHT SIDE */}
                  <div className="space-y-3 sm:space-y-4">
                    <h4 className="text-lg sm:text-xl font-semibold text-accent">
                      Contenu de la formation
                    </h4>

                    <ul className="space-y-2 text-muted-foreground">
                      {(course.whatYouWillLearn ?? []).map((item, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-accent mt-1" />
                          <span className="text-xs sm:text-sm">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  ) : (
    <div className="space-y-4 sm:space-y-6">
      {(courseFromPb?.whatYouWillLearn ?? []).map((item, i) => (
        <div
          key={i}
          className="rounded-2xl border border-border bg-white shadow-lg p-4 sm:p-5 flex items-center gap-3"
        >
          <CheckCircle className="w-5 sm:w-6 h-5 sm:h-6 text-accent text-bold mt-1" />
          <span className="text-sm sm:text-base text-foreground">{item}</span>
        </div>
      ))}
    </div>
  )}

</div>


{/* ===== CERTIFICATIONS (Left on desktop) ===== */}
{certifications.length > 0 && (
  <div className="order-2 lg:order-2 lg:col-span-1 space-y-6 mt-12 md:mt-0">
    <div className="h-24 flex items-center justify-center">
      <h2 className="text-3xl md:text-4xl font-bold text-accent text-center">
        Certifications
      </h2>
    </div>

    {/* CENTERED CARD */}
<div className="flex flex-col justify-center items-center">
        <div className="bg-white rounded-2xl shadow-lg border border-border p-4 flex flex-col gap-3 w-full max-w-sm">

        <div className="aspect-video rounded-xl overflow-hidden">
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <Award className="w-10 h-10 text-accent" />
          </div>
        </div>

        <div className="text-xl font-bold text-foreground">
          {certifications[certIndex].title}
        </div>

        {certifications[certIndex].issuer && (
          <div className="text-sm text-muted-foreground">
            Institut:{" "}
            <span className="text-foreground font-semibold">
              {certifications[certIndex].issuer}
            </span>
          </div>
        )}

        <span className="text-xs text-muted-foreground border-t border-border pt-2">
          Vérifié et Reconnu
        </span>
      </div>

      {/* NAV DOTS */}
      <div className="flex items-center justify-center gap-2 mt-18 md:mt-4">
                {certifications.map((_, i) => (
          <button
            key={i}
            onClick={() => setCertIndex(i)}
            className={`w-3 h-3 rounded-full transition ${
              i === certIndex ? "bg-accent" : "bg-muted"
            }`}
          />
        ))}
      </div>
    </div>
  </div>
)}





</div>




       {/* BOTTOM CTA */}




<div className="px-20 -my-4 mb-0 md:-mb-40">
 <Testimonials />

</div>

        <div className="-my-4">
 <Faq />

</div>
      </div>
          <section className="py-16 md:py-28 bg-gradient-to-br from-primary/5 via-background to-background">
  <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      viewport={{ once: true }}
      className="text-center space-y-6"
    >
      <div className="space-y-3">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground leading-tight">
          Prêt à transformer vos{" "}
          <span className="block">
            <span className="text-accent">compétences</span> ?
          </span>
         
        </h2>

        <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
          Rejoignez les milliers de développeurs qui ont déjà changé leur carrière.
          Commencez votre parcours d'apprentissage dès aujourd'hui.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
        <Button
          size="lg"
          onClick={() => {
  // Meta Pixel event
  // @ts-ignore
  window.fbq?.("track", "CompleteRegistration", {
    content_name: title,
    content_ids: [resolvedCourseId],
      content_type: isBootcamp ? "bootcamp" : "course",
  })

  setEnrollOpen(true)
}}
          className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground text-lg px-8"
        >
          {isBootcamp ? "S'inscrire au bootcamp" : "S'inscrire à la formation"}
        </Button>

        <Link
          href={`https://wa.me/${CONTACT_INFO.whatsapp}`}
          target="_blank"
          rel="noreferrer"
          aria-label="WhatsApp"
          className="w-full sm:w-auto"
        >
          <Button
            size="lg"
            variant="outline"
            className="w-full sm:w-auto text-lg px-8 bg-[#25D366] hover:bg-[#25D366]"
          >
            <SiWhatsapp className="h-7 w-7 text-white" />
            <span className="text-white">Envoyez-nous un message</span>
          </Button>
        </Link>
      </div>

      <p className="text-sm sm:text-base text-muted-foreground pt-4">
        ✓ Apprendre · ✓ Innover · ✓ Devenir un Geek
      </p>
    </motion.div>
  </div>
</section>

   

      <CourseEnrollDialog
        open={enrollOpen}
        onOpenChange={setEnrollOpen}
        title={title}
        ctaLabel={isBootcamp ? "S'inscrire au bootcamp" : "S'inscrire à la formation"}
        courseId={resolvedCourseId}
        context={isBootcamp ? "bootcamp" : "course"}
      />
    </>
  )
}
