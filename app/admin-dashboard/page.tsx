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
    else if(user.role !== "admin"){
            router.push("/") //or not admin

    }
    
     else {
      router.push("/admin-dashboard/courses") // admin → redirect
    }
  }, [router])

  return null
}
