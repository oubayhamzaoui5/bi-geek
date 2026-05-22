"use client"

import DashboardSettings from "@/components/settings/DashboardSettings"

export default function InstructorSettingsPage() {
  return (
    <DashboardSettings
      profileApiPath="/api/instructor/profile"
      passwordApiPath="/api/instructor/change-password"
      roleLabel="Formateur"
      overviewHref="/instructor-dashboard/overview"
    />
  )
}
