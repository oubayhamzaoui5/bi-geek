"use client"

import { useRef, useState } from "react"
import { Star, Users, Clock, Award } from "lucide-react"
import { Button } from "@/components/ui/button"
import { InstructorSection } from "@/components/student/instructor-section"
import { motion, useInView, AnimatePresence } from "framer-motion"
import { CourseEnrollDialog } from "@/components/course-enroll-dialog"

type GuestCourse = {
  id?: string
  title: string
  shortDescription: string
  longDescription: string
  durationLabel: string
  levelLabel: string
  certificate: boolean
  rating: number
  reviewsCount: number
  whatYouWillLearn?: string[]
}

type GuestInstructor = {
  fullName: string
  title: string
  description: string
  avatarUrl: string
  linkedinLink: string
}

type CourseDetailsSectionProps = {
  variant?: "student" | "guest"
  context?: "course" | "bootcamp"
  /** Used when variant="guest" (course or bootcamp) */
  courseFromPb?: GuestCourse
  /** Used only when variant="guest" & context="course" */
  instructorFromPb?: GuestInstructor
  courseId?: string
}

export function CourseDetailsSection({
  variant = "student",
  context = "course",
  courseFromPb,
  instructorFromPb,
  courseId,
}: CourseDetailsSectionProps) {
  const isGuest = variant === "guest"
  const isBootcamp = context === "bootcamp"

  // ✅ Use PB for guest (course OR bootcamp) when provided
  const usePb = isGuest && !!courseFromPb

  const resolvedCourseId = courseId ?? courseFromPb?.id ?? ""

  const title = isBootcamp
    ? usePb
      ? courseFromPb!.title
      : "Bootcamp Développeur Web Full-Stack"
    : usePb
    ? courseFromPb!.title
    : "Maîtrise de Python pour l'Analyse de Données"

  const subtitle = isBootcamp
    ? usePb
      ? courseFromPb!.shortDescription
      : "Un parcours intensif combinant plusieurs formations pour devenir développeur web moderne."
    : usePb
    ? courseFromPb!.shortDescription
    : "Apprenez Python et transformez vos données en insights précieux."

  const rating = usePb ? courseFromPb!.rating : 4.8
  const reviewsCount = usePb ? courseFromPb!.reviewsCount : 324

  const durationText = isBootcamp
    ? usePb
      ? courseFromPb!.durationLabel
      : "120 heures"
    : usePb
    ? courseFromPb!.durationLabel
    : "40 heures"

  const levelText = isBootcamp
    ? usePb
      ? courseFromPb!.levelLabel
      : "Débutant à avancé"
    : usePb
    ? courseFromPb!.levelLabel
    : "Intermédiaire"

  const certificateText = usePb
    ? courseFromPb!.certificate
      ? "Oui"
      : "Non"
    : "Oui"

  const aboutText = isBootcamp
    ? usePb
      ? courseFromPb!.longDescription
      : "Ce bootcamp regroupe plusieurs formations essentielles (HTML/CSS/JS, SQL, React...) pour vous amener d'un niveau débutant à un profil opérationnel en développement web."
    : usePb
    ? courseFromPb!.longDescription
    : "Ce cours complet vous guide à travers les fondamentaux de Python jusqu'aux techniques avancées d'analyse de données. Vous apprendrez à manipuler des données avec Pandas, créer des visualisations avec Matplotlib et Seaborn, et effectuer des analyses statistiques significatives."

  const defaultCourseWhatYouWillLearn: string[] = [
    "Les bases de Python et la programmation orientée objet",
    "Manipulation et nettoyage de données avec Pandas",
    "Visualisation de données avancée",
    "Analyse statistique et machine learning basique",
  ]

  const defaultBootcampWhatYouWillLearn: string[] = [
    "Maîtriser les bases du développement web (HTML, CSS, JavaScript)",
    "Construire des interfaces modernes avec React",
    "Manipuler des bases de données avec SQL",
    "Mettre en production des applications web complètes",
  ]

  const hasCustomWhatYouWillLearn =
    usePb && courseFromPb!.whatYouWillLearn && courseFromPb!.whatYouWillLearn!.length > 0

  const whatYouWillLearn: string[] = hasCustomWhatYouWillLearn
    ? courseFromPb!.whatYouWillLearn!
    : isBootcamp
    ? defaultBootcampWhatYouWillLearn
    : defaultCourseWhatYouWillLearn

  const ctaLabel = isBootcamp ? "S'inscrire au bootcamp" : "S'inscrire à la formation"

  const headerRef = useRef<HTMLDivElement | null>(null)
  const headerInView = useInView(headerRef, {
    margin: "-80px 0px 0px 0px",
  })

  const [enrollOpen, setEnrollOpen] = useState(false)

  return (
    <>
      {isGuest && (
        <AnimatePresence>
          {!headerInView && (
            <motion.div
              initial={{ y: -80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -80, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="fixed top-16 left-0 right-0 z-40"
            >
              <div className="mx-auto max-w-6xl px-4">
                <div className="rounded-2xl border border-border bg-card/95 shadow-lg px-6 py-4 flex items-center justify-between gap-6">
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-foreground truncate">
                      {title}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Star className="h-4 w-4 fill-accent text-accent" />
                        <span>
                          {rating} ({reviewsCount} avis)
                        </span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4 text-accent" />
                        <span>{durationText}</span>
                      </span>
                    </div>
                  </div>

                  <Button
                    onClick={() => setEnrollOpen(true)}
                    className="bg-accent hover:bg-[#7d3d9f] text-white px-6 py-2 text-sm font-semibold whitespace-nowrap cursor-pointer"
                  >
                    {ctaLabel}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      <div className="space-y-6">
        <div
          ref={headerRef}
          className="rounded-xl border border-border bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/80 shadow-md p-8 space-y-6"
        >
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold text-foreground">{title}</h1>
              <p className="text-lg text-muted-foreground">{subtitle}</p>
            </div>

            <div className="flex items-center gap-1 bg-accent/10 px-4 py-2 rounded-lg self-start">
              <Star size={20} className="fill-accent text-accent" />
              <span className="font-semibold text-accent">{rating}</span>
              <span className="text-sm text-muted-foreground">({reviewsCount} avis)</span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 items-stretch">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-accent/10">
                <Clock size={20} className="text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Durée</p>
                <p className="font-semibold text-foreground">{durationText}</p>
              </div>
            </div>

            {!isGuest && (
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-accent/10">
                  <Users size={20} className="text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Étudiants</p>
                  <p className="font-semibold text-foreground">2,450</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-accent/10">
                <Award size={20} className="text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Niveau</p>
                <p className="font-semibold text-foreground">{levelText}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-accent/10">
                <Star size={20} className="text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Certificat</p>
                <p className="font-semibold text-foreground">{certificateText}</p>
              </div>
            </div>

            {isGuest && (
              <div className="col-span-2 md:col-span-1 flex h-full items-end justify-end">
                <Button
                  onClick={() => setEnrollOpen(true)}
                  className="bg-accent hover:bg-[#7d3d9f] text-white cursor-pointer"
                >
                  {ctaLabel}
                </Button>
              </div>
            )}
          </div>
        </div>

        <div
          className={`grid grid-cols-1 gap-6 items-stretch ${
            isGuest ? "lg:grid-cols-1" : "lg:grid-cols-4"
          }`}
        >
          <div className={`${isGuest ? "lg:col-span-1" : "lg:col-span-3"} flex flex-col`}>
            <div className="rounded-xl border border-border bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/80 shadow-md p-6 space-y-4 flex-1">
              <h2 className="text-2xl font-bold text-accent">
                {isBootcamp ? "À propos du bootcamp" : "À propos du cours"}
              </h2>
              <p className="text-muted-foreground leading-relaxed">{aboutText}</p>

              {/* ✅ Now also visible for bootcamp */}
              <div className="space-y-3">
                <h3 className="font-semibold text-foreground">Ce que vous apprendrez :</h3>
                <ul className="space-y-2 text-muted-foreground">
                  {whatYouWillLearn.map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="text-accent font-bold">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {!isGuest && (
            <div className="flex flex-col">
              <InstructorSection variant={variant} instructorFromPb={instructorFromPb} />
            </div>
          )}
        </div>
      </div>

      <CourseEnrollDialog
        open={enrollOpen}
        onOpenChange={setEnrollOpen}
        title={title}
        ctaLabel={ctaLabel}
        courseId={resolvedCourseId}
                context={context === "bootcamp" ? "bootcamp" : "course"}

      />
    </>
  )
}
