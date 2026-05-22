import { NextResponse } from "next/server"
import PocketBase from "pocketbase"

async function getAdminPb() {
  const pb = new PocketBase(process.env.POCKETBASE_URL)
  await pb.admins.authWithPassword(
    process.env.POCKETBASE_ADMIN_EMAIL!,
    process.env.POCKETBASE_ADMIN_PASSWORD!
  )
  return pb
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const instructorId = searchParams.get("instructorId")
    if (!instructorId) return NextResponse.json({ error: "instructorId requis" }, { status: 400 })

    const pb = await getAdminPb()

    // Fetch instructor's groups
    const groups = await pb.collection("groups").getFullList({
      filter: `instructor = "${instructorId}"`,
      expand: "course,bootcamp",
    })

    const groupIds = groups.map((g: any) => g.id)

    // Collect all student IDs across groups
    const studentIdSet = new Set<string>()
    for (const g of groups) {
      const ids: string[] = g.students || []
      ids.forEach(id => studentIdSet.add(id))
    }

    // Today's date range
    const today = new Date()
    const todayYMD = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`

    // This week range
    const weekStart = new Date(today)
    const dow = weekStart.getDay()
    weekStart.setDate(weekStart.getDate() + (dow === 0 ? -6 : 1 - dow))
    weekStart.setHours(0, 0, 0, 0)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)
    const weekStartYMD = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, "0")}-${String(weekStart.getDate()).padStart(2, "0")}`
    const weekEndYMD = `${weekEnd.getFullYear()}-${String(weekEnd.getMonth() + 1).padStart(2, "0")}-${String(weekEnd.getDate()).padStart(2, "0")}`

    let todaySessions = 0
    let weekSessions = 0
    let upcomingSessions: any[] = []

    if (groupIds.length > 0) {
      const groupFilter = groupIds.map(id => `group = "${id}"`).join(" || ")

      const [todayRes, weekRes, upcomingRes] = await Promise.allSettled([
        pb.collection("sessions").getFullList({
          filter: `(${groupFilter}) && date = "${todayYMD}"`,
          sort: "start_time",
          expand: "group",
        }),
        pb.collection("sessions").getFullList({
          filter: `(${groupFilter}) && date >= "${weekStartYMD}" && date <= "${weekEndYMD}"`,
        }),
        pb.collection("sessions").getFullList({
          filter: `(${groupFilter}) && date >= "${todayYMD}"`,
          sort: "date,start_time",
          expand: "group",
        }),
      ])

      todaySessions = todayRes.status === "fulfilled" ? todayRes.value.length : 0
      weekSessions = weekRes.status === "fulfilled" ? weekRes.value.length : 0

      if (upcomingRes.status === "fulfilled") {
        upcomingSessions = upcomingRes.value.slice(0, 5).map((s: any) => ({
          id: s.id,
          groupTitle: s.expand?.group?.title || "",
          date: s.date.slice(0, 10),
          start_time: s.start_time || "",
          duration: s.duration || 120,
          mode: s.mode || "live_presentiel",
          title: s.title || null,
          is_cancelled: s.is_cancelled || false,
          joinUrl: s.joinUrl || null,
        }))
      }
    }

    const activeGroups = groups.filter((g: any) => g.status === "in_progress")
    const totalGroups = groups.length

    return NextResponse.json({
      ok: true,
      stats: {
        totalGroups,
        activeGroups: activeGroups.length,
        totalStudents: studentIdSet.size,
        todaySessions,
        weekSessions,
      },
      upcomingSessions,
      groups: groups.map((g: any) => ({
        id: g.id,
        title: g.title,
        status: g.status,
        studentCount: (g.students || []).length,
      })),
      programs: activeGroups.map((g: any) => {
        const program = g.programType === "bootcamp" ? g.expand?.bootcamp : g.expand?.course
        return {
          id: g.id,
          slug: program?.id || g.id,
          title: g.title,
          shortDescription: program?.shortDescription || "",
          durationLabel: program?.durationLabel || "",
          instructorName: "",
          groupId: g.id,
          tags: [],
          image: program?.coverImage ? `${process.env.POCKETBASE_URL}/api/files/${program.collectionId}/${program.id}/${program.coverImage}` : null,
          completed: false,
          progress: 0,
          variant: g.programType || (g.course ? "course" : "bootcamp"),
        }
      }),
    })
  } catch (err: any) {
    console.error("INSTRUCTOR OVERVIEW GET ERROR:", err)
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 })
  }
}
