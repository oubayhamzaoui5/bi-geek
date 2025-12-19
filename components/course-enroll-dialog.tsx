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
      <DialogContent className="sm:max-w-[560px] rounded-2xl border border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground">
            {ctaLabel}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Remplissez ce formulaire pour vous inscrire à : <br />
            <span className="font-semibold text-foreground">{title}</span>
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-foreground">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-foreground">
            ✅ Envoyé avec succès !
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">Prénom *</Label>
              <Input
                id="firstName"
                value={form.firstName}
                onChange={(e) => update("firstName", e.target.value)}
                placeholder="Votre prénom"
                className="bg-background/60"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Nom *</Label>
              <Input
                id="lastName"
                value={form.lastName}
                onChange={(e) => update("lastName", e.target.value)}
                placeholder="Votre nom"
                className="bg-background/60"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone *</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="+216 ..."
                className="bg-background/60"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="birthDate">Date de naissance *</Label>
              <Input
                id="birthDate"
                type="date"
                value={form.birthDate}
                onChange={(e) => update("birthDate", e.target.value)}
                className="bg-background/60"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email (optionnel)</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder="ex: nom@email.com"
              className="bg-background/60"
            />
          </div>

          <div className="space-y-2">
            <Label>Avez-vous une expérience passée dans cette formation ? *</Label>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => update("hasExperience", "yes")}
                className={`w-full rounded-xl border px-4 py-3 text-sm font-medium transition cursor-pointer ${
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
                className={`w-full rounded-xl border px-4 py-3 text-sm font-medium transition cursor-pointer ${
                  form.hasExperience === "no"
                    ? "border-accent bg-accent/10 text-foreground"
                    : "border-border bg-background/50 text-foreground hover:bg-accent/5"
                }`}
              >
                Non
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Note (optionnel)</Label>
            <Textarea
              id="note"
              value={form.note}
              onChange={(e) => update("note", e.target.value)}
              placeholder="Ex: vos objectifs, disponibilités, questions..."
              className="min-h-[110px] bg-background/60"
            />
          </div>

          <DialogFooter className="gap-4 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-accent text-accent hover:bg-accent hover:text-white cursor-pointer"
              disabled={isSubmitting}
            >
              Annuler
            </Button>

            <Button
              type="submit"
              className="bg-accent hover:bg-[#7d3d9f] text-white cursor-pointer"
              disabled={!canSubmit || isSubmitting}
            >
              {isSubmitting ? "Envoi..." : "Envoyer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
