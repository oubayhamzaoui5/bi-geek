"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { CourseDetailsSection } from "@/components/student/course-details-section"
import { Footer } from "@/components/footer"
import LoadingBI from "@/components/LoadingBI"
import { MetaPixel } from "@/components/MetaPixel"

export default function CourseDetailsPage() {
  const { id } = useParams()
  const [guestCourse, setGuestCourse] = useState<any>(null)
  const [instructor, setInstructor] = useState<any>(null)
  const [modules, setModules] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return

    const fetchCourse = async () => {
      try {
        const res = await fetch(`/api/courses/${id}`)
        const data = await res.json()

        setGuestCourse(data.guestCourse)
        setInstructor(data.instructorFromPb)
        setModules(data.guestModules)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchCourse()
  }, [id])

  if (loading) return <LoadingBI />
  if (!guestCourse) return <div className="p-6">Course not found</div>

  return (
    <div className="flex h-screen bg-muted/30">
<MetaPixel />

      <main className="flex-1 overflow-auto">
        <Navbar />

        <div className="space-y-6">
          <CourseDetailsSection
            variant="guest"
            context="course"
            courseFromPb={guestCourse}
          />
        </div>

        <Footer />
      </main>
    </div>
  )
}
