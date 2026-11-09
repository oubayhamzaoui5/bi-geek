import { z } from "zod"

export function isLinkedInUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === "https:" && !url.username && !url.password && !url.port &&
      (url.hostname === "linkedin.com" || url.hostname.endsWith(".linkedin.com"))
  } catch {
    return false
  }
}

export const instructorProfileSchema = z.object({
  instructorTitle: z.string().trim().max(120, "Le titre est limité à 120 caractères.").optional(),
  instructorSpecialty: z.string().trim().max(120, "La spécialité est limitée à 120 caractères.").optional(),
  instructorDescription: z.string().trim().max(1200, "La description est limitée à 1 200 caractères.").optional(),
  instructorLinkedIn: z.string().trim().max(500).refine(
    (value) => !value || isLinkedInUrl(value),
    "Saisissez un lien LinkedIn valide commençant par https://.",
  ).optional(),
  showOnGuestPages: z.boolean().optional(),
})

export type InstructorProfile = z.infer<typeof instructorProfileSchema>
