const PB_URL = process.env.POCKETBASE_URL ?? process.env.NEXT_PUBLIC_PB_URL

function encodePathSegment(value: string) {
  return encodeURIComponent(value)
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ collection: string; recordId: string; filename: string }> },
) {
  if (!PB_URL) {
    return new Response("PocketBase URL is not configured.", { status: 500 })
  }

  const { collection, recordId, filename } = await params
  const fileUrl = `${PB_URL}/api/files/${encodePathSegment(collection)}/${encodePathSegment(recordId)}/${encodePathSegment(filename)}`
  const fileRes = await fetch(fileUrl, { cache: "no-store" })

  if (!fileRes.ok || !fileRes.body) {
    return new Response("File not found.", { status: fileRes.status })
  }

  const headers = new Headers()
  const contentType = fileRes.headers.get("content-type")
  const contentLength = fileRes.headers.get("content-length")
  const cacheControl = fileRes.headers.get("cache-control") ?? "public, max-age=86400"

  if (contentType) headers.set("content-type", contentType)
  if (contentLength) headers.set("content-length", contentLength)
  headers.set("cache-control", cacheControl)

  return new Response(fileRes.body, {
    status: fileRes.status,
    headers,
  })
}
