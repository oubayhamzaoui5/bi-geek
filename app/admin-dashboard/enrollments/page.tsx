"use client"

import { useEffect, useState } from "react"
import EnrollmentsCrud from "@/components/admin/EnrollmentsCrud"
import LoadingBI from "@/components/LoadingBI"

export default function AdminEnrollmentsPage() {
  const [enrollments, setEnrollments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchEnrollments = async () => {
    const res = await fetch("/api/admin/enrollments")
    const data = await res.json()
    if (!res.ok) throw new Error(data.error)
    setEnrollments(data.enrollments)
  }

  useEffect(() => {
    const loadInitialEnrollments = async () => {
      const start = Date.now()
      try {
        await fetchEnrollments()
      } catch (err) {
        console.error(err)
      } finally {
        const elapsed = Date.now() - start
        setTimeout(() => setLoading(false), Math.max(500 - elapsed, 0))
      }
    }
    loadInitialEnrollments()
  }, [])

  useEffect(() => {
    let refreshTimer: ReturnType<typeof setTimeout> | undefined
    const events = new EventSource("/api/admin/enrollments/events", { withCredentials: true })

    const refresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer)
      refreshTimer = setTimeout(() => {
        fetchEnrollments().catch(console.error)
      }, 150)
    }

    events.addEventListener("change", refresh)
    events.onerror = (err) => {
      console.error("Enrollment realtime disconnected:", err)
    }

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer)
      events.close()
    }
  }, [])

  const updateStatus = async (id: string, status: string) => {
    const res = await fetch(`/api/admin/enrollments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error)
    }
  }

  const deleteEnrollment = async (id: string) => {
    const res = await fetch(`/api/admin/enrollments/${id}`, { method: "DELETE" })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error)
    }
  }

  if (loading) return <LoadingBI />

  return (
    <EnrollmentsCrud
      initialEnrollments={enrollments}
      onUpdateStatus={updateStatus}
      onDelete={deleteEnrollment}
    />
  )
}
