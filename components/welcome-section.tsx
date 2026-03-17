"use client"

interface WelcomeSectionProps {
  name?: string
  variant?: "student" | "instructor"
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "Bonjour"
  if (hour < 18) return "Bon après-midi"
  return "Bonsoir"
}

export function WelcomeSection({ name = "Étudiant", variant = "student" }: WelcomeSectionProps) {
  const isInstructor = variant === "instructor"
  const greeting = getGreeting()

  return (
    <div className="px-1">
      <div className="space-y-1">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground">
          {greeting},{" "}
          <span className="text-accent font-extrabold">{name}</span> 👋
        </h2>

        <p className="text-sm md:text-base text-muted-foreground">
          {isInstructor
            ? "Gérez vos cours et inspirez vos étudiants à progresser !"
            : "Continuez à apprendre et à évoluer — votre prochaine session vous attend !"}
        </p>
      </div>
    </div>
  )
}
