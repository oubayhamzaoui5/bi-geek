"use client"

type ProgressOverviewProps = {
  totalProgress: number
  activeCourses: number
  certificates: number
  learningHours: number
}

export function ProgressOverview({
  totalProgress,
  activeCourses,
  certificates,
  learningHours,
}: ProgressOverviewProps) {
  const r = 45
  const circumference = 2 * Math.PI * r
  const safeProgress = Math.min(100, Math.max(0, totalProgress))

  return (
    <div className="rounded-xl border border-border bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/80 shadow-md p-4 md:p-6 h-full">
      <h3 className="text-xl font-bold text-foreground mb-6">Progression globale</h3>

      <div className="flex flex-col items-center">
        <div className="relative w-32 h-32">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50" cy="50" r={r} fill="none" strokeWidth="8"
              style={{ stroke: "hsl(var(--muted-foreground) / 0.15)" }}
            />
            <circle
              cx="50" cy="50" r={r} fill="none" strokeWidth="8"
              stroke="url(#progressGradient)"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - (circumference * safeProgress) / 100}
              strokeLinecap="round"
              className="transition-all duration-1000"
            />
            <defs>
              <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="rgb(139, 92, 246)" />
                <stop offset="100%" stopColor="rgb(59, 130, 246)" />
              </linearGradient>
            </defs>
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-foreground">{safeProgress}%</span>
            <span className="text-xs text-muted-foreground">Complété</span>
          </div>
        </div>

        <div className="mt-6 w-full space-y-3 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Cours actifs</span>
            <span className="text-foreground font-semibold">{activeCourses}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Certificats</span>
            <span className="text-foreground font-semibold">{certificates}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Heures d'apprentissage</span>
            <span className="text-foreground font-semibold">{learningHours}h</span>
          </div>
        </div>
      </div>
    </div>
  )
}
