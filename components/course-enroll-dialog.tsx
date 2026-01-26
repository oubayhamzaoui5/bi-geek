"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type CourseEnrollDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  ctaLabel: string
  courseId: string           // id of course OR bootcamp
  context: "course" | "bootcamp" // 👈 tells API what to store
}

export function CourseEnrollDialog({
  open,
  onOpenChange,
  title,
  ctaLabel,
  courseId,
  context,
}: CourseEnrollDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    birthDate: "",
    email: "",
    hasExperience: "", // "yes" | "no"
    note: "",
  })

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setIsSubmitting(true)

    try {
      if (!courseId) {
        setError("Identifiant du programme manquant. Impossible d’envoyer le formulaire.")
        return
      }

      const isBootcamp = context === "bootcamp"

      const res = await fetch("/api/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // 👇 Only one will have a value
          courseId: isBootcamp ? null : courseId,
          bootcampId: isBootcamp ? courseId : null,

          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          phone: form.phone.trim(),
          birthDate: form.birthDate, // YYYY-MM-DD
          email: form.email.trim() || "",
          hasExperience: form.hasExperience === "yes",
          note: form.note.trim() || "",
        }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setError(data?.error ?? "Erreur lors de l’envoi. Réessayez.")
        return
      }
      // ✅ Meta Pixel — real conversion
// @ts-ignore
window.fbq?.("track", "CompleteRegistration", {
  content_name: title,
  content_ids: [courseId],
  content_type: context, // "course" | "bootcamp"
})

      setSuccess(true)
      onOpenChange(false)

      setForm({
        firstName: "",
        lastName: "",
        phone: "",
        birthDate: "",
        email: "",
        hasExperience: "",
        note: "",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const canSubmit =
    !!courseId &&
    form.firstName.trim().length > 0 &&
    form.lastName.trim().length > 0 &&
    form.phone.trim().length > 0 &&
    form.birthDate.trim().length > 0 &&
    (form.hasExperience === "yes" || form.hasExperience === "no")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent
    className="
      w-full
      h-full
      sm:max-w-[560px]
      sm:h-auto
      sm:rounded-2xl
      sm:border
      sm:border-border
      sm:bg-card/95
      sm:backdrop-blur
      supports-[backdrop-filter]:sm:bg-card/80
      shadow-xl
      

      /* MOBILE FIXES */
      max-h-screen
      overflow-hidden
      sm:overflow-visible
    "
  >
    <div className="max-h-[90vh] sm:max-h-none overflow-y-auto px-0 sm:px-0 py-4 sm:py-4">
      <DialogHeader className="px-4 sm:px-0">
        <DialogTitle className="text-lg sm:text-xl font-bold text-foreground">
          {ctaLabel}
        </DialogTitle>
        <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
          Remplissez ce formulaire pour vous inscrire à : <br />
          <span className="font-semibold text-foreground">{title}</span>
        </DialogDescription>
      </DialogHeader>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs sm:text-sm text-foreground mx-4 sm:mx-0">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-xs sm:text-sm text-foreground mx-4 sm:mx-0">
          ✅ Envoyé avec succès !
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4 sm:space-y-5 px-4 sm:px-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="space-y-1">
            <Label htmlFor="firstName" className="text-xs sm:text-sm">
              Prénom *
            </Label>
            <Input
              id="firstName"
              value={form.firstName}
              onChange={(e) => update("firstName", e.target.value)}
              placeholder="Votre prénom"
              className="bg-background/60 text-sm"
              required
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="lastName" className="text-xs sm:text-sm">
              Nom *
            </Label>
            <Input
              id="lastName"
              value={form.lastName}
              onChange={(e) => update("lastName", e.target.value)}
              placeholder="Votre nom"
              className="bg-background/60 text-sm"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="space-y-1">
            <Label htmlFor="phone" className="text-xs sm:text-sm">
              Téléphone *
            </Label>
            <Input
              id="phone"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              placeholder="xx xxx xxx"
              className="bg-background/60 text-sm"
              required
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="birthDate" className="text-xs sm:text-sm">
              Date de naissance *
            </Label>
            <Input
              id="birthDate"
              type="date"
              value={form.birthDate}
              onChange={(e) => update("birthDate", e.target.value)}
              className="bg-background/60 text-sm"
              required
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="email" className="text-xs sm:text-sm">
            Email (optionnel)
          </Label>
          <Input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            placeholder="ex: nom@email.com"
            className="bg-background/60 text-sm"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs sm:text-sm">
            Avez-vous déjà des connaissances liées à cette formation ?
          </Label>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => update("hasExperience", "yes")}
              className={`w-full rounded-xl border px-3 py-2 text-xs sm:text-sm font-medium transition cursor-pointer ${
                form.hasExperience === "yes"
                  ? "border-accent bg-accent/10 text-foreground"
                  : "border-border bg-background/50 text-foreground hover:bg-accent/5"
              }`}
            >
              Oui
            </button>

            <button
              type="button"
              onClick={() => update("hasExperience", "no")}
              className={`w-full rounded-xl border px-3 py-2 text-xs sm:text-sm font-medium transition cursor-pointer ${
                form.hasExperience === "no"
                  ? "border-accent bg-accent/10 text-foreground"
                  : "border-border bg-background/50 text-foreground hover:bg-accent/5"
              }`}
            >
              Non
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="note" className="text-xs sm:text-sm">
            Note (optionnel)
          </Label>
          <Textarea
            id="note"
            value={form.note}
            onChange={(e) => update("note", e.target.value)}
            placeholder="Ex: vos objectifs, disponibilités, questions..."
            className="min-h-[100px] bg-background/60 text-sm"
          />
        </div>

        <DialogFooter className="gap-3 sm:gap-2 px-0 sm:px-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-accent text-accent hover:bg-accent hover:text-white cursor-pointer w-full sm:w-auto"
            disabled={isSubmitting}
          >
            Annuler
          </Button>

          <Button
            type="submit"
            className="bg-accent hover:bg-[#7d3d9f] text-white cursor-pointer w-full sm:w-auto"
            disabled={!canSubmit || isSubmitting}
          >
            {isSubmitting ? "Envoi..." : "Envoyer"}
          </Button>
        </DialogFooter>
      </form>
    </div>
  </DialogContent>
</Dialog>

  )
}
