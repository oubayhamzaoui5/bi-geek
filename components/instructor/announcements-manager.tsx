// components/instructor/announcements-manager.tsx
"use client"

import { useState } from "react"
import { Megaphone } from "lucide-react"

export function AnnouncementsManager() {
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [course, setCourse] = useState("")

  // Example course list (replace with real data later)
  const courses = [
    { id: "1", name: "Python pour la Data" },
    { id: "2", name: "SQL & Data Modeling" },
    { id: "3", name: "Visualisation avec React" },
  ]

  return (
    <div className="rounded-xl border border-border bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/80 shadow-md  p-6 h-full ">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Megaphone className="text-accent" /> Annonces
        </h2>
      </div>

      <div className="mt-4 space-y-3">
        {/* Course Selector */}
        <select
          value={course}
          onChange={(e) => setCourse(e.target.value)}
          className="w-full bg-transparent border border-white/10 rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-accent/40"
        >
          <option value="" disabled>
            Sélectionnez un formation
          </option>
          {courses.map((c) => (
            <option
              key={c.id}
              value={c.id}
              className="bg-background text-foreground"
            >
              {c.name}
            </option>
          ))}
        </select>

        {/* Title Input */}
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Titre de l’annonce"
          className="w-full bg-transparent border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent/40"
        />

        {/* Body Textarea */}
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Message..."
          rows={4}
          className="w-full bg-transparent border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent/40 resize-none"
        />

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-1">
          <button className="px-3 py-1.5 rounded-md bg-accent/10 text-accent border border-accent/30 text-sm">
            Publier
          </button>
          <button className="px-3 py-1.5 rounded-md border border-white/10 text-sm text-foreground/90 hover:text-foreground">
            Voir les annonces
          </button>
        </div>
      </div>
    </div>
  )
}
