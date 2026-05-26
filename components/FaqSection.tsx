"use client"

import { ChevronDown } from "lucide-react"

const faqs = [
  {
    question: "Quels sont les prérequis pour suivre les formations ?",
    answer: 'Les prérequis varient selon les formations. Les formations "Débutant" ne nécessitent aucune connaissance préalable. Pour les niveaux "Intermédiaire" et "Avancé", des connaissances de base sont recommandées. Consultez la page de chaque programme pour plus de détails.',
  },
  {
    question: "Les formations sont-elles disponibles en ligne ou en présentiel ?",
    answer: "Nous proposons les deux formats. La plupart de nos formations sont disponibles en ligne (live) et certaines en présentiel dans nos centres. Le format est indiqué pour chaque session dans le calendrier.",
  },
  {
    question: "Quel support est disponible pendant et après la formation ?",
    answer: "Pendant la formation, vous avez accès à un support par email et chat. Après la formation, vous gardez l'accès aux replays et ressources pédagogiques. Les formules Pro et Entreprise incluent également du mentorat personnalisé.",
  },
  {
    question: "Puis-je obtenir une certification à la fin de la formation ?",
    answer: "Oui, vous recevez un certificat de réussite BI GEEK à la fin de chaque formation. Certaines formations préparent également aux certifications officielles (Microsoft, AWS, etc.).",
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

export function FaqSection() {
  return (
    <section id="faq" className="border-y border-zinc-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-24">
        <div className="mb-10 flex flex-col gap-5 md:mb-14 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <SectionLabel>FAQ</SectionLabel>
            <h2 className="text-3xl font-semibold tracking-tight text-zinc-950 md:text-4xl">
              Questions <span className="text-[#8b0f82]">fréquentes</span>
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-6 text-zinc-600 md:text-right">
            Vous avez une autre question ? Contactez-nous, nous vous répondons rapidement.
          </p>
        </div>
        <div className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
          {faqs.map((faq) => (
            <details key={faq.question} className="group p-6">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 font-semibold text-zinc-950">
                {faq.question}
                <ChevronDown className="h-4 w-4 shrink-0 text-zinc-500 transition group-open:rotate-180" />
              </summary>
              <p className="mt-4 text-sm leading-6 text-zinc-600">{faq.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
