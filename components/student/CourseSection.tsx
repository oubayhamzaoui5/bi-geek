"use client"

import { ProgramCard } from "@/components/program-card"
import { motion } from "framer-motion"
import { useSidebar } from "@/components/ui/sidebar-context"

interface CourseSectionProps {
  title: string
  subtitle?: string
  courses: Course[]
}

const titleVariants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
}

const gridVariants = {
  hidden: { opacity: 1 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
}

export function CourseSection({ title, subtitle, courses }: CourseSectionProps) {
  const { isCollapsed } = useSidebar()

  // ✅ 2 columns if expanded, 3 columns if collapsed
  const gridCols = isCollapsed ? "grid-cols-3" : "grid-cols-2"

  return (
    <section className="space-y-4">
      {/* --- Title --- */}
      <motion.div
        variants={titleVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.3 }}
        className="flex items-center justify-between mb-3"
      >
        <h3 className="text-2xl font-bold text-foreground">{title}</h3>
        {subtitle && <span className="text-sm text-muted-foreground">{subtitle}</span>}
      </motion.div>

      {/* --- Grid --- */}
      {courses.length === 0 ? (
        <p className="text-muted-foreground">Aucun formation dans cette catégorie.</p>
      ) : (
        <motion.div
          className={`grid ${gridCols} gap-6 transition-all duration-300 px-4`}
          variants={gridVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.15 }}
        >
          {courses.map((course) => {
            const pseudoProgram = {
              id: course.id,
              title: course.title,
              shortDescription:
                course.status === "active"
                  ? "Formation en cours – poursuivez votre apprentissage."
                  : course.status === "upcoming"
                  ? "Prochainement disponible, inscrivez-vous dès maintenant."
                  : course.status === "completed"
                  ? "Formation terminée – consultez vos progrès."
                  : "Formation enregistrée – apprenez à votre rythme.",
              category:
                course.status === "upcoming"
                  ? "BI"
                  : course.status === "active"
                  ? "Data"
                  : course.status === "completed"
                  ? "AI/ML"
                  : "Cloud",
              level:
                course.progress >= 80
                  ? "Avancé"
                  : course.progress >= 40
                  ? "Intermédiaire"
                  : "Débutant",
              hours: parseInt(course.duration),
              thumbnail: course.thumbnail,
            }

            return (
              <motion.div key={course.id} variants={cardVariants}>
                <ProgramCard program={pseudoProgram} />
              </motion.div>
            )
          })}
        </motion.div>
      )}
    </section>
  )
}
