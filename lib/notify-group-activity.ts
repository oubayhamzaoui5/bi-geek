import PocketBase from "pocketbase"
import { sendNewActivityEmail } from "@/lib/email"
import { sendPushToUsers } from "@/lib/server-push"

export async function notifyGroupStudents(
  pb: PocketBase,
  groupId: string,
  activity: { type: "quiz" | "devoir"; title: string },
) {
  const group = await pb.collection("groups").getOne(groupId, {
    fields: "id,title,students,slug",
  }).catch(() => null)
  if (!group) return

  const studentIds: string[] = Array.isArray(group.students) ? group.students : []
  if (studentIds.length === 0) return

  const users = await pb.collection("users").getFullList({
    filter: studentIds.map((id: string) => `id = "${id}"`).join(" || "),
    fields: "id,email,name,surname",
  }).catch(() => [])

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://bi-geek.net"
  const groupSlug: string = group.slug || groupId
  const groupUrl = `${baseUrl}/student-dashboard/groups/${groupSlug}`

  const typeLabel = activity.type === "quiz" ? "Quiz" : "Devoir"

  for (const user of users as any[]) {
    if (!user.email) continue
    await sendNewActivityEmail({
      to: user.email,
      name: [user.name, user.surname].filter(Boolean).join(" ") || undefined,
      type: activity.type,
      title: activity.title,
      groupTitle: group.title || "",
      url: groupUrl,
    }).catch((err) => console.error("ACTIVITY EMAIL ERROR:", err))
  }

  await sendPushToUsers(pb, studentIds, {
    title: `Nouveau ${typeLabel.toLowerCase()} · ${group.title || ""}`,
    body: activity.title,
    url: `/student-dashboard/groups/${groupSlug}`,
    tag: `activity-${activity.type}-${groupId}-${Date.now()}`,
    requireInteraction: false,
  }).catch((err) => console.error("ACTIVITY PUSH ERROR:", err))
}
