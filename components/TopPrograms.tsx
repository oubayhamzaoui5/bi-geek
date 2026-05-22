"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { ProgramCard } from "@/components/program-card"
import { Code, Layers } from "lucide-react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

type Program = {
  id: string
  title: string
  shortDescription: string
  durationLabel: string
  levelLabel: string
  tags: string[]
  image?: string | null
}

export default function TopPrograms() {
  const [activeTab, setActiveTab] = useState<"courses" | "bootcamps">("courses")
  const [courses, setCourses]     = useState<Program[]>([])
  const [bootcamps, setBootcamps] = useState<Program[]>([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res  = await fetch("/api/featured")
        const contentType = res.headers.get("content-type") ?? ""
        if (!res.ok || !contentType.includes("application/json")) return

        const data = await res.json()
        if (data.ok) {
          const PB = process.env.NEXT_PUBLIC_PB_URL
          setCourses((data.courses || []).map((c: any) => ({
            ...c,
            image: c.coverImage ? `${PB}/api/files/courses/${c.id}/${c.coverImage}` : null,
          })))
          setBootcamps((data.bootcamps || []).map((b: any) => ({
            ...b,
            image: b.coverImage ? `${PB}/api/files/bootcamps/${b.id}/${b.coverImage}` : null,
          })))
        }
      } catch {
        // Keep the public homepage usable even if featured programs are unavailable.
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const programs = activeTab === "courses" ? courses : bootcamps

  return (
    <section className="w-full py-20 md:py-28">
      <div className="container mx-auto px-4 md:px-6">

        {/* Header row */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="h-px w-8 bg-accent" />
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent font-medium">
                Programmes populaires
              </span>
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground leading-tight">
              Nos formations &amp;<br className="hidden md:block" /> bootcamps phares
            </h2>
          </div>

          {/* Tabs */}
          <div className="flex border border-border rounded-none overflow-hidden self-start md:self-auto">
            <button
              onClick={() => setActiveTab("courses")}
              className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold transition-all ${
                activeTab === "courses"
                  ? "bg-accent text-white"
                  : "bg-background text-muted-foreground hover:text-foreground"
              }`}
            >
              <Code size={15} />
              Formations
            </button>
            <button
              onClick={() => setActiveTab("bootcamps")}
              className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold transition-all border-l border-border ${
                activeTab === "bootcamps"
                  ? "bg-accent text-white"
                  : "bg-background text-muted-foreground hover:text-foreground"
              }`}
            >
              <Layers size={15} />
              Bootcamps
            </button>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-72 bg-muted animate-pulse rounded-sm" />
            ))}
          </div>
        )}

        {/* Programs */}
        {!loading && (
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {/* Mobile carousel */}
            <div className="flex md:hidden gap-4 overflow-x-auto snap-x snap-mandatory pb-4 -mx-4 px-4 scrollbar-hide">
              {programs.map((p) => (
                <div key={p.id} className="snap-center min-w-[85%]">
                  <ProgramCard program={p} variant={activeTab === "bootcamps" ? "bootcamp" : "course"} />
                </div>
              ))}
            </div>

            {/* Desktop grid */}
            <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-6">
              {programs.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                >
                  <ProgramCard program={p} variant={activeTab === "bootcamps" ? "bootcamp" : "course"} />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* View all link */}
        {!loading && programs.length > 0 && (
          <div className="mt-10 flex justify-center">
            <Link
              href={activeTab === "courses" ? "/formations" : "/bootcamps"}
              className="flex items-center gap-2 text-sm font-semibold text-accent border border-accent px-6 py-2.5 rounded-none hover:bg-accent hover:text-white transition-all"
            >
              Voir tous les {activeTab === "courses" ? "formations" : "bootcamps"}
              <ArrowRight size={15} />
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}
