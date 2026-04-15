"use client"

import { useEffect, useState } from "react"
import EnrollmentsCrud from "@/components/admin/EnrollmentsCrud"
import LoadingBI from "@/components/LoadingBI"

export default function AdminEnrollmentsPage() {
  const [enrollments, setEnrollments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchEnrollments = async () => {
      const start = Date.now()
      try {
        const res = await fetch("/api/admin/enrollments")
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setEnrollments(data.enrollments)
      } catch (err) {
        console.error(err)
      } finally {
        const elapsed = Date.now() - start
        setTimeout(() => setLoading(false), Math.max(500 - elapsed, 0))
      }
    }
    fetchEnrollments()
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
