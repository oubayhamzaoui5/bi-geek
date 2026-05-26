"use client"

import { useEffect, useState } from "react"
import { InstructorPageHeader } from "@/components/instructor/InstructorPageHeader"
import { AgendaView } from "@/components/agenda/AgendaView"
import LoadingBI from "@/components/LoadingBI"

export default function InstructorAgendaPage() {
  const [instructorId, setInstructorId] = useState<string | null>(null)

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "null")
      setInstructorId(u?.id || "")
    } catch {
      setInstructorId("")
    }
  }, [])

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#fafafa]">
      <InstructorPageHeader
        title="Agenda"
        description="Vos séances de formation"
        breadcrumbs={[{ label: "Agenda" }]}
      />
      {instructorId ? (
        <AgendaView readOnly instructorId={instructorId} />
      ) : (
        <div className="flex-1 min-h-0">
          <LoadingBI fullScreen={false} />
        </div>
      )}
    </div>
  )
}
