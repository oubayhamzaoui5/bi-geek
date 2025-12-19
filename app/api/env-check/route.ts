import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    POCKETBASE_URL: !!process.env.POCKETBASE_URL,
    POCKETBASE_ADMIN_EMAIL: !!process.env.POCKETBASE_ADMIN_EMAIL,
    POCKETBASE_ADMIN_PASSWORD: !!process.env.POCKETBASE_ADMIN_PASSWORD,
    nodeEnv: process.env.NODE_ENV,
  })
}
