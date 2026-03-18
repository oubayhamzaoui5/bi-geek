"use client"

import { useEffect, useState } from "react"
import EnrollmentsCrud from "@/components/admin/EnrollmentsCrud"
import LoadingBI from "@/components/LoadingBI"
import { AdminPageHeader } from "@/components/admin/AdminPageHeader"

type EnrollmentStatus = "pending" | "contacted" | "confirmed"

type AdminEnrollment = {
  id: string
  firstName: string
  lastName: string
  phone: string
  email: string
  birthDate: string
  hasExperience: boolean
  note: string
  courseTitle?: string
  bootcampTitle?: string
  created: string
  status: EnrollmentStatus
}

export default function AdminCoursesPage() {
  const [enrollments, setEnrollments] = useState<AdminEnrollment[]>([])
  const [loading, setLoading] = useState(true)

  // GET
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
      const remaining = Math.max(500 - elapsed, 0)

      setTimeout(() => {
        setLoading(false)
      }, remaining)
    }
  }

  fetchEnrollments()
}, [])


  // PATCH
  const updateStatus = async (id: string, status: EnrollmentStatus) => {
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

  // DELETE
  const deleteEnrollment = async (id: string) => {
    const res = await fetch(`/api/admin/enrollments/${id}`, {
      method: "DELETE",
    })

    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error)
    }
  }

 if (loading) {
  return <LoadingBI />
}

  return (
    <>
      <AdminPageHeader
        title="Inscriptions"
        description="Suivre et gérer les inscriptions aux formations"
        breadcrumbs={[{ label: "Inscriptions" }]}
      />
      <EnrollmentsCrud
        initialEnrollments={enrollments}
        onUpdateStatus={updateStatus}
        onDelete={deleteEnrollment}
      />
    </>
  )
}
