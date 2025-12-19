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
    <section id="faq" className="py-4 md:py-8 -mx-2 md:mx-0">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="text-center mb-8 md:mb-12">
          <p className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-accent mb-2 sm:mb-3">
            Questions fréquentes
          </p>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-balance mb-3 sm:mb-4">
            FAQ
          </h2>
          <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
            Trouvez les réponses aux questions les plus courantes
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="space-y-3 sm:space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-card rounded-xl sm:rounded-2xl px-4 sm:px-6 border shadow-sm"
              >
                <AccordionTrigger className="text-left hover:no-underline py-4 sm:py-6">
                  <span className="font-semibold text-sm sm:text-base text-pretty pr-2 sm:pr-4">
                    {faq.question}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="text-sm sm:text-base text-muted-foreground text-pretty leading-relaxed pb-4 sm:pb-6">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  )
}
