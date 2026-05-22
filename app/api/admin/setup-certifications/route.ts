import { NextResponse } from "next/server"
import PocketBase from "pocketbase"

async function getAdminPb() {
  const PB_URL = process.env.POCKETBASE_URL
  const ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL
  const ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD
  if (!PB_URL || !ADMIN_EMAIL || !ADMIN_PASSWORD) throw new Error("Missing PocketBase env vars")
  const pb = new PocketBase(PB_URL)
  await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD)
  return { pb, PB_URL }
}

export async function POST() {
  try {
    const { pb, PB_URL } = await getAdminPb()
    const token = pb.authStore.token
    const headers = { "Content-Type": "application/json", Authorization: token }

    const results: string[] = []

    // 1. Create certifications collection
    try {
      await fetch(`${PB_URL}/api/collections`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: "certifications",
          type: "base",
          schema: [
            { name: "title",  type: "text",  required: true, options: { min: 1 } },
            { name: "issuer", type: "text",  required: false },
            { name: "image",  type: "file",  required: false, options: { maxSelect: 1, mimeTypes: ["image/jpeg","image/png","image/webp","image/gif"] } },
          ],
        }),
      }).then(async (r) => {
        if (!r.ok) {
          const err = await r.json()
          // 400 with "already exists" is fine
          if (err?.data?.name?.code === "validation_not_unique") {
            results.push("certifications collection already exists — skipped")
          } else {
            results.push(`certifications collection error: ${JSON.stringify(err)}`)
          }
        } else {
          results.push("certifications collection created")
        }
      })
    } catch (e: any) {
      results.push(`certifications collection exception: ${e.message}`)
    }

    // 2. Add certifications relation to courses
    for (const collectionName of ["courses", "bootcamps"]) {
      try {
        // Fetch current collection schema
        const colRes = await fetch(`${PB_URL}/api/collections/${collectionName}`, { headers })
        const col = await colRes.json()

        const alreadyHas = (col.schema ?? []).some((f: any) => f.name === "certificationItems")
        if (alreadyHas) {
          results.push(`${collectionName}.certificationItems already exists — skipped`)
          continue
        }

        const newSchema = [
          ...(col.schema ?? []),
          {
            name: "certificationItems",
            type: "relation",
            required: false,
            options: {
              collectionId: "_pb_certifications_",
              cascadeDelete: false,
              maxSelect: null,
              displayFields: ["title"],
            },
          },
        ]

        // Resolve certifications collection id first
        const certColRes = await fetch(`${PB_URL}/api/collections/certifications`, { headers })
        const certCol = await certColRes.json()
        newSchema[newSchema.length - 1].options.collectionId = certCol.id

        await fetch(`${PB_URL}/api/collections/${col.id}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify({ schema: newSchema }),
        }).then(async (r) => {
          if (!r.ok) {
            const err = await r.json()
            results.push(`${collectionName} PATCH error: ${JSON.stringify(err)}`)
          } else {
            results.push(`${collectionName}.certificationItems relation added`)
          }
        })
      } catch (e: any) {
        results.push(`${collectionName} exception: ${e.message}`)
      }
    }

    return NextResponse.json({ ok: true, results })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
