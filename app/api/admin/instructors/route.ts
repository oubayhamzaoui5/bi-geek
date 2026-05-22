// app/api/admin/instructors/route.ts
import { NextRequest, NextResponse } from "next/server"
import PocketBase, { RecordModel } from "pocketbase"

/* ---------- PocketBase admin helper ---------- */

async function getAdminPb() {
  const PB_URL = process.env.POCKETBASE_URL
  const ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL
  const ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD

  if (!PB_URL || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error("Variables d'environnement PocketBase manquantes.")
  }

  const pb = new PocketBase(PB_URL)
  await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD)
  return pb
}

/* ---------- Mapper ---------- */

function mapInstructor(pb: PocketBase, rec: RecordModel) {
  const r = rec as any

  let avatar: string | null = null
  if (r.avatar) {
    avatar = typeof r.avatar === "string" && r.avatar.startsWith("http")
      ? r.avatar
      : pb.files.getUrl(rec, r.avatar, { thumb: "100x100" }).toString()
  }

  return {
    id: rec.id,
    firstName: r.firstName ?? "",
    lastName: r.lastName ?? "",
    avatar,
    description: r.description ?? "",
  }
}

/* ---------- GET: list all instructors ---------- */

export async function GET() {
  try {
    const pb = await getAdminPb()

    const records = await pb.collection("instructors").getFullList<RecordModel>({
      sort: "firstName",
    })

    const instructors = records.map((r) => mapInstructor(pb, r))

    // shape expected by your front-end
    return NextResponse.json({ instructors })
  } catch (err: any) {
    console.error(
      "ADMIN INSTRUCTORS GET ERROR:",
      err?.data ? JSON.stringify(err.data, null, 2) : err,
    )
    const msg = err?.data?.message || err?.message || "Erreur serveur"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

/* ---------- POST: create or update instructor ---------- */
/*
Frontend sends JSON:

{
  id?: string        // if present => update, else create
  firstName: string
  lastName: string
  description?: string
}

Response:
{ instructor: { id, firstName, lastName, avatar, description } }
*/

export async function POST(req: NextRequest) {
  try {
    const pb = await getAdminPb()

    const body = await req.json().catch(() => ({}))
    console.log("ADMIN INSTRUCTORS POST body:", body)

    const {
      id,
      firstName,
      lastName,
      description,
    }: {
      id?: string
      firstName?: string
      lastName?: string
      description?: string
    } = body

    // Build data object only with defined fields
    const dataToSave: Record<string, any> = {}

    if (typeof firstName === "string") dataToSave.firstName = firstName
    if (typeof lastName === "string") dataToSave.lastName = lastName
    if (typeof description === "string") {
      dataToSave.description = description
    } else {
      dataToSave.description = ""
    }

    let record: RecordModel

    if (id) {
      // UPDATE
      record = await pb.collection("instructors").update<RecordModel>(id, dataToSave)
    } else {
      // CREATE
      record = await pb.collection("instructors").create<RecordModel>(dataToSave)
    }

    const instructor = mapInstructor(pb, record)

    return NextResponse.json(
      { instructor },
      { status: id ? 200 : 201 },
    )
  } catch (err: any) {
    console.error(
      "ADMIN INSTRUCTORS POST ERROR:",
      err?.data ? JSON.stringify(err.data, null, 2) : err,
    )

    const status = err?.status ?? 500
    const pbMessage = err?.data?.message
    const fieldErrors = err?.data?.data

    const msg =
      pbMessage ||
      err?.message ||
      "Erreur lors de l’enregistrement du formateur."

    return NextResponse.json(
      { error: msg, details: fieldErrors ?? null },
      { status },
    )
  }
}
