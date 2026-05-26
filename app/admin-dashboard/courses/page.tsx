"use client"

import { useEffect, useState } from "react"
import CoursesCrud from "@/components/admin/CoursesCrud"
import LoadingBI from "@/components/LoadingBI"

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // ---------------- GET ----------------
  useEffect(() => {
    const fetchCourses = async () => {
      const start = Date.now()

      try {
        const migrateRes = await fetch("/api/admin/migrate", { method: "POST" })
        if (!migrateRes.ok) {
          const migrateData = await migrateRes.json().catch(() => ({}))
          console.error("Migration failed:", migrateData?.error)
        }

        const res = await fetch("/api/admin/courses")
        const data = await res.json()

        if (!res.ok) throw new Error(data.error)
        setCourses(data.courses)
      } catch (err) {
        console.error(err)
      } finally {
        const elapsed = Date.now() - start
        const remaining = Math.max(500 - elapsed, 0)
        setTimeout(() => setLoading(false), remaining)
      }
    }

    fetchCourses()
  }, [])

  // ---------------- POST / UPDATE (FormData) ----------------
  async function handleSave(course: any) {
    const formData = new FormData()

    if (course.id) formData.append("id", course.id)
    formData.append("title", course.title)
    formData.append("shortDescription", course.shortDescription)
    formData.append("longDescription", course.longDescription || course.shortDescription)
    formData.append("durationLabel", course.durationLabel)
    formData.append("prerequis", course.prerequis)
    formData.append("certificate", String(course.certificate ?? true))
    formData.append("rating", String(course.rating ?? 4.8))
    formData.append("reviewsCount", String(course.reviewsCount ?? 0))

    const certificationsPayload = (course.certifications ?? []).map((cert: any, index: number) => {
      if (cert.imageFile instanceof File) {
        formData.append(`certificationImage_${index}`, cert.imageFile)
      }
      return {
        id: cert.id,
        title: cert.title,
        issuer: cert.issuer,
        description: cert.description,
        image: cert.image,
      }
    })

    formData.append("certifications", JSON.stringify(certificationsPayload))
    formData.append("whatYouWillLearn", JSON.stringify(course.whatYouWillLearn ?? []))
    formData.append("tags", JSON.stringify(course.tags ?? []))

    const modulesPayload = (course.modules ?? []).map((m: any) => ({
      id: m.id,
      title: m.title,
      durationLabel: m.durationLabel,
      order: m.order,
      locked: !!m.locked,
      lessons: (m.lessons ?? []).map((l: any) => ({
        id: l.id,
        title: l.title,
        durationLabel: l.durationLabel,
        order: l.order,
        locked: !!l.locked,
      })),
    }))

    if (course.coverImage instanceof File) {
      formData.append("coverImage", course.coverImage)
    }
    formData.set("modules", JSON.stringify(modulesPayload))

    const res = await fetch("/api/admin/courses", { method: "POST", body: formData })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error)

    const updatedCourse = {
      ...data.course,
      modules: data.course.modules ?? course.modules ?? [],
    }

    setCourses(prev =>
      prev.some(c => c.id === updatedCourse.id)
        ? prev.map(c => (c.id === updatedCourse.id ? updatedCourse : c))
        : [...prev, updatedCourse],
    )

    return updatedCourse
  }

  // ---------------- ARCHIVE (soft) ----------------
  async function handleDelete(id: string) {
    const res = await fetch(`/api/admin/courses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "archive" }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data?.error || "Erreur lors de l'archivage")
    setCourses(prev => prev.filter(c => c.id !== id))
  }

  // ---------------- VIEW ----------------
  function handleView(course: any) {
    const slug = course.slug
    if (!slug) return
    window.open(`/formation/${encodeURIComponent(slug)}`, "_blank")
  }

  if (loading) {
    return <LoadingBI />
  }

  return (
    <CoursesCrud
      initialCourses={courses}
      onSave={handleSave}
      onDelete={handleDelete}
      onView={handleView}
    />
  )
}
