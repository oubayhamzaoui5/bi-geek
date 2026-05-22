import { NextResponse } from "next/server"
import PocketBase from "pocketbase"

async function getAdminPb() {
  const { POCKETBASE_URL, POCKETBASE_ADMIN_EMAIL, POCKETBASE_ADMIN_PASSWORD } = process.env
  if (!POCKETBASE_URL || !POCKETBASE_ADMIN_EMAIL || !POCKETBASE_ADMIN_PASSWORD)
    throw new Error("Variables d'environnement PocketBase manquantes.")
  const pb = new PocketBase(POCKETBASE_URL)
  await pb.admins.authWithPassword(POCKETBASE_ADMIN_EMAIL, POCKETBASE_ADMIN_PASSWORD)
  return pb
}

export async function POST() {
  try {
    const pb = await getAdminPb()

    const migrations: string[] = []

    // Get current courses collection schema
    const collection = await pb.collections.getOne("courses")
    const schema: any[] = collection.schema ?? []

    // Add `archived` bool field if missing
    if (!schema.find((f: any) => f.name === "archived")) {
      schema.push({ name: "archived", type: "bool", required: false, options: {} })
      migrations.push("archived")
    }

    if (migrations.length > 0) {
      await pb.collections.update("courses", { schema })
    }

    // Add group resource mode if missing. This lets a group either read the
    // course's default resources or maintain its own copied curriculum.
    const groupsCollection = await pb.collections.getOne("groups")
    const groupSchema: any[] = groupsCollection.schema ?? []
    if (!groupSchema.find((f: any) => f.name === "resourceMode")) {
      groupSchema.push({
        name: "resourceMode",
        type: "select",
        required: false,
        options: { maxSelect: 1, values: ["default", "custom"] },
      })
      await pb.collections.update("groups", { schema: groupSchema })
      migrations.push("groups.resourceMode")
    }

    const courseModulesCollection = await pb.collections.getOne("course_modules")
    const courseModuleSchema: any[] = courseModulesCollection.schema ?? []
    let courseModuleChanged = false
    if (!courseModuleSchema.find((f: any) => f.name === "resourceVideos")) {
      courseModuleSchema.push({ name: "resourceVideos", type: "json", required: false, options: {} })
      migrations.push("course_modules.resourceVideos")
      courseModuleChanged = true
    }
    if (!courseModuleSchema.find((f: any) => f.name === "resourceAttachments")) {
      courseModuleSchema.push({
        name: "resourceAttachments",
        type: "file",
        required: false,
        options: { maxSelect: 99, maxSize: 52428800, mimeTypes: [] },
      })
      migrations.push("course_modules.resourceAttachments")
      courseModuleChanged = true
    }
    if (!courseModuleSchema.find((f: any) => f.name === "resourceAttachmentsMeta")) {
      courseModuleSchema.push({ name: "resourceAttachmentsMeta", type: "json", required: false, options: {} })
      migrations.push("course_modules.resourceAttachmentsMeta")
      courseModuleChanged = true
    }
    if (courseModuleChanged) {
      await pb.collections.update("course_modules", { schema: courseModuleSchema })
    }

    return NextResponse.json({ ok: true, applied: migrations })
  } catch (err: any) {
    console.error("MIGRATE ERROR:", err)
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 })
  }
}
