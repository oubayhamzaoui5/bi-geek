"use client"

interface CourseProgressProps {
  completedLessons: number
  totalLessons: number
  nextSession?: {
    title: string
    date: string
    time: string
  }
}

export function CourseProgress({ completedLessons, totalLessons, nextSession }: CourseProgressProps) {
  const progressPercent = Math.round((completedLessons / totalLessons) * 100)

  return (
    <div className="rounded-xl border border-border bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/80 shadow-md p-6 space-y-6">
      {/* Progress */}
      <div className="space-y-3">
        <h3 className="text-2xl font-bold text-foreground">Votre progression</h3>
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-foreground">Complété</span>
            <span className="text-sm font-semibold text-accent">{progressPercent}%</span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-accent to-primary rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Vous avez complété {completedLessons} leçons sur {totalLessons}
        </p>
      </div>

      {/* Next Session */}
      {nextSession && (
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-foreground">Prochaine session</h3>
          <div className="flex flex-col gap-1 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{nextSession.title}</span>
            <span>{nextSession.date} à {nextSession.time}</span>
            <span className="text-green-600 font-semibold">Live</span>
          </div>
        </div>
      )}
    </div>
  )
}
