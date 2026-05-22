"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { AgendaView } from "@/components/agenda/AgendaView"

export default function StudentAgendaPage() {
  const [studentId, setStudentId] = useState<string>("")

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "null")
      if (u?.id) setStudentId(u.id)
    } catch {}
  }, [])

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#fafafa]">
      <div className="border-b border-gray-100 bg-white px-6 md:px-8 py-5">
        <nav className="flex items-center gap-1 text-xs text-gray-600 mb-2">
          <Link href="/student-dashboard/overview" className="hover:text-gray-700 transition-colors">
            Accueil
          </Link>
          <span className="flex items-center gap-1">
            <ChevronRight size={11} />
            <span className="text-gray-700 font-medium">Agenda</span>
          </span>
        </nav>
        <h1 className="text-xl font-bold text-gray-900" style={{ fontFamily: "var(--ff-display)" }}>
          Agenda
        </h1>
        <p className="text-sm text-gray-600 mt-0.5">Vos seances de formation</p>
      </div>
      {studentId && <AgendaView readOnly studentId={studentId} />}
    </div>
  )
}
