"use client"

interface CourseProgressProps {
  completedLessons: number
  totalLessons: number
  coverImage?: string
  courseTitle?: string
  stats?: {
    videos: number
    articles: number
    lessons: number
  }
  nextSession?: {
    title: string
    date: string
    time: string
  }
}

export function CourseProgress({
  completedLessons,
  totalLessons,
  coverImage,
  courseTitle,
  stats,
  nextSession,
}: CourseProgressProps) {
  const progressPercent =
    totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0
  const radius = 42
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference - (progressPercent / 100) * circumference

  return (
    <div className="rounded-2xl border border-border bg-card/90 backdrop-blur shadow-[0_20px_60px_rgba(15,23,42,0.12)] p-5 md:p-6 space-y-6">
      <div className="flex items-center gap-4 md:gap-5">
        <div className="relative h-16 w-24 md:h-20 md:w-28 rounded-xl overflow-hidden border border-border">
          <img
            src={coverImage ?? "/placeholder-course.png"}
            alt={courseTitle ?? "Course cover"}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
        </div>

        <div className="flex-1 space-y-2">
          <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Progression</p>
          <div className="flex items-center gap-3">
            <div className="relative h-16 w-16">
              <svg className="h-16 w-16 -rotate-90">
                <circle
                  cx="32"
                  cy="32"
                  r={radius}
                  stroke="hsl(var(--muted))"
                  strokeWidth="6"
                  fill="none"
                />
                <circle
                  cx="32"
                  cy="32"
                  r={radius}
                  stroke="url(#progressGradient)"
                  strokeWidth="6"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                />
                <defs>
                  <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="hsl(var(--accent))" />
                    <stop offset="100%" stopColor="hsl(var(--primary))" />
                  </linearGradient>
                </defs>
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-foreground">
                {progressPercent}%
              </span>
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-foreground">
                {courseTitle ?? "Votre cours"}
              </h3>
              <p className="text-xs text-muted-foreground">
                {totalLessons > 0
                  ? `${completedLessons} leçons terminées sur ${totalLessons}`
                  : "Aucune leçon pour le moment."}
              </p>
            </div>
          </div>
        </div>
      </div>

      <button className="w-full rounded-xl bg-accent text-accent-foreground font-semibold py-3 tracking-wide shadow-[0_0_24px_hsl(var(--accent)/0.35)] hover:bg-accent/90 transition animate-[pulse_3s_ease-in-out_infinite]">
        Continuer l'apprentissage
      </button>

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="rounded-full border border-border bg-muted/40 px-3 py-1">
          {stats?.videos ?? 0} Vidéos
        </span>
        <span className="rounded-full border border-border bg-muted/40 px-3 py-1">
          {stats?.articles ?? 0} Articles
        </span>
        <span className="rounded-full border border-border bg-muted/40 px-3 py-1">
          {stats?.lessons ?? totalLessons} Leçons
        </span>
      </div>

      <div className="border-t border-border pt-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-accent/10 text-accent flex items-center justify-center text-xs font-semibold">
            BG
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Bi Geek Team</p>
            <p className="text-xs text-muted-foreground">Instructeur principal</p>
          </div>
        </div>
      </div>

      {nextSession && (
        <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-4">
          <h3 className="text-sm font-semibold text-foreground">Prochaine session</h3>
          <div className="flex flex-col gap-1 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{nextSession.title}</span>
            <span>
              {nextSession.date} à {nextSession.time}
            </span>
            <span className="text-emerald-600 font-semibold">Live</span>
          </div>
        </div>
      )}
    </div>
  )
}
