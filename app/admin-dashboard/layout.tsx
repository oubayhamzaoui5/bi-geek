"use client"

import { useEffect, useState } from "react"
import { SidebarProvider } from "@/components/ui/sidebar-context"
import { Sidebar } from "@/components/sidebar"
import { useRouter } from "next/navigation"

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [authorized, setAuthorized] = useState(false) // track if user is allowed

  useEffect(() => {
    const userString = localStorage.getItem("user")
    const user = userString ? JSON.parse(userString) : null


    if (!user) {
      router.push("/login") // not logged in → send to login
    } else if (user.role !== "admin") {
      router.push("/") // logged in but not admin → send home
    } else {
      setAuthorized(true) // user is admin → allow rendering
    }
  }, [router])

  // Only render dashboard if authorized
  if (!authorized) return null

  return (
    <SidebarProvider>
      <div className="h-screen bg-[#fafafa]">
        <Sidebar variant="admin" />
        <main className="md:ml-[60px] h-screen overflow-auto">{children}</main>
      </div>
    </SidebarProvider>
  )
}
