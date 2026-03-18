"use client"

import { useEffect, useState } from "react"
import CoursesCrud from "@/components/admin/CoursesCrud"
import LoadingBI from "@/components/LoadingBI"
import { AdminPageHeader } from "@/components/admin/AdminPageHeader"

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // ---------------- GET ----------------
  useEffect(() => {
    const fetchCourses = async () => {
      const start = Date.now()

      try {
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

  // primitive fields
  if (course.id) formData.append("id", course.id)
  formData.append("title", course.title)
  formData.append("shortDescription", course.shortDescription)
  formData.append(
    "longDescription",
    course.longDescription || course.shortDescription,
  )
  formData.append("durationLabel", course.durationLabel)
  formData.append("prerequis", course.prerequis)

  formData.append("certificate", String(course.certificate ?? true))
  formData.append("rating", String(course.rating ?? 4.8))
  formData.append("reviewsCount", String(course.reviewsCount ?? 0))

  // JSON fields
  formData.append(
    "certifications",
    JSON.stringify(course.certifications ?? []),
  )
  formData.append(
    "whatYouWillLearn",
    JSON.stringify(course.whatYouWillLearn ?? []),
  )
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
      attachmentsMeta: l.attachmentsMeta ?? [],
      youtubeLinks: l.youtubeLinks ?? [],
    })),
  }))

  // cover image (File)
  if (course.coverImage instanceof File) {
    formData.append("coverImage", course.coverImage)
  }
  formData.set("modules", JSON.stringify(modulesPayload))

  // lesson attachments (Files)
  for (let mi = 0; mi < (course.modules ?? []).length; mi++) {
    const module = course.modules[mi]
    for (let li = 0; li < (module.lessons ?? []).length; li++) {
      const lesson = module.lessons[li]
      const files = Array.isArray(lesson.attachments)
        ? lesson.attachments.filter((f: any) => f instanceof File)
        : []
      for (const file of files) {
        formData.append(`lessonAttachments-${mi}-${li}`, file)
      }
    }
  }

  const res = await fetch("/api/admin/courses", {
    method: "POST",
    body: formData,
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error)

  // 🔹 MERGE MODULES & LESSONS TO PRESERVE THEM
  const updatedCourse = {
  ...data.course,
  modules: data.course.modules ?? course.modules ?? [],
}


  setCourses(prev =>
    prev.some(c => c.id === updatedCourse.id)
      ? prev.map(c => (c.id === updatedCourse.id ? updatedCourse : c))
      : [...prev, updatedCourse],
  )
}


  // ---------------- DELETE ----------------
  async function handleDelete(id: string) {
    await fetch(`/api/admin/courses/${id}`, { method: "DELETE" })
    setCourses(prev => prev.filter(c => c.id !== id))
  }

  // ---------------- VIEW ----------------
  function handleView(id: string) {
    window.open(`/courses/${id}`, "_blank")
  }

  if (loading) {
    return <LoadingBI />
  }

  return (
    <>
      <AdminPageHeader
        title="Formations"
        description="Gérer les formations de la plateforme"
        breadcrumbs={[{ label: "Formations" }]}
      />
      <CoursesCrud
        initialCourses={courses}
        onSave={handleSave}
        onDelete={handleDelete}
        onView={handleView}
      />
    </>
  )
}
