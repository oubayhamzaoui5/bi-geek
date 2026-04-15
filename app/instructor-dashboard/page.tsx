"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function InstructorDashboardRoot() {
  const router = useRouter()
  useEffect(() => { router.replace("/instructor-dashboard/overview") }, [router])
  return null
}
