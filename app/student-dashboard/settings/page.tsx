"use client"

import DashboardSettings from "@/components/settings/DashboardSettings"

export default function StudentSettingsPage() {
  return (
    <DashboardSettings
      profileApiPath="/api/student/profile"
      passwordApiPath="/api/student/change-password"
      roleLabel="Apprenant"
      overviewHref="/student-dashboard/overview"
    />
  )
}
