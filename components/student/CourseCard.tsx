"use client"

import Link from "next/link"
import { Clock, CheckCircle2, ClipboardList, CalendarDays, ArrowRight, Archive } from "lucide-react"

export type CourseStatus = "upcoming" | "active" | "completed" | "stored"

export interface Course {
  id: string
  title: string
  progress: number
  duration: string
  instructorName?: string
  groupId?: string | null
  thumbnail: string
  hasWork: boolean
  status: CourseStatus
  startDate?: string
  applyUrl?: string
  slug?: string
  programType?: "course" | "bootcamp"
}

export function CourseCard({ course }: { course: Course }) {
  const isCompleted = course.status === "completed"
  const isUpcoming = course.status === "upcoming"
  const isActive = course.status === "active"
  const isStored = course.status === "stored"
  const courseHref = course.programType === "bootcamp"
    ? `/student-dashboard/bootcamp/${course.slug ?? course.id}`
    : `/student-dashboard/course/${course.slug ?? course.id}`

  return (
    <div className="glass-dark p-4 rounded-lg border border-white/10 hover:border-accent/50 transition-all duration-300 group flex flex-col">
      <div className="w-full h-48 rounded-sm overflow-hidden bg-white/5 mb-4">
        <img
          src={course.thumbnail || "/placeholder.svg"}
          alt={course.title}
          className="w-full h-full object-cover transition-transform duration-300"
        />
      </div>

      <div className="flex-1 flex flex-col justify-between">
        <div>
          <h4 className="text-lg font-semibold text-white mb-1">{course.title}</h4>

          <div className="flex flex-wrap items-center gap-3 text-sm text-white/60 mb-2">
            <span className="flex items-center gap-1">
              <Clock size={14} />
              {course.duration}
            </span>

            {isCompleted && (
              <span className="flex items-center gap-1 text-accent">
                <CheckCircle2 size={14} />
                Complété
              </span>
            )}

            {course.hasWork && isActive && (
              <span className="flex items-center gap-1 text-yellow-400">
                <ClipboardList size={14} />
                Travail à faire
              </span>
            )}

            {isUpcoming && course.startDate && (
              <span className="flex items-center gap-1 text-cyan-300">
                <CalendarDays size={14} />
                {new Date(course.startDate).toLocaleDateString("fr-FR", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            )}

            {isStored && (
              <span className="flex items-center gap-1 text-white/80 px-2 py-0.5 rounded-md bg-white/10 border border-white/10 text-xs">
                <Archive size={12} />
                100% enregistré
              </span>
            )}
          </div>
        </div>

        <div className="mt-4">
          {(isUpcoming || isStored) && (
            <Link href={course.applyUrl ?? `/apply/${course.id}`}>
              <button className="w-full px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:opacity-90 transition-colors flex items-center justify-center gap-1">
                Appliquer <ArrowRight size={14} />
              </button>
            </Link>
          )}

          {isActive && (
            <Link href={courseHref}>
              <button className="w-full px-4 py-2 bg-white/5 text-white rounded-lg text-sm font-medium hover:bg-white/10 transition-colors border border-white/10">
                Détails
              </button>
            </Link>
          )}

          {isCompleted && (
            <Link href={courseHref}>
              <button className="w-full px-4 py-2 bg-white/5 text-white rounded-lg text-sm font-medium hover:bg-white/10 transition-colors border border-white/10">
                Voir le cours
              </button>
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
