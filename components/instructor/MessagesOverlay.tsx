"use client"

import { useCallback, useEffect, useState } from "react"
import PocketBase from "pocketbase"
import { ChatMessage, MessagesPanel, messageTime } from "@/components/messages/MessagesPanel"

type GroupInfo = {
  id: string
  title: string
  status: string
  instructorId: string
  students?: { id: string; username: string; email: string; avatar: string | null }[]
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

function studentsLabel(group: GroupInfo) {
  const count = group.students?.length || 0
  return `${count} etudiant${count > 1 ? "s" : ""}`
}

export function MessagesOverlay() {
  const [instructorId, setInstructorId] = useState("")
  const [groups, setGroups] = useState<GroupInfo[]>([])
  const [loadingGroups, setLoadingGroups] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<GroupInfo | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [unreadByGroup, setUnreadByGroup] = useState<Record<string, number>>({})
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "null")
      if (u?.id) setInstructorId(u.id)
    } catch {}
  }, [])

  useEffect(() => {
    if (!instructorId || groups.length > 0) return
    setLoadingGroups(true)
    fetch(`/api/instructor/groups?instructorId=${instructorId}`)
      .then(r => r.json())
      .then(d => {
        if (d.ok) setGroups(d.groups || [])
      })
      .catch(() => {})
      .finally(() => setLoadingGroups(false))
  }, [groups.length, instructorId])

  const markGroupSeen = useCallback((groupId: string) => {
    localStorage.setItem(`messages_seen_instructor_${instructorId}_${groupId}`, String(Date.now()))
    setUnreadByGroup(prev => ({ ...prev, [groupId]: 0 }))
  }, [instructorId])

  const fetchMessages = useCallback(async () => {
    if (!instructorId || !selectedGroup) return
    setLoadingMessages(true)
    try {
      const res = await fetch(`/api/instructor/messages?instructorId=${instructorId}&groupId=${selectedGroup.id}`)
      const data = await res.json()
      if (data.ok) {
        setMessages(data.messages || [])
        markGroupSeen(selectedGroup.id)
      }
    } catch {}
    finally { setLoadingMessages(false) }
  }, [instructorId, markGroupSeen, selectedGroup])

  useEffect(() => { fetchMessages() }, [fetchMessages])

  const refreshUnreadCounts = useCallback(async () => {
    if (!instructorId || groups.length === 0) return
    const entries = await Promise.all(groups.map(async group => {
      try {
        const seenRaw = localStorage.getItem(`messages_seen_instructor_${instructorId}_${group.id}`)
        const seen = Number(seenRaw || "0")
        const res = await fetch(`/api/instructor/messages?instructorId=${instructorId}&groupId=${group.id}&markRead=0`)
        const data = await res.json()
        const count = data.ok
          ? (data.messages || []).filter((m: ChatMessage) => m.sender !== instructorId && (seenRaw ? messageTime(m) > seen : !m.read)).length
          : 0
        return [group.id, count] as const
      } catch {
        return [group.id, 0] as const
      }
    }))
    setUnreadByGroup(Object.fromEntries(entries))
  }, [groups, instructorId])

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
        if (record.sender !== instructorId && record.group !== selectedGroup?.id) {
          setUnreadByGroup(prev => ({ ...prev, [record.group]: (prev[record.group] || 0) + 1 }))
        } else if (record.sender !== instructorId && record.group === selectedGroup?.id) {
          markGroupSeen(record.group)
        }
      })
      .then(unsub => { unsubscribe = unsub })
      .catch(console.warn)

    return () => { unsubscribe?.() }
  }, [groups, instructorId, markGroupSeen, selectedGroup])

  async function handleSend(content: string, files: File[]) {
    if (!selectedGroup || !instructorId || sending) return
    setSending(true)
    try {
      const body = new FormData()
      body.set("sender", instructorId)
      body.set("groupId", selectedGroup.id)
      body.set("content", content)
      files.forEach(file => body.append("attachments", file))
      const res = await fetch("/api/instructor/messages", { method: "POST", body })
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
      currentUserId={instructorId}
      loadingGroups={loadingGroups}
      loadingMessages={loadingMessages}
      sending={sending}
      groupSubtitle={studentsLabel}
      headerSubtitle={studentsLabel}
      onSelectGroup={setSelectedGroup}
      onSend={handleSend}
    />
  )
}
