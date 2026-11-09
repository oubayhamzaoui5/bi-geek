import { hasPublicInstructorDirectory } from "@/lib/server-public-instructors"

export async function GET() {
  return Response.json({ available: await hasPublicInstructorDirectory() }, {
    headers: { "Cache-Control": "no-store" },
  })
}
