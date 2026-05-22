"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function StudentDashboardRoot() {
  const router = useRouter()
  useEffect(() => {
    router.replace("/student-dashboard/overview")
  }, [router])
  return null
}
