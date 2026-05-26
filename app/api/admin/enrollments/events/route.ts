import PocketBase from "pocketbase"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type ParsedSseEvent = {
  event: string
  data: string
  id?: string
}

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

function sse(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

function parseSseBlock(block: string): ParsedSseEvent | null {
  let event = "message"
  let data = ""
  let id: string | undefined

  for (const line of block.split(/\r?\n/)) {
    if (line.startsWith("event:")) event = line.slice(6).trim()
    if (line.startsWith("data:")) data += line.slice(5).trim()
    if (line.startsWith("id:")) id = line.slice(3).trim()
  }

  return data || id ? { event, data, id } : null
}

export async function GET(req: Request) {
  const encoder = new TextEncoder()
  const realtimeAbort = new AbortController()
  let heartbeat: ReturnType<typeof setInterval> | undefined

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        try {
          controller.enqueue(encoder.encode(sse(event, data)))
        } catch {
          // Connection already closed.
        }
      }

      try {
        const pb = await getAdminPb()
        const realtimeUrl = `${process.env.POCKETBASE_URL}/api/realtime`

        send("ready", { ok: true })
        heartbeat = setInterval(() => send("ping", { at: Date.now() }), 25000)

        const realtime = await fetch(realtimeUrl, {
          headers: { Authorization: pb.authStore.token },
          signal: realtimeAbort.signal,
          cache: "no-store",
        })

        if (!realtime.ok || !realtime.body) {
          throw new Error(`PocketBase realtime failed: ${realtime.status}`)
        }

        const reader = realtime.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ""
        let subscribed = false

        while (!req.signal.aborted) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const blocks = buffer.split(/\r?\n\r?\n/)
          buffer = blocks.pop() ?? ""

          for (const block of blocks) {
            const event = parseSseBlock(block)
            if (!event) continue

            if (event.event === "PB_CONNECT" && !subscribed) {
              const clientId = event.id || JSON.parse(event.data).clientId
              if (!clientId) throw new Error("PocketBase realtime client id missing.")

              subscribed = true
              const subscription = await fetch(realtimeUrl, {
                method: "POST",
                headers: {
                  Authorization: pb.authStore.token,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  clientId,
                  subscriptions: ["enrollments/*"],
                }),
                cache: "no-store",
              })
              if (!subscription.ok) {
                throw new Error(`PocketBase realtime subscribe failed: ${subscription.status}`)
              }
              continue
            }

            if (event.event !== "enrollments/*") continue

            const data = JSON.parse(event.data)
            send("change", {
              action: data.action,
              id: data.record?.id,
            })
          }
        }
      } catch (err: any) {
        if (req.signal.aborted || err?.name === "AbortError") {
          return
        }
        console.error("ADMIN ENROLLMENTS EVENTS ERROR:", err)
        send("error", {
          error: err?.data?.message || err?.message || "Erreur serveur",
        })
        try {
          controller.close()
        } catch {
          // Connection already closed.
        }
      } finally {
        if (heartbeat) clearInterval(heartbeat)
        realtimeAbort.abort()
      }
    },
    cancel() {
      if (heartbeat) clearInterval(heartbeat)
      realtimeAbort.abort()
    },
  })

  req.signal.addEventListener("abort", () => {
    if (heartbeat) clearInterval(heartbeat)
    realtimeAbort.abort()
  })

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream",
      "X-Accel-Buffering": "no",
    },
  })
}
