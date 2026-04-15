import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

const faqs = [
  {
    question: "Quels sont les prérequis pour suivre les formations ?",
    answer:
      'Les prérequis varient selon les formations. Les formations "Débutant" ne nécessitent aucune connaissance préalable. Pour les niveaux "Intermédiaire" et "Avancé", des connaissances de base sont recommandées. Consultez la page de chaque programme pour plus de détails.',
  },
  {
    question: "Les formations sont-elles disponibles en ligne ou en présentiel ?",
    answer:
      "Nous proposons les deux formats. La plupart de nos formations sont disponibles en ligne (live) et certaines en présentiel dans nos centres. Le format est indiqué pour chaque session dans le calendrier.",
  },
  {
    question: "Quel support est disponible pendant et après la formation ?",
    answer:
      "Pendant la formation, vous avez accès à un support par email et chat. Après la formation, vous gardez l'accès aux replays et ressources pédagogiques. Les formules Pro et Entreprise incluent également du mentorat personnalisé.",
  },
  {
    question: "Puis-je obtenir une certification à la fin de la formation ?",
    answer:
      "Oui, vous recevez un certificat de réussite BI GEEK à la fin de chaque formation. Certaines formations préparent également aux certifications officielles (Microsoft, AWS, etc.).",
  },
]

export function Faq() {
  return (
    <section id="faq" className="py-20 md:py-32 -mx-2 md:mx-0">
      <div className="container mx-auto px-4 md:px-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="h-px w-8 bg-accent" />
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent font-medium">
                FAQ
              </span>
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground leading-tight">
              Questions<br />
              <span className="text-accent">fréquentes</span>
            </h2>
          </div>
          <p className="text-sm text-muted-foreground max-w-xs md:text-right leading-relaxed">
            Vous avez une autre question ?{" "}
            <a href="/#contact" className="text-accent underline underline-offset-2">
              Contactez-nous
            </a>
          </p>
        </div>

        {/* Accordion */}
        <div className="max-w-3xl">
          <Accordion type="single" collapsible className="space-y-0">
            {faqs.map((faq, i) => (
              <AccordionItem
                key={i}
                value={`item-${i}`}
                className="border-b border-border last:border-b-0 px-0"
              >
                <AccordionTrigger className="text-left hover:no-underline py-5 group">
                  <div className="flex items-baseline gap-4 pr-4">
                    <span className="font-mono text-xs text-accent/60 shrink-0 group-hover:text-accent transition-colors">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="font-semibold text-sm md:text-base text-foreground leading-snug">
                      {faq.question}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pl-10 pr-4 pb-5">
                  <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                    {faq.answer}
                  </p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  )
}
