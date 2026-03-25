"use client"

import { useEffect, useState } from "react"
import BootcampsCrud from "@/components/admin/BootcampsCrud"
import LoadingBI from "@/components/LoadingBI"

export default function AdminBootcampsPage() {
  const [bootcamps, setBootcamps] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // GET
  useEffect(() => {
    const fetchData = async () => {
      const start = Date.now()

      try {
        const [bootcampsRes, coursesRes] = await Promise.all([
          fetch("/api/admin/bootcamps"),
          fetch("/api/admin/courses"),
        ])

        const bootcampsData = await bootcampsRes.json()
        const coursesData = await coursesRes.json()

        if (!bootcampsRes.ok) throw new Error(bootcampsData.error)
        if (!coursesRes.ok) throw new Error(coursesData.error)

        setBootcamps(bootcampsData.bootcamps)
        setCourses(coursesData.courses)
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

    fetchData()
  }, [])

  // POST / UPDATE
  async function handleSave(bootcamp: any) {
    const formData = new FormData()

    // Primitive fields
    if (bootcamp.id) formData.append("id", bootcamp.id)
    formData.append("title", bootcamp.title)
    formData.append("shortDescription", bootcamp.shortDescription)
    formData.append("longDescription", bootcamp.longDescription || bootcamp.shortDescription)
    formData.append("durationLabel", bootcamp.durationLabel)
    formData.append("prerequis", bootcamp.prerequis)
    
    formData.append("rating", String(bootcamp.rating ?? 4.8))
    formData.append("reviewsCount", String(bootcamp.reviewsCount ?? 0))
    formData.append("isPublished", String(bootcamp.isPublished ?? true))

    // Course IDs
    formData.append("courseIds", JSON.stringify(bootcamp.courseIds ?? []))

    // Cover image
    if (bootcamp.coverImage instanceof File) {
      formData.append("coverImage", bootcamp.coverImage)
    }

    const res = await fetch("/api/admin/bootcamps", {
      method: "POST",
      body: formData,
    })

    const data = await res.json()
    if (!res.ok) throw new Error(data.error)

    setBootcamps(prev =>
      prev.some(b => b.id === data.bootcamp.id)
        ? prev.map(b => (b.id === data.bootcamp.id ? data.bootcamp : b))
        : [...prev, data.bootcamp]
    )
  }

  // DELETE
  async function handleDelete(id: string) {
    await fetch(`/api/admin/bootcamps/${id}`, { method: "DELETE" })
    setBootcamps(prev => prev.filter(b => b.id !== id))
  }

  // VIEW
  function handleView(id: string) {
    window.open(`/bootcamps/${id}`, "_blank")
  }

  if (loading) {
    return <LoadingBI />
  }

  return (
    <>
      <BootcampsCrud
        initialBootcamps={bootcamps}
        initialCourses={courses}
        onSave={handleSave}
        onDelete={handleDelete}
        onView={handleView}
      />
    </>
  )
}