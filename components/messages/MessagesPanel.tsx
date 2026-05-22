"use client"

import { useEffect, useRef, useState } from "react"
import { FileText, GraduationCap, Image as ImageIcon, MessageSquare, Paperclip, Send, X, Users } from "lucide-react"

export type MessageGroup = {
  id: string
  title: string
}

export type ChatMessage = {
  id: string
  group: string
  sender: string
  recipient?: string
  content: string
  created: string
  sent_at?: string
  read: boolean
  attachments?: { name: string; url: string; isImage: boolean }[]
}

type MessagesPanelProps<G extends MessageGroup> = {
  groups: G[]
  selectedGroup: G | null
  messages: ChatMessage[]
  unreadByGroup: Record<string, number>
  currentUserId: string
  loadingGroups: boolean
  loadingMessages: boolean
  sending: boolean
  closedOffset?: boolean
  openSignal?: number
  groupSubtitle: (group: G) => string
  headerSubtitle: (group: G) => string
  onSelectGroup: (group: G) => void
  onSend: (content: string, files: File[]) => Promise<void>
}

const COLORS = [
  "#6366f1", "#10b981", "#f59e0b", "#ec4899",
  "#0ea5e9", "#8b5cf6", "#f97316", "#14b8a6",
]

export function hashColor(str: string) {
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  return COLORS[Math.abs(hash) % COLORS.length]
}

export function messageTime(msg: Pick<ChatMessage, "created" | "sent_at">) {
  const value = msg.sent_at || msg.created
  const time = value ? new Date(value).getTime() : NaN
  return Number.isFinite(time) ? time : 0
}

function formatTime(msg: ChatMessage) {
  const time = messageTime(msg)
  if (!time) return ""
  const d = new Date(time)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)
  const hour = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
  if (diffDays === 0) return `Aujourd'hui, ${hour}`
  if (diffDays === 1) return `Hier, ${hour}`
  return `${d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}, ${hour}`
}

function normalizeCount(count: number) {
  if (count > 99) return "99+"
  if (count > 9) return "9+"
  return String(count)
}

export function MessagesPanel<G extends MessageGroup>({
  groups,
  selectedGroup,
  messages,
  unreadByGroup,
  currentUserId,
  loadingGroups,
  loadingMessages,
  sending,
  closedOffset = false,
  openSignal = 0,
  groupSubtitle,
  headerSubtitle,
  onSelectGroup,
  onSend,
}: MessagesPanelProps<G>) {
  const [isOpen, setIsOpen] = useState(false)
  const [message, setMessage] = useState("")
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const scrollAnchorRef = useRef<HTMLDivElement | null>(null)
  const totalUnreadGroups = Object.values(unreadByGroup).filter(count => count > 0).length

  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setIsOpen(false) }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  useEffect(() => {
    if (openSignal > 0) setIsOpen(true)
  }, [openSignal])

  async function handleSend() {
    if ((!message.trim() && selectedFiles.length === 0) || !selectedGroup || sending) return
    const content = message.trim()
    const files = selectedFiles
    setMessage("")
    setSelectedFiles([])
    await onSend(content, files)
  }

  return (
    <div
      className={`
        fixed bottom-0 right-5 sm:right-10 z-50
        rounded-t-xl border border-border border-b-0
        bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/90
        flex flex-col overflow-hidden
        transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
        ${isOpen
          ? "w-[92vw] sm:w-[500px] md:w-[740px] h-[468px] shadow-[0_-8px_40px_rgba(0,0,0,0.14)]"
          : "w-[280px] h-[48px] shadow-[0_-2px_10px_rgba(0,0,0,0.1)]"
        }
      `}
      style={{ transform: closedOffset && !isOpen ? "translateY(58px)" : "translateY(0)" }}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between px-4 w-full h-12 bg-accent text-accent-foreground cursor-pointer shrink-0 hover:bg-accent/90 transition-colors"
        aria-label={isOpen ? "Fermer les messages" : "Ouvrir les messages"}
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          <span className="font-semibold text-sm">Messages</span>
          {totalUnreadGroups > 0 && (
            <span style={{
              minWidth: 18, height: 18, borderRadius: 999, background: "#ef4444",
              color: "#fff", fontSize: 10, fontWeight: 800, display: "inline-flex",
              alignItems: "center", justifyContent: "center", padding: "0 6px",
            }}>
              {normalizeCount(totalUnreadGroups)}
            </span>
          )}
        </div>
        {isOpen && <X className="w-5 h-5" />}
      </button>

      <div className={`flex flex-1 min-h-0 transition-opacity duration-200 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
        <div style={{
          flexShrink: 0,
          width: "fit-content",
          minWidth: 140,
          borderRight: "1px solid rgba(0,0,0,0.07)",
          background: "linear-gradient(180deg, #f8faff 0%, #f2f4fb 100%)",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
          overflowX: "hidden",
        }}>
          <div style={{
            padding: "10px 12px 6px", fontSize: 9, fontWeight: 700,
            color: "rgba(0,0,0,0.3)", letterSpacing: "0.1em",
            textTransform: "uppercase", borderBottom: "1px solid rgba(0,0,0,0.05)",
            flexShrink: 0,
          }}>
            Mes formations
          </div>

          {loadingGroups ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>Chargement...</div>
            </div>
          ) : groups.length === 0 ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }}>
              <div style={{ fontSize: 11, color: "#94a3b8", textAlign: "center" }}>Aucune formation</div>
            </div>
          ) : groups.map(group => {
            const active = selectedGroup?.id === group.id
            const color = hashColor(group.id)
            const unreadCount = unreadByGroup[group.id] || 0

            return (
              <button
                key={group.id}
                onClick={() => onSelectGroup(group)}
                style={{
                  width: "100%", textAlign: "left", padding: "9px 12px 9px 10px",
                  background: active ? `${color}10` : "transparent",
                  borderLeft: active ? `3px solid ${color}` : "3px solid transparent",
                  borderTop: "none", borderRight: "none", borderBottom: "none",
                  cursor: "pointer", display: "flex", alignItems: "center", gap: 9,
                  transition: "background 0.12s", boxSizing: "border-box", whiteSpace: "nowrap",
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,0,0,0.04)" }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = "transparent" }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: `linear-gradient(135deg, ${color}25, ${color}10)`,
                  border: active ? `2px solid ${color}` : `2px solid ${color}35`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxSizing: "border-box",
                }}>
                  <Users size={14} color={color} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{
                    fontSize: 11.5, fontWeight: 700, color: active ? color : "#1e293b",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 132,
                  }}>
                    {group.title}
                  </div>
                  <div style={{
                    fontSize: 9.5, color: "#4f46e5", marginTop: 1, display: "flex",
                    alignItems: "center", gap: 3, whiteSpace: "nowrap", overflow: "hidden",
                    textOverflow: "ellipsis", maxWidth: 132,
                  }}>
                    <GraduationCap size={9} color="#4f46e5" />
                    <span style={{ fontWeight: 700 }}>{groupSubtitle(group)}</span>
                  </div>
                </div>
                {unreadCount > 0 && (
                  <span style={{
                    minWidth: 18, height: 18, borderRadius: 999, background: color,
                    color: "#fff", fontSize: 10, fontWeight: 800, display: "inline-flex",
                    alignItems: "center", justifyContent: "center", padding: "0 6px",
                    marginLeft: "auto", boxShadow: `0 2px 8px ${color}45`,
                  }}>
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, background: "#f9fafb" }}>
          {selectedGroup ? (
            <>
              {(() => {
                const color = hashColor(selectedGroup.id)
                return (
                  <div style={{
                    padding: "8px 12px", background: "rgba(255,255,255,0.9)",
                    backdropFilter: "blur(8px)", borderBottom: "1px solid rgba(0,0,0,0.06)",
                    display: "flex", alignItems: "center", gap: 8, flexShrink: 0,
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                      background: `${color}18`, border: `1.5px solid ${color}35`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Users size={13} color={color} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{
                        fontSize: 11.5, fontWeight: 700, color: "#0f172a",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {selectedGroup.title}
                      </div>
                      <div style={{ fontSize: 9.5, color: "#4f46e5", fontWeight: 700, display: "flex", alignItems: "center", gap: 3 }}>
                        <GraduationCap size={9} color="#4f46e5" />
                        {headerSubtitle(selectedGroup)}
                      </div>
                    </div>
                  </div>
                )
              })()}

              <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
                {loadingMessages ? (
                  <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>Chargement...</div>
                  </div>
                ) : messages.length === 0 ? (
                  <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ textAlign: "center" }}>
                      {(() => {
                        const color = hashColor(selectedGroup.id)
                        return (
                          <>
                            <div style={{
                              width: 44, height: 44, borderRadius: 12,
                              background: `${color}12`, border: `1px solid ${color}25`,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              margin: "0 auto 8px",
                            }}>
                              <MessageSquare size={18} color={color} />
                            </div>
                            <div style={{ fontSize: 11, color: "#94a3b8" }}>Demarrez la discussion</div>
                          </>
                        )
                      })()}
                    </div>
                  </div>
                ) : (
                  messages.map((msg, i) => {
                    const isOwn = msg.sender === currentUserId
                    const color = hashColor(selectedGroup.id)
                    const currentTime = messageTime(msg)
                    const previousTime = i > 0 ? messageTime(messages[i - 1]) : 0
                    const showTime = Boolean(currentTime) && (i === 0 || Math.abs(previousTime - currentTime) > 5 * 60 * 1000)

                    return (
                      <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: isOwn ? "flex-end" : "flex-start" }}>
                        {showTime && (
                          <div style={{
                            alignSelf: "center", fontSize: 9.5, color: "#94a3b8",
                            background: "rgba(255,255,255,0.9)", border: "1px solid rgba(0,0,0,0.06)",
                            borderRadius: 20, padding: "2px 8px", margin: "4px 0",
                          }}>
                            {formatTime(msg)}
                          </div>
                        )}
                        <div style={{
                          maxWidth: "78%", padding: "8px 12px",
                          background: isOwn ? `linear-gradient(135deg, ${color}, ${color}cc)` : "#ffffff",
                          color: isOwn ? "#fff" : "#1e293b",
                          borderRadius: isOwn ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                          fontSize: 12, lineHeight: 1.5,
                          border: isOwn ? "none" : "1px solid rgba(0,0,0,0.07)",
                          boxShadow: isOwn ? `0 3px 10px ${color}35` : "0 1px 4px rgba(0,0,0,0.06)",
                          wordBreak: "break-word",
                        }}>
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div style={{ display: "grid", gap: 6, marginBottom: msg.content ? 6 : 0 }}>
                              {msg.attachments.map(file => (
                                file.isImage ? (
                                  <a key={file.url} href={file.url} target="_blank" rel="noreferrer">
                                    <img src={file.url} alt={file.name} style={{ display: "block", maxWidth: 180, maxHeight: 140, borderRadius: 10, objectFit: "cover" }} />
                                  </a>
                                ) : (
                                  <a key={file.url} href={file.url} target="_blank" rel="noreferrer" style={{ color: isOwn ? "#fff" : color, textDecoration: "none", display: "flex", alignItems: "center", gap: 6, fontWeight: 700 }}>
                                    <FileText size={13} />
                                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</span>
                                  </a>
                                )
                              ))}
                            </div>
                          )}
                          {msg.content}
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={scrollAnchorRef} />
              </div>

              {(() => {
                const color = hashColor(selectedGroup.id)
                const canSend = Boolean(message.trim() || selectedFiles.length > 0)
                return (
                  <div style={{
                    padding: "8px 10px", background: "rgba(255,255,255,0.9)",
                    backdropFilter: "blur(8px)", borderTop: "1px solid rgba(0,0,0,0.06)",
                    display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
                  }}>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*,.pdf,.txt,.doc,.docx,.xls,.xlsx"
                      style={{ display: "none" }}
                      onChange={e => setSelectedFiles(Array.from(e.target.files || []).slice(0, 5))}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      type="button"
                      style={{
                        width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                        background: selectedFiles.length ? `${color}18` : "rgba(0,0,0,0.04)",
                        border: selectedFiles.length ? `1px solid ${color}45` : "1px solid rgba(0,0,0,0.06)",
                        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                      aria-label="Joindre un fichier"
                      title="Joindre un fichier"
                    >
                      {selectedFiles.some(file => file.type.startsWith("image/")) ? <ImageIcon size={14} color={color} /> : <Paperclip size={14} color={color} />}
                    </button>
                    <input
                      type="text"
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      placeholder="Écrire un message…"
                      style={{
                        flex: 1, background: "#f0f3ff", border: "1.5px solid rgba(99,102,241,0.12)",
                        borderRadius: 20, padding: "7px 14px", fontSize: 12, color: "#0f172a",
                        outline: "none", fontFamily: "inherit", minWidth: 0,
                        transition: "border-color 0.15s, background 0.15s",
                      }}
                      onKeyDown={e => e.key === "Enter" && handleSend()}
                      onFocus={e => { e.target.style.borderColor = `${color}60`; e.target.style.background = "#fff" }}
                      onBlur={e => { e.target.style.borderColor = "rgba(99,102,241,0.12)"; e.target.style.background = "#f0f3ff" }}
                    />
                    <button
                      onClick={handleSend}
                      disabled={!canSend || sending}
                      style={{
                        width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                        background: canSend ? `linear-gradient(135deg, ${color}, ${color}bb)` : "rgba(0,0,0,0.06)",
                        border: "none", cursor: canSend ? "pointer" : "not-allowed",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "all 0.15s", boxShadow: canSend ? `0 3px 10px ${color}35` : "none",
                        transform: canSend ? "scale(1)" : "scale(0.9)",
                      }}
                      aria-label="Envoyer"
                    >
                      <Send style={{ width: 13, height: 13 }} color={canSend ? "#fff" : "#94a3b8"} />
                    </button>
                  </div>
                )
              })()}
            </>
          ) : (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{
                  width: 48, height: 48, borderRadius: "50%", background: "rgba(99,102,241,0.08)",
                  border: "1px solid rgba(99,102,241,0.15)", display: "flex",
                  alignItems: "center", justifyContent: "center", margin: "0 auto 10px",
                }}>
                  <MessageSquare style={{ width: 20, height: 20 }} color="#6366f1" />
                </div>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: "#374151", marginBottom: 4 }}>
                  Choisissez une formation
                </div>
                <div style={{ fontSize: 10.5, color: "#94a3b8" }}>
                  Selectionnez un groupe pour demarrer
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
