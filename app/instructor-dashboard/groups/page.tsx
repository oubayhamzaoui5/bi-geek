"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import GroupsCrud from "@/components/admin/GroupsCrud"
import LoadingBI from "@/components/LoadingBI"

type InstructorGroup = {
  id: string
  title: string
  status: "not_started" | "in_progress" | "completed"
  programType: "course" | "bootcamp"
  courseId?: string | null
  bootcampId?: string | null
  instructorId?: string | null
  instructor?: { id: string; name?: string; surname?: string } | null
  studentIds: string[]
}

type ProgramItem = {
  id: string
  title: string
  shortDescription?: string
  longDescription?: string
  coverImage?: string | null
}

export default function InstructorGroupsPage() {
  const router = useRouter()
  const [groups, setGroups] = useState<InstructorGroup[]>([])
  const [courses, setCourses] = useState<ProgramItem[]>([])
  const [bootcamps, setBootcamps] = useState<ProgramItem[]>([])
  const [instructorId, setInstructorId] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "null")
      if (user?.id) {
        setInstructorId(user.id)
      } else {
        setLoading(false)
      }
    } catch {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!instructorId) return

    const start = Date.now()
    const fetchAll = async () => {
      try {
        const res = await fetch(`/api/instructor/groups?instructorId=${instructorId}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Erreur lors du chargement")

        setGroups(data.groups || [])
        setCourses(data.courses || [])
        setBootcamps(data.bootcamps || [])
      } catch (err) {
        console.error(err)
      } finally {
        const elapsed = Date.now() - start
        setTimeout(() => setLoading(false), Math.max(500 - elapsed, 0))
      }
    }

    fetchAll()
  }, [instructorId])

  if (loading) return <LoadingBI />

  return (
    <GroupsCrud
      initialGroups={groups}
      initialCourses={courses}
      initialBootcamps={bootcamps}
      readOnly
      onGroupClick={(g) => router.push(`/instructor-dashboard/groups/${g.id}`)}
    />
  )
}
