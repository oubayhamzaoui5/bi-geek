import PocketBase from "pocketbase";
import { NextResponse } from "next/server";

const PB_URL = process.env.NEXT_PUBLIC_PB_URL ?? "http://127.0.0.1:8090";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ type: "course" | "bootcamp"; id: string }> }
) {
  try {
    const { type, id } = await params;
    const pb = new PocketBase(PB_URL);

    const record = await pb.collection(type === "bootcamp" ? "bootcamps" : "courses").getOne(id);

    return NextResponse.json({ slug: record.slug ?? record.id });
  } catch (err) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
