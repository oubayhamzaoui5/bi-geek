// components/student/instructor-section.tsx
"use client"

import { Mail, Linkedin } from "lucide-react"

type GuestInstructor = {
  fullName: string
  title: string
  description: string
  avatarUrl: string
  linkedinLink: string
}

type InstructorSectionProps = {
  variant?: "student" | "guest"
  instructorFromPb?: GuestInstructor
}

export function InstructorSection({
  variant = "student",
  instructorFromPb,
}: InstructorSectionProps) {
  const isGuest = variant === "guest"

  const name = instructorFromPb?.fullName ?? "Jean Dupont"
  const jobTitle = instructorFromPb?.title ?? "Expert en Data Science"
  const description =
    instructorFromPb?.description ??
    "Expert en Data Science avec plusieurs années d'expérience en analyse de données et machine learning."
  const avatarSrc = instructorFromPb?.avatarUrl ?? "/instructor.jpg"
  const linkedinUrl = instructorFromPb?.linkedinLink ?? "#"

  return (
    <div className="flex flex-col items-center">
      {/* Instructor Card */}
      <div className="p-6 rounded-xl w-full flex flex-col items-center text-center space-y-4 border border-border bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/80 shadow-md">
        <h3 className="text-2xl font-bold text-accent">Instructeur</h3>

        {/* Profile Image */}
        <div className="w-40 h-40 rounded-lg overflow-hidden border-2 border-accent shadow-md">
          <img src={avatarSrc} alt={name} className="w-full h-full object-cover" />
        </div>

        {/* Instructor Info */}
        <div className="mb-2">
          <h4 className="font-semibold text-foreground text-lg mb-0">{name}</h4>
          <p className="text-sm text-muted-foreground mt-1">{jobTitle}</p>
        </div>

        {/* Small description */}
        <p className="text-xs text-muted-foreground leading-relaxed">
          {description}
        </p>

        {/* Actions */}
        <div className="flex items-center justify-center gap-2 w-full">
          {/* STUDENT → Email + LinkedIn */}
          {!isGuest && (
            <>
              <button className="flex-1 p-2 rounded-lg border border-border bg-muted/40 hover:bg-muted/60 transition-colors flex items-center justify-center gap-2">
                <Mail size={16} className="text-foreground" />
                <span className="text-sm font-medium text-foreground">
                  Envoyer message
                </span>
              </button>

              <a
                href={linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg border border-border bg-muted/40 hover:bg-muted/60 transition-colors"
              >
                <Linkedin size={16} className="text-accent" />
              </a>
            </>
          )}

          {/* GUEST → ONLY LinkedIn */}
          {isGuest && (
            <a
              href={linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 p-2 rounded-lg border border-border bg-accent hover:bg-accent/80 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Linkedin size={18} className="text-white" />
              <span className="text-sm font-medium text-white">LinkedIn</span>
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
