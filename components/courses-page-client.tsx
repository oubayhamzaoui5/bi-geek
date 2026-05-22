"use client"

import { useState, useEffect } from "react"
import { ProgramCard } from "@/components/program-card"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { useRouter, useSearchParams } from "next/navigation"

type ProgramType = "bootcamp" | "course"

type Program = {
  id: string
  type: ProgramType
  title: string
  shortDescription: string
  durationLabel: string
  levelLabel: string
  tags: string[]
  image?: string | null
  slug?: string
}

function SkeletonCard() {
  return (
    <div className="animate-pulse overflow-hidden rounded-lg border border-zinc-200 bg-white">
      <div className="aspect-[16/10] bg-zinc-100" />
      <div className="p-5 flex flex-col gap-3">
        <div className="h-4 w-2/3 rounded bg-zinc-100" />
        <div className="h-3 w-full rounded bg-zinc-100" />
        <div className="h-3 w-4/5 rounded bg-zinc-100" />
        <div className="mt-3 h-3 w-1/2 rounded bg-zinc-100 border-t border-zinc-100 pt-4" />
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: string }) {
  return (
    <div className="mb-4 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#8b0f82]">
      <span className="h-px w-8 bg-[#8b0f82]" />
      {children}
    </div>
  )
}

export default function CoursesPage() {
  const [programs, setPrograms] = useState<Program[]>([])
  const router = useRouter()

  const searchParams = useSearchParams()
  const [selectedTags, setSelectedTags] = useState<string[]>(() => {
    const c = searchParams.get("category")
    return c ? [c] : []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const c = searchParams.get("category")
    setSelectedTags(c ? [c] : [])
  }, [searchParams])

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const PB_URL = process.env.NEXT_PUBLIC_PB_URL
        const [bootcampsRes, coursesRes] = await Promise.all([
          fetch("/api/bootcamps"),
          fetch("/api/courses"),
        ])

        const [bootcampsData, coursesData] = await Promise.all([
          bootcampsRes.ok ? bootcampsRes.json() : { bootcamps: [] },
          coursesRes.ok ? coursesRes.json() : { courses: [] },
        ])

        const bootcamps: Program[] = (bootcampsData.bootcamps || []).map((b: any) => ({
          id: b.id,
          type: "bootcamp" as ProgramType,
          title: b.title,
          shortDescription: b.shortDescription || "",
          durationLabel: b.durationLabel || "--",
          levelLabel: b.levelLabel || "Tous niveaux",
          tags: b.tags ?? [],
          image: b.coverImage
            ? b.coverImage.startsWith("http")
              ? b.coverImage
              : `${PB_URL}/api/files/bootcamps/${b.id}/${b.coverImage}`
            : null,
          slug: b.slug,
        }))

        const courses: Program[] = (coursesData.courses || []).map((c: any) => ({
          id: c.id,
          type: "course" as ProgramType,
          title: c.title,
          shortDescription: c.shortDescription,
          durationLabel: c.durationLabel,
          levelLabel: c.levelLabel,
          tags: c.tags ?? [],
          image: c.coverImage
            ? c.coverImage.startsWith("http")
              ? c.coverImage
              : `${PB_URL}/api/files/courses/${c.id}/${c.coverImage}`
            : null,
          slug: c.slug,
        }))

        setPrograms([...bootcamps, ...courses])
      } catch (err) {
        console.error("Error fetching programs", err)
      } finally {
        setLoading(false)
      }
    }

    fetchAll()
  }, [])

  const tagMap = new Map<string, string>()
  programs.forEach((p) => {
    p.tags.forEach((rawTag) => {
      const tag = (rawTag ?? "").trim()
      if (!tag) return
      const key = tag.toLowerCase()
      if (!tagMap.has(key)) tagMap.set(key, tag)
    })
  })
  const categories = ["All", ...Array.from(tagMap.values())]

  const filtered =
    selectedTags.length === 0
      ? programs
      : programs.filter((p) =>
          selectedTags.every(s => p.tags.some(t => t.toLowerCase() === s.toLowerCase()))
        )

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.some(t => t.toLowerCase() === tag.toLowerCase())
        ? prev.filter(t => t.toLowerCase() !== tag.toLowerCase())
        : [...prev, tag]
    )
  }

  const removeTag = (tag: string) => {
    setSelectedTags(prev => prev.filter(t => t.toLowerCase() !== tag.toLowerCase()))
  }

  return (
    <>
      <Navbar />

      <main>

        {/* ── Hero ── */}
        <section className="border-b border-zinc-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-14">
            <SectionLabel>Catalogue de formations</SectionLabel>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight text-zinc-950 sm:text-5xl md:text-6xl">
              Maîtrisez les outils<br />
              <span className="text-[#8b0f82]">qui recrutent.</span>
            </h1>
          </div>
        </section>

        {/* ── Filters + Grid ── */}
        <section className="py-8 md:py-10">

          <style>{`
            @keyframes marquee-left  { from { transform: translateX(0) }    to { transform: translateX(-50%) } }
            @keyframes marquee-right { from { transform: translateX(-50%) } to { transform: translateX(0) }    }
            .marquee-left  { animation: marquee-left  90s linear infinite; }
            .marquee-right { animation: marquee-right 65s linear infinite; }
            .marquee-left:hover, .marquee-right:hover { animation-play-state: paused; }
          `}</style>

          <div className="mx-auto max-w-7xl px-4 md:px-6">

          {/* Active filter chips */}
          {selectedTags.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Filtres :</span>
              {selectedTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => removeTag(tag)}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-[#8b0f82] px-3 py-1 text-xs font-semibold text-white transition hover:bg-[#710c6a]"
                >
                  {tag}
                  <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M2 2l8 8M10 2l-8 8"/>
                  </svg>
                </button>
              ))}
              <button onClick={() => setSelectedTags([])} className="cursor-pointer text-xs text-zinc-400 underline transition hover:text-zinc-700">
                Tout effacer
              </button>
            </div>
          )}

          {/* Marquee rows */}
          {loading ? (
            <div className="mb-8 space-y-2">
              {[0,1].map(r => (
                <div key={r} className="flex gap-2 overflow-hidden">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="h-8 w-28 shrink-0 animate-pulse rounded-full bg-zinc-100" />
                  ))}
                </div>
              ))}
            </div>
          ) : (() => {
            const tags = categories.filter(c => c !== "All")
            const mid = Math.ceil(tags.length / 2)
            const row1 = tags.slice(0, mid)
            const row2 = tags.slice(mid)
            const renderTag = (tag: string, key: string) => {
              const active = selectedTags.some(t => t.toLowerCase() === tag.toLowerCase())
              return (
                <button
                  key={key}
                  onClick={() => toggleTag(tag)}
                  className={[
                    "shrink-0 cursor-pointer rounded-full border px-4 py-1.5 text-sm font-medium transition",
                    active
                      ? "border-[#8b0f82] bg-[#8b0f82] text-white"
                      : "border-zinc-200 bg-white text-zinc-700 hover:border-[#8b0f82]/40 hover:text-[#8b0f82]",
                  ].join(" ")}
                >
                  {tag}
                </button>
              )
            }
            return (
              <div className="mb-8 space-y-2.5 overflow-hidden">
                {/* Row 1 — slides left */}
                <div className="flex w-max gap-2.5 marquee-left">
                  {[...row1, ...row1].map((t, i) => renderTag(t, `r1-${i}`))}
                </div>
                {/* Row 2 — slides right */}
                <div className="flex w-max gap-2.5 marquee-right">
                  {[...row2, ...row2].map((t, i) => renderTag(t, `r2-${i}`))}
                </div>
              </div>
            )
          })()}

          </div>{/* end max-w-7xl wrapper */}

          {/* Grid */}
          <div className="mx-auto max-w-7xl px-4 md:px-6">
            {loading ? (
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-lg border border-zinc-200 bg-white p-12 text-center">
                <p className="font-semibold text-zinc-950">Aucune formation trouvée</p>
                <p className="mt-2 text-sm text-zinc-600">Essayez une autre catégorie ou revenez bientôt.</p>
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {filtered.map((p) => (
                  <ProgramCard
                    key={`${p.type}-${p.id}`}
                    program={{
                      id: p.id,
                      title: p.title,
                      shortDescription: p.shortDescription,
                      durationLabel: p.durationLabel,
                      tags: p.type === "bootcamp" ? ["Bootcamp", ...p.tags] : p.tags,
                      image: p.image,
                      slug: p.slug,
                    }}
                    variant={p.type}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

      </main>

      <Footer />
    </>
  )
}
