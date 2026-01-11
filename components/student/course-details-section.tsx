"use client"

import { useState } from "react"
import { Star, Clock, Award, Zap, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CourseEnrollDialog } from "@/components/course-enroll-dialog"

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

  return (
    <>
      <div className="space-y-6 max-w-7xl mx-auto px-4  md:px-68">
        {/* Cover Image */}
        {coverImage && (
          <div className="w-full aspect-[16/9] overflow-hidden rounded-md">
            <img
              src={coverImage}
              alt={title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Title + Rating */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <h1 className="text-2xl  md:text-2xl font-bold text-foreground">{title}</h1>
          <div className="flex items-center gap-2 text-accent text-sm sm:text-base">
            <Star className="h-5 w-5 fill-accent text-accent" />
            <span className="font-semibold">{rating.toFixed(1)}</span>
            <span className="text-xs sm:text-sm text-muted-foreground">({reviewsCount} avis)</span>
          </div>
        </div>

        {/* Long Description */}
        <div className="text-muted-foreground leading-relaxed text-sm sm:text-base">{longDescription}</div>

        {/* Duration & Prerequis */}
        <div className="flex flex-col sm:flex-row gap-4 md:gap-0 text-accent mt-2 text-sm sm:text-base">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-accent" />
            <span>Durée : {durationText}</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-accent" />
            <span>Prérequis : {prerequisText}</span>
          </div>
        </div>

        {/* What You Will Learn */}
        <div className="space-y-6 mt-4">
          <h2 className="text-xl sm:text-2xl font-bold text-accent mb-2">Ce que vous apprendrez :</h2>
          {isBootcamp
            ? coursesList.map((c, i) => (
                <div key={i} className="space-y-2">
                  <h3 className="text-lg sm:text-xl font-semibold text-accent">{c.title}</h3>
                  <ul className="space-y-1 text-muted-foreground pl-4">
                    {(c.whatYouWillLearn ?? []).map((item, j) => (
                      <li key={j} className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-accent mt-1 flex-shrink-0" />
                        <span className="text-sm sm:text-base">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            : (
              <ul className="space-y-1 text-muted-foreground pl-4">
                {(courseFromPb?.whatYouWillLearn ?? []).map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-accent mt-1 flex-shrink-0" />
                    <span className="text-sm sm:text-base">{item}</span>
                  </li>
                ))}
              </ul>
            )}
        </div>

        {/* Certifications */}
        {certifications.length > 0 && (
          <div className="space-y-4 mt-4">
            <h2 className="text-xl sm:text-2xl font-bold text-accent mb-2">Certifications :</h2>
            <div className="space-y-3">
              {certifications.map((cert, i) => (
                <div key={i} className="flex flex-col">
                  <div className="flex items-center gap-2 text-accent">
                    <Award className="w-6 h-6 sm:w-8 sm:h-8 text-accent flex-shrink-0" />
                    <div className="flex flex-col text-sm sm:text-base">
                      <span className="font-semibold">{cert.title}</span>
                      {cert.issuer && <span className="text-muted-foreground">{cert.issuer}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        {isGuest && (
          <Button
            onClick={() => setEnrollOpen(true)}
            className="bg-accent hover:bg-[#7d3d9f] text-white px-4 sm:px-6 py-2 sm:py-3 font-semibold mt-6 w-full sm:w-auto"
          >
            {isBootcamp ? "S'inscrire au bootcamp" : "S'inscrire à la formation"}
          </Button>
        )}
      </div>

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
