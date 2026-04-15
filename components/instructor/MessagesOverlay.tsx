"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { usePathname } from "next/navigation"
import { MessageSquare, X, Send, ChevronLeft, Search, Clock } from "lucide-react"

type Student = {
  id: string
  username: string
  email: string
  avatar: string | null
  groups: { groupId: string; groupTitle: string }[]
}

type Message = {
  id: string
  sender: string
  recipient: string
  content: string
  created: string
  read: boolean
}

const GROUP_COLORS = [
  "#2563EB","#F59E0B","#16A34A","#8B5CF6",
  "#EAB308","#0D9488","#A16207","#4B5563",
]

function hashColor(str: string) {
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  return GROUP_COLORS[Math.abs(hash) % GROUP_COLORS.length]
}

function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "?"
}

function formatMsgTime(created: string) {
  const d = new Date(created)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diffDays === 0) return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
  if (diffDays === 1) return "Hier"
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
}

export function MessagesOverlay() {
  const pathname = usePathname()
  const [instructorId, setInstructorId] = useState<string>("")
  const [open, setOpen] = useState(false)
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [search, setSearch] = useState("")
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [unread, setUnread] = useState(0)
  const messagesEnd = useRef<HTMLDivElement>(null)

  // Hide on messages page
  const isMessagesPage = pathname === "/instructor-dashboard/messages" ||
    pathname.startsWith("/instructor-dashboard/messages")

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "null")
      if (u?.id) setInstructorId(u.id)
    } catch {}
  }, [])

  // Fetch students when overlay opens for first time
  useEffect(() => {
    if (!open || !instructorId || students.length > 0) return
    setLoadingStudents(true)
    fetch(`/api/instructor/students?instructorId=${instructorId}`)
      .then(r => r.json())
      .then(d => { if (d.ok) setStudents(d.students || []) })
      .catch(() => {})
      .finally(() => setLoadingStudents(false))
  }, [open, instructorId, students.length])

  // Fetch conversation when a student is selected
  const fetchMessages = useCallback(async () => {
    if (!instructorId || !selectedStudent) return
    setLoadingMsgs(true)
    fetch(`/api/instructor/messages?instructorId=${instructorId}&studentId=${selectedStudent.id}`)
      .then(r => r.json())
      .then(d => { if (d.ok) setMessages(d.messages || []) })
      .catch(() => {})
      .finally(() => setLoadingMsgs(false))
  }, [instructorId, selectedStudent])

  useEffect(() => { fetchMessages() }, [fetchMessages])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function sendMessage() {
    if (!input.trim() || !selectedStudent || !instructorId || sending) return
    const content = input.trim()
    setInput("")
    setSending(true)
    try {
      const res = await fetch("/api/instructor/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sender: instructorId, recipient: selectedStudent.id, content }),
      })
      const data = await res.json()
      if (data.ok) setMessages(prev => [...prev, data.message])
    } catch {}
    finally { setSending(false) }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const filteredStudents = students.filter(s =>
    s.username.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      {/* Floating button — hidden on messages page */}
      <button
        onClick={() => setOpen(p => !p)}
        style={{
          position: "fixed", bottom: 28, right: 28, zIndex: 200,
          width: 52, height: 52, borderRadius: "50%",
          background: "var(--accent,#6366f1)",
          border: "none", cursor: "pointer",
          display: isMessagesPage ? "none" : "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 20px rgba(99,102,241,0.4)",
          transition: "transform 0.18s ease, box-shadow 0.18s ease",
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.08)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 6px 28px rgba(99,102,241,0.5)" }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 20px rgba(99,102,241,0.4)" }}
        title="Messages"
      >
        {open ? (
          <X size={20} color="#fff" strokeWidth={2.5} />
        ) : (
          <MessageSquare size={20} color="#fff" strokeWidth={2} />
        )}
        {!open && unread > 0 && (
          <div style={{
            position: "absolute", top: 0, right: 0,
            width: 18, height: 18, borderRadius: "50%",
            background: "#ef4444", color: "#fff",
            fontSize: 10, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "2px solid #fff",
          }}>
            {unread > 9 ? "9+" : unread}
          </div>
        )}
      </button>

      {/* Panel */}
      {open && !isMessagesPage && (
        <div style={{
          position: "fixed", bottom: 92, right: 28, zIndex: 199,
          width: 360, height: 520,
          background: "#fff",
          borderRadius: 16,
          border: "1px solid #edf0f7",
          boxShadow: "0 8px 40px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.06)",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}>
          {/* Panel header */}
          <div style={{
            padding: "14px 18px",
            borderBottom: "1px solid #f1f5f9",
            background: "linear-gradient(180deg,#fafbfe 0%,#fff 100%)",
            display: "flex", alignItems: "center", gap: 10,
          }}>
            {selectedStudent ? (
              <>
                <button
                  onClick={() => { setSelectedStudent(null); setMessages([]) }}
                  style={{ padding: 4, borderRadius: 7, border: "none", background: "transparent", cursor: "pointer", color: "#64748b", display: "flex", alignItems: "center" }}
                >
                  <ChevronLeft size={16} strokeWidth={2} />
                </button>
                {selectedStudent.avatar ? (
                  <img src={selectedStudent.avatar} alt={selectedStudent.username}
                    style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }} />
                ) : (
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%",
                    background: `${hashColor(selectedStudent.id)}20`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, fontWeight: 700, color: hashColor(selectedStudent.id),
                  }}>
                    {getInitials(selectedStudent.username)}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {selectedStudent.username}
                  </div>
                  <div style={{ fontSize: 10, color: "#94a3b8" }}>
                    {selectedStudent.groups.map(g => g.groupTitle).join(", ") || selectedStudent.email}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(99,102,241,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <MessageSquare size={13} color="var(--accent,#6366f1)" strokeWidth={2} />
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", flex: 1 }}>Messages</span>
                <a href="/instructor-dashboard/messages" style={{ fontSize: 11, color: "var(--accent,#6366f1)", fontWeight: 600, textDecoration: "none" }}>
                  Voir tout →
                </a>
              </>
            )}
          </div>

          {/* Body */}
          {selectedStudent ? (
            <>
              {/* Messages thread */}
              <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                {loadingMsgs ? (
                  <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#94a3b8" }}>Chargement...</div>
                ) : messages.length === 0 ? (
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    <MessageSquare size={28} color="#e2e8f0" strokeWidth={1.5} />
                    <span style={{ fontSize: 12, color: "#94a3b8" }}>Démarrez la conversation</span>
                  </div>
                ) : (
                  <>
                    {messages.map((msg, i) => {
                      const isOwn = msg.sender === instructorId
                      return (
                        <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: isOwn ? "flex-end" : "flex-start" }}>
                          <div style={{
                            maxWidth: "78%", padding: "8px 12px",
                            background: isOwn ? "var(--accent,#6366f1)" : "#f1f5f9",
                            color: isOwn ? "#fff" : "#0f172a",
                            borderRadius: isOwn ? "14px 14px 3px 14px" : "14px 14px 14px 3px",
                            fontSize: 13, lineHeight: 1.45,
                            wordBreak: "break-word",
                          }}>
                            {msg.content}
                          </div>
                          {(i === messages.length - 1 || msg.sender !== messages[i+1]?.sender) && (
                            <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 3, display: "flex", alignItems: "center", gap: 3 }}>
                              <Clock size={8} />
                              {formatMsgTime(msg.created)}
                            </div>
                          )}
                        </div>
                      )
                    })}
                    <div ref={messagesEnd} />
                  </>
                )}
              </div>

              {/* Input */}
              <div style={{ padding: "10px 14px", borderTop: "1px solid #f1f5f9", display: "flex", gap: 8, alignItems: "flex-end" }}>
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Message..."
                  rows={1}
                  style={{
                    flex: 1, padding: "8px 12px",
                    background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 10,
                    fontSize: 13, color: "#0f172a", outline: "none",
                    fontFamily: "inherit", resize: "none",
                    maxHeight: 80, overflowY: "auto", lineHeight: 1.4,
                  }}
                  onFocus={e => { e.target.style.borderColor = "#6366f1"; e.target.style.background = "#fff" }}
                  onBlur={e => { e.target.style.borderColor = "#e2e8f0"; e.target.style.background = "#f8fafc" }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || sending}
                  style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: input.trim() ? "var(--accent,#6366f1)" : "#e2e8f0",
                    border: "none", cursor: input.trim() ? "pointer" : "not-allowed",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "background 0.15s",
                  }}
                >
                  <Send size={14} color={input.trim() ? "#fff" : "#94a3b8"} />
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Search */}
              <div style={{ padding: "10px 14px", borderBottom: "1px solid #f8fafc" }}>
                <div style={{ position: "relative" }}>
                  <Search size={12} color="#94a3b8" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Rechercher un étudiant..."
                    style={{
                      width: "100%", paddingLeft: 28, paddingRight: 10, paddingTop: 7, paddingBottom: 7,
                      background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 8,
                      fontSize: 12, color: "#0f172a", outline: "none", fontFamily: "inherit",
                      boxSizing: "border-box",
                    }}
                    onFocus={e => { e.target.style.borderColor = "#6366f1"; e.target.style.background = "#fff" }}
                    onBlur={e => { e.target.style.borderColor = "#e2e8f0"; e.target.style.background = "#f8fafc" }}
                  />
                </div>
              </div>

              {/* Student list */}
              <div style={{ flex: 1, overflowY: "auto" }}>
                {loadingStudents ? (
                  <div style={{ padding: "30px 0", textAlign: "center", fontSize: 12, color: "#94a3b8" }}>Chargement...</div>
                ) : filteredStudents.length === 0 ? (
                  <div style={{ padding: "30px 16px", textAlign: "center", fontSize: 12, color: "#94a3b8" }}>
                    {students.length === 0 ? "Aucun étudiant dans vos groupes" : "Aucun résultat"}
                  </div>
                ) : filteredStudents.map(student => {
                  const color = hashColor(student.id)
                  return (
                    <button
                      key={student.id}
                      onClick={() => setSelectedStudent(student)}
                      style={{
                        width: "100%", textAlign: "left",
                        padding: "10px 16px", border: "none",
                        borderBottom: "1px solid #f8fafc",
                        background: "transparent", cursor: "pointer",
                        display: "flex", alignItems: "center", gap: 10,
                        transition: "background 0.1s",
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#f8fafc" }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent" }}
                    >
                      {student.avatar ? (
                        <img src={student.avatar} alt={student.username}
                          style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                      ) : (
                        <div style={{
                          width: 32, height: 32, borderRadius: "50%",
                          background: `${color}20`, color,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 11, fontWeight: 700, flexShrink: 0,
                        }}>
                          {getInitials(student.username)}
                        </div>
                      )}
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {student.username}
                        </div>
                        <div style={{ fontSize: 10, color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {student.groups.map(g => g.groupTitle).join(", ") || student.email}
                        </div>
                      </div>
                      <MessageSquare size={13} color="#cbd5e1" strokeWidth={2} style={{ flexShrink: 0 }} />
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}
