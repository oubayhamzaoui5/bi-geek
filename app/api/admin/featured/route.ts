import { NextResponse } from "next/server";
import PocketBase from "pocketbase";

const PB_URL = process.env.POCKETBASE_URL!;

type FeaturedItemType = "course" | "bootcamp";

export async function GET() {
  try {
    const pb = new PocketBase(PB_URL);
    pb.autoCancellation(false);

    // 1️⃣ Get all featured items, ordered
    const featuredItems = await pb
      .collection("featured_items")
      .getFullList({ sort: "order" });

    const coursesMap = new Map<string, any>();
    const bootcampsMap = new Map<string, any>();

    // 2️⃣ Preload courses and bootcamps
    const courseIds = featuredItems
      .filter((f) => f.type === "course")
      .map((f) => f.itemId);
    const bootcampIds = featuredItems
      .filter((f) => f.type === "bootcamp")
      .map((f) => f.itemId);

    // Fetch courses in bulk
    for (const id of courseIds) {
      try {
        const course = await pb.collection("courses").getOne(id);
        coursesMap.set(id, course);
      } catch {
        // skip missing
      }
    }

    // Fetch bootcamps in bulk
    for (const id of bootcampIds) {
      try {
        const bootcamp = await pb.collection("bootcamps").getOne(id);
        bootcampsMap.set(id, bootcamp);
      } catch {
        // skip missing
      }
    }

    // 3️⃣ Combine featured items with full details
    const fullFeatured = featuredItems.map((f) => {
      const details =
        f.type === "course" ? coursesMap.get(f.itemId) : bootcampsMap.get(f.itemId);

      return {
        id: f.id,
        itemId: f.itemId,
        type: f.type as FeaturedItemType,
        order: f.order,
        title: details?.title || "N/A",
        shortDescription: details?.shortDescription || "",
        durationLabel: details?.durationLabel || "",
        levelLabel: details?.levelLabel || f.type === "bootcamp" ? "Bootcamp" : "Tous niveaux",
        tags: details?.tags || [],
        image: details?.coverImage
          ? `${PB_URL}/api/files/${f.type === "course" ? "courses" : "bootcamps"}/${details.id}/${details.coverImage}`
          : null,
        rating: details?.rating || 0,
        isPublished: details?.isPublished ?? true,
      };
    });

    return NextResponse.json({
      ok: true,
      featuredItems: fullFeatured,
    });
  } catch (err: any) {
    console.error("ADMIN FEATURED GET ERROR:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { items } = await req.json();

    if (!Array.isArray(items)) {
      return NextResponse.json({ ok: false, error: "Items must be an array" }, { status: 400 });
    }

    const pb = new PocketBase(PB_URL);
    pb.autoCancellation(false);

    // Remove old featured items
    const oldItems = await pb.collection("featured_items").getFullList();
    for (const item of oldItems) {
      await pb.collection("featured_items").delete(item.id);
    }

    // Add new featured items
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      await pb.collection("featured_items").create({
        type: item.type,
        itemId: item.itemId, // ✅ must use itemId, not id
        order: i + 1, // keep 1-based order
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("ADMIN FEATURED POST ERROR:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}
