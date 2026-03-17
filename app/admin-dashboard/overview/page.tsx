"use client"

import { useEffect, useState } from "react"
import { BookOpen, Users, Layers, ClipboardList, TrendingUp, Star } from "lucide-react"
import { Header } from "@/components/header"
import Link from "next/link"

/* ---------- Types ---------- */
type Stats = {
  totalCourses: number
  totalBootcamps: number
  totalUsers: number
  totalEnrollments: number
}

/* ---------- Stat Card ---------- */
function StatCard({
  icon: Icon,
  label,
  value,
  href,
  accent = false,
}: {
  icon: React.ElementType
  label: string
  value: number
  href: string
  accent?: boolean
}) {
  return (
    <Link href={href}>
      <div
        className={`rounded-xl border p-5 flex items-center gap-4 transition-all cursor-pointer
          hover:scale-[1.02] hover:shadow-md
          ${accent
            ? "border-accent/30 bg-accent/5 shadow-sm shadow-accent/10"
            : "border-border bg-card/90 backdrop-blur"
          }`}
      >
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0
            ${accent
              ? "bg-accent/15 text-accent"
              : "bg-muted text-muted-foreground"
            }`}
        >
          <Icon size={22} />
        </div>
        <div>
          <p className="text-3xl font-bold text-foreground">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </div>
    </Link>
  )
}

/* ---------- Quick Link Card ---------- */
function QuickLink({
  icon: Icon,
  label,
  description,
  href,
}: {
  icon: React.ElementType
  label: string
  description: string
  href: string
}) {
  return (
    <Link href={href}>
      <div className="rounded-xl border border-border bg-card/90 backdrop-blur p-4
                      hover:border-accent/40 hover:shadow-md hover:scale-[1.01]
                      transition-all cursor-pointer group">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center
                          group-hover:bg-accent/15 transition-colors shrink-0">
            <Icon size={18} className="text-muted-foreground group-hover:text-accent transition-colors" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-sm">{label}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          </div>
        </div>
      </div>
    </Link>
  )
}

/* ---------- Page ---------- */
export default function AdminOverviewPage() {
  const [stats, setStats] = useState<Stats>({
    totalCourses: 0,
    totalBootcamps: 0,
    totalUsers: 0,
    totalEnrollments: 0,
  })
  const [loading, setLoading] = useState(true)
  const [adminName, setAdminName] = useState("Admin")

  useEffect(() => {
    try {
      const raw = localStorage.getItem("user")
      const user = raw ? JSON.parse(raw) : null
      setAdminName(user?.username?.trim() || user?.email?.split("@")?.[0]?.trim() || "Admin")
    } catch {}
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    async function load() {
      try {
        // Fetch counts from existing admin endpoints
        const [coursesRes, usersRes, enrollmentsRes, bootcampsRes] = await Promise.all([
          fetch("/api/admin/courses", { signal: controller.signal }).catch(() => null),
          fetch("/api/admin/users", { signal: controller.signal }).catch(() => null),
          fetch("/api/admin/enrollments", { signal: controller.signal }).catch(() => null),
          fetch("/api/admin/bootcamps", { signal: controller.signal }).catch(() => null),
        ])

        const courses = coursesRes?.ok ? await coursesRes.json() : {}
        const users = usersRes?.ok ? await usersRes.json() : []
        const enrollments = enrollmentsRes?.ok ? await enrollmentsRes.json() : {}
        const bootcamps = bootcampsRes?.ok ? await bootcampsRes.json() : {}

        setStats({
          totalCourses: Array.isArray(courses?.courses) ? courses.courses.length : 0,
          totalBootcamps: Array.isArray(bootcamps?.bootcamps) ? bootcamps.bootcamps.length : 0,
          totalUsers: Array.isArray(users) ? users.length : 0,
          totalEnrollments: Array.isArray(enrollments?.enrollments) ? enrollments.enrollments.length : 0,
        })
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("Admin overview fetch error:", err)
        }
      } finally {
        setLoading(false)
      }
    }

    load()
    return () => controller.abort()
  }, [])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir"

  return (
    <>
      <Header variant="admin" />
      <div className="p-4 md:p-8 space-y-8">
        {/* Welcome */}
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            {greeting},{" "}
            <span className="text-accent font-extrabold">{adminName}</span> 👋
          </h1>
          <p className="text-sm text-muted-foreground">
            Voici un aperçu de votre plateforme.
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={BookOpen}
            label="Formations"
            value={stats.totalCourses}
            href="/admin-dashboard/courses"
            accent
          />
          <StatCard
            icon={Layers}
            label="Bootcamps"
            value={stats.totalBootcamps}
            href="/admin-dashboard/bootcamps"
          />
          <StatCard
            icon={Users}
            label="Utilisateurs"
            value={stats.totalUsers}
            href="/admin-dashboard/users"
            accent
          />
          <StatCard
            icon={ClipboardList}
            label="Inscriptions"
            value={stats.totalEnrollments}
            href="/admin-dashboard/enrollments"
          />
        </div>

        {/* Quick Links */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">Accès rapide</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <QuickLink
              icon={BookOpen}
              label="Gérer les formations"
              description="Ajouter, modifier ou supprimer des cours"
              href="/admin-dashboard/courses"
            />
            <QuickLink
              icon={Layers}
              label="Gérer les bootcamps"
              description="Configurer les programmes intensifs"
              href="/admin-dashboard/bootcamps"
            />
            <QuickLink
              icon={Users}
              label="Gérer les utilisateurs"
              description="Voir et modifier les comptes"
              href="/admin-dashboard/users"
            />
            <QuickLink
              icon={ClipboardList}
              label="Inscriptions"
              description="Suivre les inscriptions aux formations"
              href="/admin-dashboard/enrollments"
            />
            <QuickLink
              icon={Users}
              label="Groupes"
              description="Organiser les groupes d'étudiants"
              href="/admin-dashboard/groups"
            />
            <QuickLink
              icon={Star}
              label="Contenu vedette"
              description="Sélectionner les formations en vedette"
              href="/admin-dashboard/featured"
            />
          </div>
        </div>
      </div>
    </>
  )
}
