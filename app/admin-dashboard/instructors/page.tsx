"use client"

import { useEffect, useState } from "react"
import InstructorsCrud, {
  AdminInstructor,
} from "@/components/admin/InstructorsCrud"
import LoadingBI from "@/components/LoadingBI"
import { AdminPageHeader } from "@/components/admin/AdminPageHeader"

export default function AdminInstructorsPage() {
  const [instructors, setInstructors] = useState<AdminInstructor[]>([])
  const [loading, setLoading] = useState(true)

  // GET
  useEffect(() => {
    const fetchInstructors = async () => {
      const start = Date.now()

      try {
        const res = await fetch("/api/admin/instructors")
        const data = await res.json()

        if (!res.ok) throw new Error(data.error)
        setInstructors(data.instructors || [])
      } catch (err) {
        console.error(err)
      } finally {
        const elapsed = Date.now() - start
        const remaining = Math.max(500 - elapsed, 0)

        setTimeout(() => {
          setLoading(false)
        }, remaining)
      }
    }

    fetchInstructors()
  }, [])

  // POST / UPDATE (+ avatar)
  const handleSave = async (instructor: AdminInstructor, avatarFile?: File) => {
    const res = await fetch("/api/admin/instructors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(instructor),
    })

    const { instructor: saved } = await res.json()

    if (avatarFile) {
      const fd = new FormData()
      fd.append("id", saved.id)
      fd.append("avatar", avatarFile)

      const avatarRes = await fetch("/api/admin/instructors/avatar", {
        method: "POST",
        body: fd,
      })

      const avatarData = await avatarRes.json()
      saved.avatar = avatarData.avatar
    }

    setInstructors(prev =>
      prev.some(i => i.id === saved.id)
        ? prev.map(i => (i.id === saved.id ? saved : i))
        : [...prev, saved]
    )
  }

  // DELETE
  const handleDelete = async (id: string) => {
    await fetch(`/api/admin/instructors/${id}`, { method: "DELETE" })
    setInstructors(prev => prev.filter(i => i.id !== id))
  }

  if (loading) {
    return <LoadingBI />
  }

  return (
    <>
      <AdminPageHeader
        title="Formateurs"
        description="Gérer le corps professoral"
        breadcrumbs={[{ label: "Formateurs" }]}
      />
      <InstructorsCrud
        initialInstructors={instructors}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </>
  )
}
