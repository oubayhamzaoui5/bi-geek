export interface Testimonial {
  id: string
  quote: string
  author: string
  role: string
  company: string
  rating: 4 | 5
  avatar?: string
}

export const testimonials: Testimonial[] = [
  {
    id: "t1",
    quote:
      "La formation Power BI m'a permis de transformer complètement ma façon de travailler avec les données. En 3 mois, je suis devenu autonome sur des analyses complexes.",
    author: "Yassine Ben Amor",
    role: "Analyste Business",
    company: "TechCorp",
    rating: 4,
    avatar: "/tp1.webp",
  },
  {
    id: "t2",
    quote:
      "Excellente pédagogie et cas pratiques très concrets. J'ai pu appliquer immédiatement les compétences acquises dans mon travail quotidien.",
    author: "Amel Trabelsi",
    role: "Data Analyst",
    company: "DataFlow",
    rating: 5,
    avatar: "/tp2.webp",
  },
  {
    id: "t3",
    quote:
      "Les formateurs sont des experts passionnés. Le parcours Azure Data Engineering m'a ouvert de nouvelles opportunités de carrière.",
    author: "Mehdi Gharbi",
    role: "Ingénieur Data",
    company: "CloudSystems",
    rating: 4,
    avatar: "/tp3.webp",
  },
]
