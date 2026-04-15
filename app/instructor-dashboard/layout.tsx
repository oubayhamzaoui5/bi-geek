"use client"

import { useEffect, useState } from "react"
import { SidebarProvider } from "@/components/ui/sidebar-context"
import { Sidebar } from "@/components/sidebar"
import { MessagesOverlay } from "@/components/instructor/MessagesOverlay"
import { useRouter } from "next/navigation"

export default function InstructorDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [authorized, setAuthorized] = useState(false)

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

  if (!authorized) return null

  return (
    <SidebarProvider>
      <div className="h-screen bg-[#fafafa]">
        <Sidebar variant="instructor" />
        <main className="md:ml-[60px] h-screen overflow-auto">{children}</main>
        <MessagesOverlay />
      </div>
    </SidebarProvider>
  )
}
