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
      <div className="flex flex-col items-center justify-center pt-2 pb-4 space-y-6">
        <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground w-full text-center">Progression globale</p>
        
        <div className="relative h-40 w-40 md:h-48 md:w-48 flex-shrink-0 rounded-full border border-border/50 bg-muted/20 flex items-center justify-center shadow-inner">
          <div className="absolute inset-0 m-4 rounded-full border border-border/80 bg-background shadow-sm flex items-center justify-center">
            {/* The SVG is layered perfectly inside the double circles */}
            <svg className="h-full w-full -rotate-90 scale-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r={radius}
                stroke="hsl(var(--muted))"
                strokeWidth="5"
                fill="none"
              />
              <circle
                cx="50"
                cy="50"
                r={radius}
                stroke="url(#progressGradientCard)"
                strokeWidth="5"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
              />
              <defs>
                <linearGradient id="progressGradientCard" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="hsl(var(--accent))" />
                  <stop offset="100%" stopColor="hsl(var(--primary))" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-transparent z-10">
              <span className="text-3xl md:text-5xl font-extrabold text-foreground tabular-nums tracking-tighter">
                {progressPercent}%
              </span>
            </div>
          </div>
        </div>

        <div className="text-center space-y-1">
          <p className="text-sm font-medium text-foreground">
            {totalLessons > 0
              ? `${completedLessons} leçons terminées sur ${totalLessons}`
              : "Aucune leçon pour le moment"}
          </p>
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
