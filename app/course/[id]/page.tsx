"use client" // needed because we will fetch client-side

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { CourseDetailsSection } from "@/components/student/course-details-section"
import { CurriculumSection } from "@/components/student/curriculum-section"
import { Footer } from "@/components/footer"

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

  if (loading) return <div className="p-6">Loading...</div>
  if (!guestCourse) return <div className="p-6">Course not found</div>

  return (
    <div className="flex h-screen bg-muted/30">
      <main className="flex-1 overflow-auto">
        <Navbar />
        <div className="p-6 md:p-8 space-y-6">
          <CourseDetailsSection
            variant="guest"
            context="course"
            courseFromPb={guestCourse}
            instructorFromPb={instructor}
          />
          <CurriculumSection
            variant="guest"
            context="course"
            modulesFromPb={modules}
          />
        </div>
        <Footer />
      </main>
    </div>
  )
}
