"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import PocketBase from "pocketbase"
import { ChatMessage, MessagesPanel, messageTime } from "@/components/messages/MessagesPanel"

interface GroupInfo {
  id: string
  title: string
  status: string
  instructorId: string
  instructor: { id: string; name: string; surname: string } | null
}

function instructorName(inst: GroupInfo["instructor"]) {
  if (!inst) return "Formateur"
  return [inst.name, inst.surname].filter(Boolean).join(" ") || "Formateur"
}

function normalizeRealtimeMessage(record: any): ChatMessage {
  const baseUrl =
    process.env.NEXT_PUBLIC_PB_URL ||
    process.env.NEXT_PUBLIC_POCKETBASE_URL ||
    "http://127.0.0.1:8090"
  const files = Array.isArray(record.attachments) ? record.attachments : record.attachments ? [record.attachments] : []
  return {
    ...record,
    attachments: files.map((name: string) => ({
      name,
      url: `${baseUrl}/api/files/${record.collectionId}/${record.id}/${name}`,
      isImage: /\.(png|jpe?g|webp|gif)$/i.test(name),
    })),
  }
}

export function MessagesTab() {
  const [aiTutorOpen, setAiTutorOpen] = useState(false)
  const [studentId, setStudentId] = useState("")
  const [groups, setGroups] = useState<GroupInfo[]>([])
  const [loadingGroups, setLoadingGroups] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<GroupInfo | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [unreadByGroup, setUnreadByGroup] = useState<Record<string, number>>({})
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [openSignal, setOpenSignal] = useState(0)
  const pendingGroupId = useRef<string | null>(null)

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "null")
      if (u?.id) setStudentId(u.id)
    } catch {}
  }, [])

  useEffect(() => {
    if (!studentId || groups.length > 0) return
    setLoadingGroups(true)
    fetch(`/api/student/groups?studentId=${studentId}`)
      .then(r => r.json())
      .then(d => {
        if (!d.ok) return
        const loaded: GroupInfo[] = (d.groups || [])
          .filter((g: any) => g.instructorId)
          .map((g: any) => ({
            id: g.id,
            title: g.title,
            status: g.status,
            instructorId: g.instructorId,
            instructor: g.instructor || null,
          }))
        setGroups(loaded)
        if (pendingGroupId.current) {
          const found = loaded.find(g => g.id === pendingGroupId.current)
          if (found) setSelectedGroup(found)
          pendingGroupId.current = null
        }
      })
      .catch(console.error)
      .finally(() => setLoadingGroups(false))
  }, [groups.length, studentId])

  useEffect(() => {
    const handler = (e: Event) => {
      const { groupId } = (e as CustomEvent).detail as { groupId: string }
      setOpenSignal(value => value + 1)
      setGroups(prev => {
        const found = prev.find(g => g.id === groupId)
        if (found) {
          setSelectedGroup(found)
          pendingGroupId.current = null
        } else {
          pendingGroupId.current = groupId
        }
        return prev
      })
    }
    window.addEventListener("open-message-group", handler)
    return () => window.removeEventListener("open-message-group", handler)
  }, [])

  useEffect(() => {
    const handler = (e: Event) => {
      const { open } = (e as CustomEvent<{ open?: boolean }>).detail || {}
      setAiTutorOpen(Boolean(open))
    }
    window.addEventListener("pdf-ai-tutor-toggle", handler)
    return () => window.removeEventListener("pdf-ai-tutor-toggle", handler)
  }, [])

  const markGroupSeen = useCallback((groupId: string) => {
    localStorage.setItem(`messages_seen_student_${studentId}_${groupId}`, String(Date.now()))
    setUnreadByGroup(prev => ({ ...prev, [groupId]: 0 }))
  }, [studentId])

  const fetchMessages = useCallback(async () => {
    if (!studentId || !selectedGroup) return
    setLoadingMessages(true)
    try {
      const res = await fetch(`/api/student/messages?studentId=${studentId}&groupId=${selectedGroup.id}`)
      const data = await res.json()
      if (data.ok) {
        setMessages(data.messages || [])
        markGroupSeen(selectedGroup.id)
      }
    } catch {}
    finally { setLoadingMessages(false) }
  }, [markGroupSeen, selectedGroup, studentId])

  useEffect(() => { fetchMessages() }, [fetchMessages])

  const refreshUnreadCounts = useCallback(async () => {
    if (!studentId || groups.length === 0) return
    const entries = await Promise.all(groups.map(async group => {
      try {
        const seenRaw = localStorage.getItem(`messages_seen_student_${studentId}_${group.id}`)
        const seen = Number(seenRaw || "0")
        const res = await fetch(`/api/student/messages?studentId=${studentId}&groupId=${group.id}&markRead=0`)
        const data = await res.json()
        const count = data.ok
          ? (data.messages || []).filter((m: ChatMessage) => m.sender !== studentId && (seenRaw ? messageTime(m) > seen : !m.read)).length
          : 0
        return [group.id, count] as const
      } catch {
        return [group.id, 0] as const
      }
    }))
    setUnreadByGroup(Object.fromEntries(entries))
  }, [groups, studentId])

  useEffect(() => { refreshUnreadCounts() }, [refreshUnreadCounts])

  useEffect(() => {
    if (groups.length === 0) return
    const groupIds = new Set(groups.map(group => group.id))
    const pb = new PocketBase(
      process.env.NEXT_PUBLIC_PB_URL ||
      process.env.NEXT_PUBLIC_POCKETBASE_URL ||
      "http://127.0.0.1:8090"
    )
    let unsubscribe: (() => void) | undefined

    pb.collection("messages")
      .subscribe("*", (event) => {
        const record = normalizeRealtimeMessage(event.record)
        if (!groupIds.has(record.group)) return
        if (record.group === selectedGroup?.id) {
          setMessages(prev => {
            if (event.action === "delete") return prev.filter(m => m.id !== record.id)
            const exists = prev.some(m => m.id === record.id)
            const next = exists ? prev.map(m => m.id === record.id ? record : m) : [...prev, record]
            return next.sort((a, b) => messageTime(a) - messageTime(b))
          })
        }
        if (record.sender !== studentId && record.group !== selectedGroup?.id) {
          setUnreadByGroup(prev => ({ ...prev, [record.group]: (prev[record.group] || 0) + 1 }))
        } else if (record.sender !== studentId && record.group === selectedGroup?.id) {
          markGroupSeen(record.group)
        }
      })
      .then(unsub => { unsubscribe = unsub })
      .catch(console.warn)

    return () => { unsubscribe?.() }
  }, [groups, markGroupSeen, selectedGroup, studentId])

  async function handleSend(content: string, files: File[]) {
    if (!selectedGroup || !studentId || sending) return
    setSending(true)
    try {
      const body = new FormData()
      body.set("sender", studentId)
      body.set("groupId", selectedGroup.id)
      body.set("recipient", selectedGroup.instructorId)
      body.set("content", content)
      files.forEach(file => body.append("attachments", file))
      const res = await fetch("/api/student/messages", { method: "POST", body })
      const data = await res.json()
      if (data.ok) setMessages(prev => prev.some(m => m.id === data.message.id) ? prev : [...prev, data.message])
    } catch {}
    finally { setSending(false) }
  }

  return (
    <MessagesPanel
      groups={groups}
      selectedGroup={selectedGroup}
      messages={messages}
      unreadByGroup={unreadByGroup}
      currentUserId={studentId}
      loadingGroups={loadingGroups}
      loadingMessages={loadingMessages}
      sending={sending}
      closedOffset={aiTutorOpen}
      openSignal={openSignal}
      groupSubtitle={(group) => instructorName(group.instructor)}
      headerSubtitle={(group) => instructorName(group.instructor)}
      onSelectGroup={setSelectedGroup}
      onSend={handleSend}
    />
  )
}
