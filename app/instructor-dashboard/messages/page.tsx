"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { InstructorPageHeader } from "@/components/instructor/InstructorPageHeader"
import LoadingBI from "@/components/LoadingBI"
import { Search, Send, MessageSquare, GraduationCap, Clock, Users } from "lucide-react"

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
  if (diffDays < 7) return d.toLocaleDateString("fr-FR", { weekday: "short" })
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
}

export default function InstructorMessagesPage() {
  const searchParams = useSearchParams()
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [instructorId, setInstructorId] = useState<string>("")
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [messageInput, setMessageInput] = useState("")
  const [sending, setSending] = useState(false)
  const [search, setSearch] = useState("")
  const [lastMessages, setLastMessages] = useState<Record<string, string>>({})
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "null")
      if (u?.id) setInstructorId(u.id)
    } catch {}
  }, [])

  useEffect(() => {
    if (!instructorId) return
    const start = Date.now()
    fetch(`/api/instructor/students?instructorId=${instructorId}`)
      .then(r => r.json())
      .then(d => {
        if (d.ok) {
          setStudents(d.students || [])
          // Check URL for preselected student
          const preselect = searchParams.get("student")
          if (preselect) {
            const found = (d.students || []).find((s: Student) => s.id === preselect)
            if (found) setSelectedStudent(found)
          }
        }
      })
      .catch(console.error)
      .finally(() => {
        const elapsed = Date.now() - start
        setTimeout(() => setLoading(false), Math.max(500 - elapsed, 0))
      })
  }, [instructorId])

  // Fetch conversation when student is selected
  const fetchMessages = useCallback(async () => {
    if (!instructorId || !selectedStudent) return
    setLoadingMessages(true)
    try {
      const res = await fetch(`/api/instructor/messages?instructorId=${instructorId}&studentId=${selectedStudent.id}`)
      const data = await res.json()
      if (data.ok) setMessages(data.messages || [])
    } catch {}
    finally { setLoadingMessages(false) }
  }, [instructorId, selectedStudent])

  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  // Scroll to bottom when messages load
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  async function sendMessage() {
    if (!messageInput.trim() || !selectedStudent || !instructorId || sending) return
    const content = messageInput.trim()
    setMessageInput("")
    setSending(true)
    try {
      const res = await fetch("/api/instructor/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sender: instructorId, recipient: selectedStudent.id, content }),
      })
      const data = await res.json()
      if (data.ok) {
        setMessages(prev => [...prev, data.message])
        setLastMessages(prev => ({ ...prev, [selectedStudent.id]: content }))
      }
    } catch {}
    finally { setSending(false) }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const filteredStudents = students.filter(s =>
    s.username.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <LoadingBI />

  return (
    <>
      <InstructorPageHeader
        title="Messages"
        description="Communiquez avec vos étudiants"
        breadcrumbs={[{ label: "Messages" }]}
      />

      <div style={{ display: "flex", height: "calc(100vh - 89px)", overflow: "hidden" }}>
        {/* Left: Student list */}
        <div style={{ width: 300, flexShrink: 0, borderRight: "1px solid #f1f5f9", background: "#fff", display: "flex", flexDirection: "column" }}>
          {/* Search */}
          <div style={{ padding: "14px 16px", borderBottom: "1px solid #f1f5f9" }}>
            <div style={{ position: "relative" }}>
              <Search size={13} color="#94a3b8" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher..."
                style={{
                  width: "100%", paddingLeft: 30, paddingRight: 10, paddingTop: 7, paddingBottom: 7,
                  background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 8,
                  fontSize: 12, color: "#0f172a", outline: "none", fontFamily: "inherit",
                  boxSizing: "border-box",
                }}
                onFocus={e => { e.target.style.borderColor = "#6366f1"; e.target.style.background = "#fff" }}
                onBlur={e => { e.target.style.borderColor = "#e2e8f0"; e.target.style.background = "#f8fafc" }}
              />
            </div>
          </div>

          {/* Students */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {filteredStudents.length === 0 ? (
              <div style={{ padding: "40px 16px", textAlign: "center", color: "#94a3b8", fontSize: 12 }}>
                {students.length === 0 ? "Aucun étudiant" : "Aucun résultat"}
              </div>
            ) : filteredStudents.map(student => {
              const isSelected = selectedStudent?.id === student.id
              const color = hashColor(student.id)
              const lastMsg = lastMessages[student.id]
              return (
                <button
                  key={student.id}
                  onClick={() => setSelectedStudent(student)}
                  style={{
                    width: "100%", textAlign: "left", padding: "12px 16px",
                    background: isSelected ? "rgba(99,102,241,0.06)" : "transparent",
                    borderBottom: "1px solid #f8fafc",
                    borderLeft: isSelected ? "3px solid var(--accent,#6366f1)" : "3px solid transparent",
                    cursor: "pointer", border: "none",
                    display: "flex", alignItems: "center", gap: 10,
                    transition: "background 0.12s",
                  }}
                  onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = "#f8fafc" }}
                  onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = "transparent" }}
                >
                  {student.avatar ? (
                    <img src={student.avatar} alt={student.username} style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: `${color}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color, flexShrink: 0 }}>
                      {getInitials(student.username)}
                    </div>
                  )}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: isSelected ? "var(--accent,#6366f1)" : "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {student.username}
                    </div>
                    <div style={{ fontSize: 10, color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1 }}>
                      {lastMsg || student.groups.map(g => g.groupTitle).join(", ") || student.email}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Right: Conversation */}
        {selectedStudent ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#fafbfd", minWidth: 0 }}>
            {/* Conversation header */}
            <div style={{ padding: "14px 20px", background: "#fff", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 12 }}>
              {selectedStudent.avatar ? (
                <img src={selectedStudent.avatar} alt={selectedStudent.username} style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} />
              ) : (
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: `${hashColor(selectedStudent.id)}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: hashColor(selectedStudent.id) }}>
                  {getInitials(selectedStudent.username)}
                </div>
              )}
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{selectedStudent.username}</div>
                <div style={{ fontSize: 11, color: "#94a3b8", display: "flex", alignItems: "center", gap: 4 }}>
                  <Users size={10} />
                  {selectedStudent.groups.map(g => g.groupTitle).join(", ") || selectedStudent.email}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
              {loadingMessages ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1 }}>
                  <div style={{ fontSize: 12, color: "#94a3b8" }}>Chargement...</div>
                </div>
              ) : messages.length === 0 ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, gap: 12 }}>
                  <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(99,102,241,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <MessageSquare size={24} color="var(--accent,#6366f1)" />
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", marginBottom: 4 }}>Démarrez la conversation</div>
                    <div style={{ fontSize: 12, color: "#94a3b8" }}>Envoyez un message à {selectedStudent.username}</div>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((msg, i) => {
                    const isOwn = msg.sender === instructorId
                    const showTime = i === 0 || new Date(messages[i-1].created).getMinutes() !== new Date(msg.created).getMinutes()
                    return (
                      <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: isOwn ? "flex-end" : "flex-start" }}>
                        <div style={{
                          maxWidth: "68%", padding: "9px 13px",
                          background: isOwn ? "var(--accent,#6366f1)" : "#fff",
                          color: isOwn ? "#fff" : "#0f172a",
                          borderRadius: isOwn ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                          fontSize: 13, lineHeight: 1.5,
                          border: isOwn ? "none" : "1px solid #e2e8f0",
                          boxShadow: isOwn ? "0 2px 8px rgba(99,102,241,0.25)" : "0 1px 3px rgba(0,0,0,0.04)",
                          wordBreak: "break-word",
                        }}>
                          {msg.content}
                        </div>
                        {showTime && (
                          <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 4, display: "flex", alignItems: "center", gap: 3 }}>
                            <Clock size={9} />
                            {formatMsgTime(msg.created)}
                          </div>
                        )}
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Message input */}
            <div style={{ padding: "14px 20px", background: "#fff", borderTop: "1px solid #f1f5f9" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
                <textarea
                  ref={inputRef}
                  value={messageInput}
                  onChange={e => setMessageInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Message à ${selectedStudent.username}...`}
                  rows={1}
                  style={{
                    flex: 1, padding: "10px 14px", background: "#f8fafc",
                    border: "1.5px solid #e2e8f0", borderRadius: 12,
                    fontSize: 13, color: "#0f172a", outline: "none",
                    fontFamily: "inherit", resize: "none",
                    maxHeight: 120, overflowY: "auto",
                    lineHeight: 1.5,
                  }}
                  onFocus={e => { e.target.style.borderColor = "#6366f1"; e.target.style.background = "#fff" }}
                  onBlur={e => { e.target.style.borderColor = "#e2e8f0"; e.target.style.background = "#f8fafc" }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!messageInput.trim() || sending}
                  style={{
                    width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                    background: messageInput.trim() ? "var(--accent,#6366f1)" : "#e2e8f0",
                    border: "none", cursor: messageInput.trim() ? "pointer" : "not-allowed",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "background 0.15s, transform 0.1s",
                    transform: messageInput.trim() ? "scale(1)" : "scale(0.95)",
                  }}
                >
                  <Send size={16} color={messageInput.trim() ? "#fff" : "#94a3b8"} />
                </button>
              </div>
              <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 6 }}>
                Entrée pour envoyer · Maj+Entrée pour nouvelle ligne
              </div>
            </div>
          </div>
        ) : (
          /* No student selected */
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, background: "#fafbfd" }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(99,102,241,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <MessageSquare size={32} color="var(--accent,#6366f1)" />
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>Sélectionnez un étudiant</div>
              <div style={{ fontSize: 13, color: "#94a3b8" }}>Choisissez un étudiant dans la liste pour démarrer une conversation</div>
            </div>
            {students.length === 0 && (
              <div style={{ fontSize: 12, color: "#94a3b8", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 16px" }}>
                Aucun étudiant dans vos groupes pour le moment
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
