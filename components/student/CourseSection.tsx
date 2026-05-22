﻿"use client"

import { ProgramCard } from "@/components/program-card"
import { motion } from "framer-motion"
import { useSidebar } from "@/components/ui/sidebar-context"
import type { Course } from "@/components/student/CourseCard"

interface CourseSectionProps {
  title: string
  subtitle?: string
  courses: Course[]
}

const titleVariants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
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
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
}

export function CourseSection({ title, subtitle, courses }: CourseSectionProps) {
  const { isCollapsed } = useSidebar()
  const gridCols = isCollapsed ? "grid-cols-3" : "grid-cols-2"

  return (
    <section className="space-y-4">
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
                  ? "Formation en cours — poursuivez votre apprentissage."
                  : course.status === "upcoming"
                  ? "Prochainement disponible, inscrivez-vous dès maintenant."
                  : course.status === "completed"
                  ? "Formation terminée — consultez vos progrès."
                  : "Formation enregistrée — apprenez à votre rythme.",
              durationLabel: course.duration,
              instructorName: course.instructorName,
              image: course.thumbnail,
              tags: [course.status],
            }

            return (
              <motion.div key={course.id} variants={cardVariants}>
                <ProgramCard
                  program={pseudoProgram}
                  hrefOverride={
                    course.groupId
                      ? `/student-dashboard/groups/${course.groupId}`
                      : `/student-dashboard/course/${course.slug ?? course.id}`
                  }
                />
              </motion.div>
            )
          })}
        </motion.div>
      )}
    </section>
  )
}
