"use client"

import Image from "next/image"
import { Star } from "lucide-react"

const testimonials = [
  {
    quote: "La formation Power BI m'a permis de transformer complètement ma façon de travailler avec les données. En 3 mois, je suis devenu autonome sur des analyses complexes.",
    author: "Yassine Ben Amor",
    role: "Analyste Business",
    company: "TechCorp",
    rating: 4,
    avatar: "/tp1.webp",
  },
  {
    quote: "Excellente pédagogie et cas pratiques très concrets. J'ai pu appliquer immédiatement les compétences acquises dans mon travail quotidien.",
    author: "Amel Trabelsi",
    role: "Data Analyst",
    company: "DataFlow",
    rating: 5,
    avatar: "/tp2.webp",
  },
  {
    quote: "Les formateurs sont des experts passionnés. Le parcours Azure Data Engineering m'a ouvert de nouvelles opportunités de carrière.",
    author: "Mehdi Gharbi",
    role: "Ingénieur Data",
    company: "CloudSystems",
    rating: 4,
    avatar: "/tp3.webp",
  },
]

function SectionLabel({ children }: { children: string }) {
  return (
    <div className="mb-4 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#8b0f82]">
      <span className="h-px w-8 bg-[#8b0f82]" />
      {children}
    </div>
  )
}

export function TestimonialsSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-24">
      <div className="mb-10 flex flex-col gap-5 md:mb-14 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <SectionLabel>Témoignages</SectionLabel>
          <h2 className="text-3xl font-semibold tracking-tight text-zinc-950 md:text-4xl">
            Ce que disent nos apprenants
          </h2>
        </div>
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        {testimonials.map((testimonial) => (
          <article
            key={testimonial.author}
            className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-[#8b0f82]/30 hover:shadow-[0_8px_30px_-6px_rgba(139,15,130,0.18)]"
          >
            <div className="mb-5 flex gap-1">
              {Array.from({ length: 5 }).map((_, index) => (
                <Star
                  key={index}
                  className={`h-4 w-4 ${index < testimonial.rating ? "fill-[#8b0f82] text-[#8b0f82]" : "text-zinc-200"}`}
                />
              ))}
            </div>
            <p className="text-sm leading-7 text-zinc-700">"{testimonial.quote}"</p>
            <div className="mt-6 flex items-center gap-3 border-t border-zinc-100 pt-5">
              <div className="relative h-12 w-12 overflow-hidden rounded-full bg-zinc-100">
                <Image src={testimonial.avatar} alt={testimonial.author} fill className="object-cover" sizes="48px" />
              </div>
              <div>
                <p className="font-semibold text-zinc-950">{testimonial.author}</p>
                <p className="text-xs text-zinc-500">{testimonial.role}, {testimonial.company}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
