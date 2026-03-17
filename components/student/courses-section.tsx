"use client"

import { ProgramCard } from "@/components/program-card"
import { useSidebar } from "@/components/ui/sidebar-context"

export type StudentProgram = {
  id: string
  title: string
  shortDescription: string
  durationLabel: string
  tags?: string[]
  image?: string | null
  slug?: string
  completed?: boolean
  variant?: "course" | "bootcamp"
}

interface CoursesSectionProps {
  showCompleted?: boolean
  programs?: StudentProgram[]
}

export function CoursesSection({
  showCompleted = false,
  programs = [],
}: CoursesSectionProps) {
  const { isCollapsed } = useSidebar()
  const filteredPrograms = programs.filter((p) => !!p.completed === showCompleted)

  return (
    <section className="space-y-6">
      <h2 className="text-3xl font-bold text-accent mb-2">
        {showCompleted ? "Formations terminées" : "Formations actives"}
      </h2>

      <div
        className={`
          grid gap-6 grid-cols-1
          ${isCollapsed ? "md:grid-cols-3 xl:grid-cols-3" : "md:grid-cols-2 xl:grid-cols-2"}
          transition-[grid-template-columns] duration-200
        `}
      >
        {filteredPrograms.length === 0 ? (
          <div className="col-span-full rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
            Aucun contenu disponible pour le moment.
          </div>
        ) : (
          filteredPrograms.map((program) => {
            const variant = program.variant ?? "course"
            const hrefOverride =
              variant === "course"
                ? `/student-dashboard/course/${program.slug ?? program.id}`
                : undefined

            return (
              <ProgramCard
                key={program.id}
                program={program}
                variant={variant}
                hrefOverride={hrefOverride}
              />
            )
          })
        )}
      </div>
    </section>
  )
}
