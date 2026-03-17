/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const stripExt = (name) => String(name || "").replace(/\.[^.]+$/, "")
  const asArray = (v) => (Array.isArray(v) ? v : [])

  const records = app.findAllRecords("course_lessons")
  for (const record of records) {
    const attachments = asArray(record.get("attachments"))
    const existingMeta = asArray(record.get("attachmentsMeta"))
    const existingLinks = asArray(record.get("youtubeLinks"))

    const normalizedMeta = attachments.map((file, idx) => {
      const name = typeof file === "string" ? file : file?.name ?? String(file ?? "")
      const prev = existingMeta[idx] ?? {}
      return {
        name,
        title: prev.title ?? stripExt(prev.name ?? name),
        description: prev.description ?? "",
        order: typeof prev.order === "number" ? prev.order : 0,
      }
    })

    const normalizedLinks = existingLinks.map((link, idx) => ({
      url: link?.url ?? "",
      title: link?.title ?? link?.description ?? `Video ${idx + 1}`,
      description: link?.description ?? "",
      order: typeof link?.order === "number" ? link.order : 0,
    }))

    const resources = [
      ...normalizedMeta.map((m, i) => ({ kind: "attachment", index: i, order: m.order, fallback: i })),
      ...normalizedLinks.map((l, i) => ({ kind: "youtube", index: i, order: l.order, fallback: i + normalizedMeta.length })),
    ]
    const hasAnyOrder = resources.some((r) => r.order > 0)
    const sorted = resources.slice().sort((a, b) => {
      const ao = a.order > 0 ? a.order : (hasAnyOrder ? Number.MAX_SAFE_INTEGER : a.fallback)
      const bo = b.order > 0 ? b.order : (hasAnyOrder ? Number.MAX_SAFE_INTEGER : b.fallback)
      if (ao !== bo) return ao - bo
      return a.fallback - b.fallback
    })

    sorted.forEach((r, idx) => {
      const order = idx + 1
      if (r.kind === "attachment") normalizedMeta[r.index].order = order
      else normalizedLinks[r.index].order = order
    })

    record.set("attachmentsMeta", normalizedMeta)
    record.set("youtubeLinks", normalizedLinks)
    app.save(record)
  }
}, (app) => {
  // No-op rollback: we keep data to avoid destructive changes.
})
