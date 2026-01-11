// app/admin/featured/page.tsx
"use client"

import { useState, useEffect } from "react"
import FeaturedSelection from "@/components/admin/FeaturedSelection"
import LoadingBI from "@/components/LoadingBI"

export default function AdminFeaturedPage() {
  const [loading, setLoading] = useState(true)
  const [featuredItems, setFeaturedItems] = useState([])
  const [courses, setCourses] = useState([])
  const [bootcamps, setBootcamps] = useState([])

  useEffect(() => {
    const loadAll = async () => {
      const start = Date.now() // for minimum loading time
      setLoading(true)

      try {
        const [f, c, b] = await Promise.all([
          fetch("/api/admin/featured").then(r => r.json()),
          fetch("/api/admin/courses").then(r => r.json()),
          fetch("/api/admin/bootcamps").then(r => r.json()),
        ])

        console.log("FEATURED:", f)
        console.log("COURSES:", c)
        console.log("BOOTCAMPS:", b)

        setFeaturedItems(f?.featuredItems ?? [])
        setCourses(c?.courses ?? [])
        setBootcamps(b?.bootcamps ?? [])
      } catch (error) {
        console.error("Error loading admin featured data:", error)
      } finally {
        const elapsed = Date.now() - start
        const remaining = Math.max(500 - elapsed, 0) // ensure at least 500ms
        setTimeout(() => setLoading(false), remaining)
      }
    }

    loadAll()
  }, [])

  const handleSave = async (items: any[]) => {
    try {
      const response = await fetch("/api/admin/featured", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to save")
      }

      return true
    } catch (error) {
      console.error("Error saving featured items:", error)
      throw error
    }
  }

  if (loading) return <LoadingBI />

  return (
    <div>
      <FeaturedSelection
        initialFeatured={featuredItems}
        courses={courses}
        bootcamps={bootcamps}
        onSaveFeatured={handleSave}
        maxItems={3}
      />
    </div>
  )
}
