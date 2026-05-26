"use client"

import { useEffect, useState } from "react"
import { SidebarProvider } from "@/components/ui/sidebar-context"
import { Sidebar } from "@/components/sidebar"
import { useRouter } from "next/navigation"
import LoadingBI from "@/components/LoadingBI"
import { DashboardLoadingProvider } from "@/components/dashboard-loading-context"

export default function InstructorDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [authorized, setAuthorized] = useState<boolean | null>(() => {
    if (typeof window === "undefined") return null
    try {
      const user = JSON.parse(localStorage.getItem("user") ?? "null")
      return !!user && user.role === "instructor"
    } catch {
      return false
    }
  })

  useEffect(() => {
    const userString = localStorage.getItem("user")
    const user = userString ? JSON.parse(userString) : null

    if (!user) {
      router.push("/login")
    } else if (user.role !== "instructor") {
      router.push("/")
    } else {
      setAuthorized(true)
    }
  }, [router])

  if (authorized === null || !authorized) return <LoadingBI />

  return (
    <DashboardLoadingProvider>
      <SidebarProvider>
        <div className="h-screen bg-[#fafafa]">
          <Sidebar variant="instructor" />
          <main className="dashboard-responsive-main md:ml-[60px] h-screen overflow-auto">{children}</main>
        </div>
      </SidebarProvider>
    </DashboardLoadingProvider>
  )
}
