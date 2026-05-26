"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function AdminPage() {
  const router = useRouter()

  useEffect(() => {
    const userString = localStorage.getItem("user")
    const user = userString ? JSON.parse(userString) : null


    // Check if user exists AND is admin
    if (!user ) {
      router.push("/login") // not logged 
    }
    else if(user.role !== "admin" && user.role !== "admin_agent"){
            router.push("/") //or not admin

    }
    
     else {
      router.push(user.role === "admin" ? "/admin-dashboard/users" : "/admin-dashboard/overview")
    }
  }, [router])

  return null
}
