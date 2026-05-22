import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({ error: "Endpoint de setup desactive." }, { status: 404 })
}
