"use client"

import { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { MessageSquare, Send, X } from "lucide-react"
import Image from "next/image"

interface Teacher { id: number; name: string; avatar: string }
const teachers: Teacher[] = [
  { id: 1, name: "Mme Dupont",  avatar: "/instructor.jpg" },
  { id: 2, name: "M. Laurent",  avatar: "/instructor.jpg" },
  { id: 3, name: "Mme Garnier", avatar: "/instructor.jpg" },
]

type ChatMsg = { from: "me" | "teacher"; text: string }

const spring = { type: "spring", stiffness: 420, damping: 34, mass: 0.8 }
const fadeUpIn  = { opacity: 1, scale: 1 }
const fadeUpOut = { opacity: 0, scale: 0.98 }

export function MessagesTab() {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null)
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState<Record<number, ChatMsg[]>>({})
  const panelRef = useRef<HTMLDivElement | null>(null)

  // keep track of pending timeouts to clear on unmount
  const timeoutsRef = useRef<number[]>([])
  // ref to auto-scroll
  const scrollAnchorRef = useRef<HTMLDivElement | null>(null)

  const addMessage = (teacherId: number, msg: ChatMsg) => {
    setMessages(prev => ({
      ...prev,
      [teacherId]: [ ...(prev[teacherId] || []), msg ],
    }))
  }

  const handleSend = () => {
    if (!selectedTeacher || message.trim() === "") return
    const teacherId = selectedTeacher.id
    addMessage(teacherId, { from: "me", text: message })
    setMessage("")

    // --- TEST AUTO-REPLY: instructor says "Bonjour !" after 3s ---
    const tid = window.setTimeout(() => {
      addMessage(teacherId, { from: "teacher", text: "Bonjour !" })
    }, 2000)
    timeoutsRef.current.push(tid)
  }

  // Close on ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setIsOpen(false) }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  // Clear all pending timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((id) => clearTimeout(id))
      timeoutsRef.current = []
    }
  }, [])

  // Auto-scroll to bottom when messages change for the selected teacher
  useEffect(() => {
    if (!selectedTeacher) return
    scrollAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages, selectedTeacher])

  return (
    <>
      <AnimatePresence mode="wait" initial={false}>
        {!isOpen ? (
          <motion.button
            key="fab"
            onClick={() => setIsOpen(true)}
            aria-label="Ouvrir les messages"
            initial={fadeUpOut}
            animate={fadeUpIn}
            exit={fadeUpOut}
            transition={spring}
            className="
              fixed bottom-5 right-5 z-50
              rounded-full bg-accent text-accent-foreground
              shadow-lg border border-border
              w-14 h-14 md:w-16 md:h-16
              flex items-center justify-center
              hover:opacity-90 transition
              will-change-transform
              cursor-pointer
            "
          >
            <MessageSquare className="w-6 h-6 md:w-7 md:h-7" />
          </motion.button>
        ) : (
          <motion.div
            key="panel"
            ref={panelRef}
            initial={fadeUpOut}
            animate={fadeUpIn}
            exit={fadeUpOut}
            transition={spring}
            className="
              fixed bottom-5 right-5 z-40
              w-[92vw] sm:w-[420px] md:w-[620px]
              rounded-xl border border-border
              bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/90
              shadow-2xl overflow-hidden
              will-change-transform
            "
            style={{ maxHeight: "72vh" }}
            role="dialog"
            aria-modal="true"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/80">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-foreground/80" />
                <h4 className="text-sm font-semibold text-foreground">Messages</h4>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Fermer"
                className="p-1 rounded-md hover:bg-muted/60 transition cursor-pointer"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Body */}
            <div className="flex h-[420px]">
              {/* Teachers list */}
              <div className="w-2/5 border-r border-border overflow-y-auto bg-muted/30">
                {teachers.map((t) => {
                  const active = selectedTeacher?.id === t.id
                  return (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTeacher(t)}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/50 transition-colors ${
                        active ? "bg-muted/60" : ""
                      }`}
                    >
                      <Image src={t.avatar} alt={t.name} width={40} height={40} className="rounded-md object-cover" />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-foreground">{t.name}</span>
                        <span className="text-xs text-muted-foreground">Disponible</span>
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Chat area */}
              <div className="flex-1 flex flex-col">
                {selectedTeacher ? (
                  <>
                    {/* Chat header */}
                    <div className="px-4 py-2 border-b border-border bg-card/60">
                      <div className="flex items-center gap-2">
                        <Image src={selectedTeacher.avatar} alt={selectedTeacher.name} width={28} height={28} className="rounded" />
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-foreground">{selectedTeacher.name}</span>
                          <span className="text-xs text-muted-foreground">Discussion</span>
                        </div>
                      </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                      {(messages[selectedTeacher.id] || []).map((msg, i) => (
                        <div key={i} className={`flex ${msg.from === "me" ? "justify-end" : "justify-start"}`}>
                          <div
                            className={`max-w-[75%] p-2 rounded-lg text-sm ${
                              msg.from === "me"
                                ? "bg-accent text-accent-foreground"
                                : "bg-muted/50 text-foreground"
                            }`}
                          >
                            {msg.text}
                          </div>
                        </div>
                      ))}
                      {/* Anchor for auto-scroll */}
                      <div ref={scrollAnchorRef} />
                    </div>

                    {/* Input */}
                    <div className="p-3 border-t border-border bg-card/70 flex items-center gap-2">
                      <input
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Écrire un message..."
                        className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        onKeyDown={(e) => e.key === "Enter" && handleSend()}
                      />
                      <button
                        onClick={handleSend}
                        className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-accent text-accent-foreground hover:opacity-90 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label="Envoyer"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-1 items-center justify-center text-xs text-muted-foreground">
                    Sélectionnez un enseignant pour commencer la discussion
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
