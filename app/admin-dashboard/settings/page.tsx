"use client"

import DashboardSettings from "@/components/settings/DashboardSettings"

export default function AdminSettingsPage() {
  return (
    <DashboardSettings
      profileApiPath="/api/admin/profile"
      passwordApiPath="/api/admin/change-password"
      roleLabel="Administrateur"
      overviewHref="/admin-dashboard/overview"
    />
  )
}
