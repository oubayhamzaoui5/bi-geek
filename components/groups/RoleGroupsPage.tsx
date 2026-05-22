"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import GroupsCrud from "@/components/admin/GroupsCrud"
import LoadingBI from "@/components/LoadingBI"

type RoleGroupsPageProps = {
  role: "instructor" | "student"
  enableGroupDetails?: boolean
}

type GroupItem = {
  id: string
  title: string
  status: "not_started" | "in_progress" | "completed"
  programType: "course" | "bootcamp"
  courseId?: string | null
  bootcampId?: string | null
  instructorId?: string | null
  instructor?: { id: string; name?: string; surname?: string; avatar?: string | null } | null
  studentIds: string[]
}

type ProgramItem = {
  id: string
  title: string
  shortDescription?: string
  longDescription?: string
  coverImage?: string | null
}

function getUserIdFromStorage() {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "null")
    return (user?.id as string | undefined) ?? ""
  } catch {
    return ""
  }
}

export default function RoleGroupsPage({ role, enableGroupDetails = false }: RoleGroupsPageProps) {
  const router = useRouter()
  const [groups, setGroups] = useState<GroupItem[]>([])
  const [courses, setCourses] = useState<ProgramItem[]>([])
  const [bootcamps, setBootcamps] = useState<ProgramItem[]>([])
  const [sessions, setSessions] = useState<any[]>([])
  const [userId, setUserId] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const id = getUserIdFromStorage()
    if (!id) {
      setLoading(false)
      return
    }
    setUserId(id)
  }, [])

  useEffect(() => {
    if (!userId) return

    const start = Date.now()
    const fetchAll = async () => {
      try {
        const queryKey = role === "instructor" ? "instructorId" : "studentId"
        const res = await fetch(`/api/${role}/groups?${queryKey}=${encodeURIComponent(userId)}`, {
          credentials: "same-origin",
        })
        const data = await res.json()
        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem("user")
          router.replace(`/login?next=/${role}-dashboard/groups`)
          return
        }
        if (!res.ok) throw new Error(data.error || "Erreur lors du chargement")

        setGroups(data.groups || [])
        setCourses(data.courses || [])
        setBootcamps(data.bootcamps || [])
        setSessions(data.sessions || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur lors du chargement")
      } finally {
        const elapsed = Date.now() - start
        setTimeout(() => setLoading(false), Math.max(500 - elapsed, 0))
      }
    }

    fetchAll()
  }, [role, userId])

  if (loading) return <LoadingBI />

  if (error) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#fafafa", padding: 24 }}>
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <p style={{ margin: "0 0 8px", color: "#111827", fontSize: 15, fontWeight: 700 }}>Chargement impossible</p>
          <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <GroupsCrud
      initialGroups={groups}
      initialCourses={courses}
      initialBootcamps={bootcamps}
      initialSessions={sessions}
      readOnly
      onGroupClick={enableGroupDetails ? (g) => router.push(`/${role}-dashboard/groups/${g.id}`) : undefined}
      customTitle="Mes formations"
      customDescription="Retrouvez ici toutes vos formations en cours et passées"
      customBreadcrumbs={[{ label: "Mes formations" }]}
      customSearchPlaceholder="Rechercher une formation…"
      customEmptyText="Aucune formation trouvée"
      customEmptySubtext="Aucune formation ne correspond aux filtres actuels."
      customCountLabel="formation"
      customColumnHeader="Formation"
    />
  )
}
