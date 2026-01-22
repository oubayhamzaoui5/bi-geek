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
    <section id="faq" className="py-8 md:py-32 -mx-2 md:mx-0">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="text-center mb-8 md:mb-12">
         
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-balance mb-3 sm:mb-4">
            Questions <span className="text-accent">Fréquentes</span>
          </h2>
      
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
