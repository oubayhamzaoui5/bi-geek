"use client"

import { useEffect, useState } from "react"
import GroupsCrud from "@/components/admin/GroupsCrud"
import LoadingBI from "@/components/LoadingBI"

export default function AdminGroupsPage() {
  const [groups, setGroups] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [bootcamps, setBootcamps] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [instructors, setInstructors] = useState<any[]>([])
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAll = async () => {
      const start = Date.now()
      try {
        await fetch("/api/admin/migrate", { method: "POST" }).catch(() => null)
        const res = await fetch("/api/admin/groups", { cache: "no-store" })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setGroups(data.groups || [])
        setCourses(data.courses || [])
        setBootcamps(data.bootcamps || [])
        setStudents(data.students || [])
        setInstructors(data.instructors || [])
        setSessions(data.sessions || [])
      } catch (err) {
        console.error(err)
      } finally {
        const elapsed = Date.now() - start
        const remaining = Math.max(500 - elapsed, 0)
        setTimeout(() => setLoading(false), remaining)
      }
    }

    fetchAll()
  }, [])

  async function handleSave(group: any) {
    const res = await fetch("/api/admin/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(group),
    })

    const data = await res.json()
    if (!res.ok) throw new Error(data.error)

    const updated = data.group
    setGroups(prev =>
      prev.some(g => g.id === updated.id)
        ? prev.map(g => (g.id === updated.id ? updated : g))
        : [...prev, updated]
    )
    return updated
  }

  async function handleDelete(id: string) {
    await fetch(`/api/admin/groups/${id}`, { method: "DELETE" })
    setGroups(prev => prev.filter(g => g.id !== id))
  }

  if (loading) return <LoadingBI />

  return (
    <>
      <GroupsCrud
        initialGroups={groups}
        initialCourses={courses}
        initialBootcamps={bootcamps}
        initialStudents={students}
        initialInstructors={instructors}
        initialSessions={sessions}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </>
  )
}
