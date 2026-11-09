import type { Metadata } from "next"
import Image from "next/image"
import { notFound } from "next/navigation"
import { Linkedin } from "lucide-react"
import { Footer } from "@/components/footer"
import { Navbar } from "@/components/navbar"
import { getPublicInstructors, MIN_PUBLIC_INSTRUCTORS } from "@/lib/server-public-instructors"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Nos formateurs",
  description: "Découvrez les formateurs BI Geek, leurs spécialités et leurs parcours professionnels.",
  alternates: { canonical: "/formateurs" },
}

export default async function InstructorsPage() {
  const instructors = await getPublicInstructors()
  if (instructors.length < MIN_PUBLIC_INSTRUCTORS) notFound()

  return (
    <div className="flex min-h-screen flex-col bg-[#fbfaf8] text-zinc-950">
      <Navbar showInstructors />
      <main className="flex-1">
        <section className="border-b border-zinc-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-24">
            <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
              Nos <span className="text-[#8b0f82]">formateurs.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-zinc-600">
              Découvrez les parcours et les spécialités de celles et ceux qui vous accompagnent chez BI Geek.
            </p>
          </div>
        </section>

        <ul aria-label="Formateurs BI Geek" className="mx-auto grid max-w-7xl gap-4 px-4 py-10 sm:grid-cols-2 md:gap-6 md:px-6 md:py-16">
          {instructors.map((instructor) => (
            <li key={instructor.id}>
              <article className="flex h-full flex-col rounded-2xl border border-zinc-200 bg-white p-5 sm:p-7">
                <div className="flex items-center gap-4">
                  {instructor.avatar ? (
                    <Image src={instructor.avatar} width={72} height={72} alt="" unoptimized className="size-16 shrink-0 rounded-xl object-cover sm:size-[72px]" />
                  ) : (
                    <div aria-hidden="true" className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-[#f7eaf5] text-xl font-semibold text-[#8b0f82] sm:size-[72px]">
                      {instructor.name.split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toLocaleUpperCase("fr")}
                    </div>
                  )}
                  <div className="min-w-0 wrap-break-word">
                    <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{instructor.name}</h2>
                    {instructor.title && <p className="mt-1 text-sm leading-6 text-zinc-600">{instructor.title}</p>}
                  </div>
                </div>

                {instructor.specialty && <p className="mt-5 wrap-break-word text-sm font-semibold text-[#8b0f82]">{instructor.specialty}</p>}
                {instructor.description && <p className="mt-3 wrap-break-word whitespace-pre-line text-sm leading-7 text-zinc-700">{instructor.description}</p>}
                {instructor.linkedIn && (
                  <div className="mt-auto pt-5">
                    <a href={instructor.linkedIn} target="_blank" rel="noopener noreferrer" aria-label={`Profil LinkedIn de ${instructor.name}`} className="inline-flex items-center gap-2 text-sm font-semibold text-[#8b0f82] underline-offset-4 hover:underline">
                      <Linkedin aria-hidden="true" className="size-4" /> Profil LinkedIn
                    </a>
                  </div>
                )}
              </article>
            </li>
          ))}
        </ul>
      </main>
      <Footer />
    </div>
  )
}
