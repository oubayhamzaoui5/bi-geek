"use client"

interface WelcomeSectionProps {
  name?: string
  variant?: "student" | "instructor"
}

export function WelcomeSection({ name = "Jean", variant = "student" }: WelcomeSectionProps) {
  const isInstructor = variant === "instructor"

  return (
    <div className="!border-none px-4">
      <div className="space-y-2">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground">
          Bienvenue,{" "}
          <span className="text-accent font-extrabold">{name}</span> 👋
        </h2>

        <p className="text-lg text-muted-foreground">
          {isInstructor
            ? "Gérez vos cours et inspirez vos étudiants à progresser !"
            : "Continuez à apprendre et à évoluer !"}
        </p>
      </div>
    </div>
  )
}
