// lib/pb.ts
import PocketBase from "pocketbase"

const PB_URL = process.env.NEXT_PUBLIC_PB_URL || "http://127.0.0.1:8090"

export function getPb() {
  return new PocketBase(PB_URL)
}
