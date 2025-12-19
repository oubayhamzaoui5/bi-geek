"use client"

export function ProgressOverview() {
  const totalProgress = 68
  const r = 45
  const circumference = 2 * Math.PI * r

  return (
    <div className="rounded-xl border border-border bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/80 shadow-md p-4 md:p-6 h-full">
      <h3 className="text-xl font-bold text-foreground mb-6">Progression globale</h3>

      <div className="flex flex-col items-center">
        {/* Circular progress */}
        <div className="relative w-32 h-32">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            {/* Background circle */}
            <circle
              cx="50" cy="50" r={r} fill="none" strokeWidth="8"
              style={{ stroke: "hsl(var(--muted-foreground) / 0.15)" }}
            />
            {/* Progress circle */}
            <circle
              cx="50" cy="50" r={r} fill="none" strokeWidth="8"
              stroke="url(#progressGradient)"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - (circumference * totalProgress) / 100}
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

          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-foreground">{totalProgress}%</span>
            <span className="text-xs text-muted-foreground">Complété</span>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-6 w-full space-y-3 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Cours actifs</span>
            <span className="text-foreground font-semibold">2</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Certificats</span>
            <span className="text-foreground font-semibold">1</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Heures d'apprentissage</span>
            <span className="text-foreground font-semibold">37h</span>
          </div>
        </div>
      </div>
    </div>
  )
}
