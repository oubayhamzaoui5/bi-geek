"use client"

import { useState, useEffect } from "react"
import { Search } from "lucide-react"
import { ProgramCard } from "@/components/program-card"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { useSearchParams } from "next/navigation"

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

const REAL_FORMATION_TAGS = [
  "Analyse de données",
  "Intelligence Artificielle",
  "Management",
  "Cybersécurité",
  "Programmation",
  "Développement Web",
  "Soft skills",
] as const

const canonicalTagMap = new Map(
  REAL_FORMATION_TAGS.map((tag) => [tag.toLowerCase(), tag]),
)

const categoryAliases = new Map([
  ["data analytics", "Analyse de données"],
  ["business intelligence", "Analyse de données"],
  ["analyse de donnees", "Analyse de données"],
  ["analyse de données", "Analyse de données"],
  ["ai", "Intelligence Artificielle"],
  ["ia", "Intelligence Artificielle"],
  ["cyber security", "Cybersécurité"],
  ["cybersécurité", "Cybersécurité"],
  ["developpement web", "Développement Web"],
  ["développement web", "Développement Web"],
])

function SkeletonCard() {
  return (
    <div className="animate-pulse overflow-hidden rounded-lg border border-zinc-200 bg-white">
      <div className="aspect-[16/10] bg-zinc-100" />
      <div className="flex flex-col gap-3 p-5">
        <div className="h-4 w-2/3 rounded bg-zinc-100" />
        <div className="h-3 w-full rounded bg-zinc-100" />
        <div className="h-3 w-4/5 rounded bg-zinc-100" />
        <div className="mt-3 h-3 w-1/2 rounded border-t border-zinc-100 bg-zinc-100 pt-4" />
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

function normalizeTag(tag: string) {
  return tag.trim().toLowerCase()
}

function toCanonicalFilterTag(tag: string | null) {
  if (!tag) return null

  const key = normalizeTag(tag)
  return canonicalTagMap.get(key) ?? categoryAliases.get(key) ?? null
}

function cleanTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return []

  const seen = new Set<string>()
  return tags.reduce<string[]>((acc, rawTag) => {
    if (typeof rawTag !== "string") return acc
    const key = normalizeTag(rawTag)
    if (!key || seen.has(key)) return acc

    seen.add(key)
    acc.push(canonicalTagMap.get(key) ?? rawTag.trim())
    return acc
  }, [])
}

export default function CoursesPage() {
  const [programs, setPrograms] = useState<Program[]>([])
  const searchParams = useSearchParams()
  const [selectedTags, setSelectedTags] = useState<string[]>(() => {
    const category = toCanonicalFilterTag(searchParams.get("category"))
    return category ? [category] : []
  })
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const category = toCanonicalFilterTag(searchParams.get("category"))
    setSelectedTags(category ? [category] : [])
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
          tags: cleanTags(b.tags),
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
          tags: cleanTags(c.tags),
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

  const hasTag = (program: Program, tag: string) =>
    program.tags.some((t) => normalizeTag(t) === normalizeTag(tag))

  const tagOptions = Array.from(
    programs.reduce<Map<string, string>>((tags, program) => {
      program.tags.forEach((tag) => {
        const key = normalizeTag(tag)
        if (key && !tags.has(key)) tags.set(key, tag)
      })
      return tags
    }, new Map()),
  )
    .map(([, tag]) => tag)
    .sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" }))

  const filtered =
    selectedTags.length === 0 && !searchTerm.trim()
      ? programs
      : programs.filter((p) => {
          const matchesTags = selectedTags.length === 0 || selectedTags.every((s) => hasTag(p, s))
          const query = searchTerm.trim().toLowerCase()
          const matchesSearch =
            !query ||
            [p.title, p.shortDescription, p.durationLabel, ...p.tags]
              .filter(Boolean)
              .some((value) => value.toLowerCase().includes(query))

          return matchesTags && matchesSearch
        })

  return (
    <>
      <Navbar />

      <main>
        <section className="border-b border-zinc-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-14">
            <SectionLabel>Catalogue de formations</SectionLabel>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight text-zinc-950 sm:text-5xl md:text-6xl">
              Maîtrisez les outils
              <br />
              <span className="text-[#8b0f82]">qui recrutent.</span>
            </h1>
          </div>
        </section>

        <section className="py-8 md:py-10">
          <div className="mx-auto max-w-7xl px-4 md:px-6">
            {loading ? (
              <div className="mb-8 grid gap-3 md:grid-cols-[minmax(220px,320px)_1fr]">
                <div className="h-11 animate-pulse rounded-lg bg-zinc-100" />
                <div className="h-11 animate-pulse rounded-lg bg-zinc-100" />
              </div>
            ) : (
              <div className="mb-8 grid gap-3 md:grid-cols-[minmax(220px,320px)_1fr]">
                <select
                  value={selectedTags[0] ?? ""}
                  onChange={(event) => setSelectedTags(event.target.value ? [event.target.value] : [])}
                  className="h-11 w-full cursor-pointer rounded-lg border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-800 outline-none transition hover:border-zinc-300 focus:border-[#8b0f82] focus:ring-4 focus:ring-[#8b0f82]/10"
                  aria-label="Filtrer par domaine"
                >
                  <option value="">Tous les domaines</option>
                  {tagOptions.map((tag) => (
                    <option key={tag} value={tag}>
                      {tag}
                    </option>
                  ))}
                </select>

                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Rechercher une formation"
                    className="h-11 w-full rounded-lg border border-zinc-200 bg-white py-2 pl-11 pr-4 text-sm font-medium text-zinc-900 outline-none transition placeholder:text-zinc-400 hover:border-zinc-300 focus:border-[#8b0f82] focus:ring-4 focus:ring-[#8b0f82]/10"
                    type="search"
                  />
                </div>
              </div>
            )}
          </div>

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
