import type { RecordModel } from "pocketbase"
import { isLinkedInUrl, type InstructorProfile } from "@/lib/instructor-profile"
import { getAdminPb } from "@/lib/server-auth"

export const MIN_PUBLIC_INSTRUCTORS = 2

const publicInstructorFilter = 'role = "instructor" && showOnGuestPages = true'

type InstructorRecord = RecordModel & InstructorProfile & {
  name?: string
  surname?: string
  avatar?: string
}

export async function hasPublicInstructorDirectory() {
  try {
    const pb = await getAdminPb()
    const { items } = await pb.collection("users").getList(1, MIN_PUBLIC_INSTRUCTORS, {
      filter: publicInstructorFilter,
      fields: "id",
      skipTotal: true,
      cache: "no-store",
    })
    return items.length >= MIN_PUBLIC_INSTRUCTORS
  } catch {
    return false
  }
}

export async function getPublicInstructors() {
  try {
    const pb = await getAdminPb()
    const users = await pb.collection("users").getFullList<InstructorRecord>({
      filter: publicInstructorFilter,
      sort: "surname,name,id",
      fields: "id,name,surname,avatar,instructorTitle,instructorSpecialty,instructorDescription,instructorLinkedIn",
      cache: "no-store",
    })

    return users.map((user) => ({
      id: user.id,
      name: [user.name, user.surname].filter(Boolean).join(" ").trim() || "Formateur BI Geek",
      avatar: user.avatar ? `/api/files/users/${encodeURIComponent(user.id)}/${encodeURIComponent(user.avatar)}` : null,
      title: user.instructorTitle,
      specialty: user.instructorSpecialty,
      description: user.instructorDescription,
      linkedIn: user.instructorLinkedIn && isLinkedInUrl(user.instructorLinkedIn) ? user.instructorLinkedIn : null,
    }))
  } catch {
    return []
  }
}
