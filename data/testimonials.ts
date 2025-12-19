export interface Testimonial {
  id: string
  quote: string
  author: string
  role: string
  company: string
}

export const testimonials: Testimonial[] = [
  {
    id: "t1",
    quote:
      "La formation Power BI m'a permis de transformer complètement ma façon de travailler avec les données. En 3 mois, je suis devenu autonome sur des analyses complexes.",
    author: "Alexandre Petit",
    role: "Analyste Business",
    company: "TechCorp",
  },
  {
    id: "t2",
    quote:
      "Excellente pédagogie et cas pratiques très concrets. J'ai pu appliquer immédiatement les compétences acquises dans mon travail quotidien.",
    author: "Marie Rousseau",
    role: "Data Analyst",
    company: "DataFlow",
  },
  {
    id: "t3",
    quote:
      "Les formateurs sont des experts passionnés. Le parcours Azure Data Engineering m'a ouvert de nouvelles opportunités de carrière.",
    author: "David Chen",
    role: "Ingénieur Data",
    company: "CloudSystems",
  },
  {
    id: "t4",
    quote: "Formation complète et bien structurée. Le support post-formation et la communauté sont des atouts majeurs.",
    author: "Laura Moreau",
    role: "Développeuse",
    company: "WebInnovate",
  },
]

export const partnerLogos = [
  { name: "Microsoft", logo: "/microsoft-logo.png" },
  { name: "AWS", logo: "/aws-logo.png" },
  { name: "Google Cloud", logo: "/partners/google-cloud.png" },
  { name: "Tableau", logo: "/tableau-logo.png" },
]
