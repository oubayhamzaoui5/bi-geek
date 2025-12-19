// components/instructor/instructor-courses.tsx
"use client"

import { useState } from "react"
import { BookOpen, Star, Users, Clock } from "lucide-react"

type CourseCard = {
  id: string
  title: string
  status: "Actifs" | "À venir" | "Modéré"
  students: number
  rating?: number
  hours?: number
  progress?: number
}

const MOCK: CourseCard[] = [
  { id: "1", title: "SQL & Data Modeling G1", status: "Actifs", students: 8, rating: 4.7, hours: 24, progress: 70 },
  { id: "2", title: "SQL & Data Modeling G2", status: "Actifs", students: 10, rating: 4.7, hours: 24, progress: 55 },
  { id: "3", title: "Python pour la Data", status: "Actifs", students: 9, rating: 4.8, hours: 40, progress: 90 },
  { id: "4", title: "Visualisation avec React", status: "À venir", students: 0, hours: 10, progress: 0 },
  { id: "5", title: "Intro Machine Learning", status: "Modéré", students: 0, progress: 0 },
]

export function InstructorCourses({
  filters = ["Actifs", "À venir", "Modéré"],
  defaultFilter = "Actifs",
}: {
  filters?: CourseCard["status"][]
  defaultFilter?: CourseCard["status"]
}) {
  const [filter, setFilter] = useState<CourseCard["status"]>(defaultFilter)
  const data = MOCK.filter(c => c.status === filter)

  return (
    <div className="rounded-xl border border-border bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/80 shadow-md p-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-2xl font-bold text-foreground">Mes formations</h2>
        <div className="flex items-center gap-2">
          {filters.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm border transition
                ${filter === f
                  ? "bg-accent hover:bg-[#7d3d9f] cursor-pointer text-white"
                  : "border-foreground/10 shadow-xs text-foreground hover:bg-accent hover:text-white cursor-pointer"}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 md:grid-cols-3 gap-4">
        {data.map(c => (
          <div key={c.id} className="rounded-xl border border-border bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/80 shadow-md  p-5 ">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="text-accent" size={18} />
                <h3 className="font-semibold text-foreground">{c.title}</h3>
              </div>
              {typeof c.rating === "number" && (
                <div className="flex items-center gap-1 text-accent">
                  <Star size={16} className="fill-accent" />
                  <span className="text-sm font-medium">{c.rating}</span>
                </div>
              )}
            </div>

            <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Users size={16} /> {c.students}
              </div>
              {c.hours && (
                <div className="flex items-center gap-1">
                  <Clock size={16} /> {c.hours} h
                </div>
              )}
            </div>

            {/* Progress bar */}
            {typeof c.progress === "number" && (
              <div className="mt-3">
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent transition-all duration-500"
                    style={{ width: `${c.progress}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{c.progress}% complété</p>
              </div>
            )}

            <div className="mt-4 flex items-center gap-2">
             
              <button className="px-3 py-1.5 text-sm rounded-md bg-accent hover:bg-[#7d3d9f] cursor-pointer text-white">
                Voir
              </button>
            </div>
          </div>
        ))}
        {data.length === 0 && (
          <div className="rounded-lg p-8 border border-white/10 text-center text-muted-foreground">
            Aucun cours dans “{filter}”.
          </div>
        )}
      </div>
    </div>
  )
}
