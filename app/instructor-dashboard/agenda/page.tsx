"use client"

import { useEffect, useState } from "react"
import { InstructorPageHeader } from "@/components/instructor/InstructorPageHeader"
import { AgendaView } from "@/components/agenda/AgendaView"

export default function InstructorAgendaPage() {
  const [instructorId, setInstructorId] = useState<string>("")

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "null")
      if (u?.id) setInstructorId(u.id)
    } catch {}
  }, [])

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#fafafa]">
      <InstructorPageHeader
        title="Agenda"
        description="Vos sessions de formation"
        breadcrumbs={[{ label: "Agenda" }]}
      />
      {instructorId && <AgendaView readOnly instructorId={instructorId} />}
    </div>
  )
}
