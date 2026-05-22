import { NextResponse } from "next/server"
import { isAiEnabled } from "@/lib/ai/config"

export async function GET() {
  return NextResponse.json({ enabled: isAiEnabled() })
}
