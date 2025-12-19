export interface Instructor {
  id: string
  name: string
  role: string
  expertise: string[]
  avatar: string
  bio: string
}

export const instructors: Instructor[] = [
  {
    id: "i1",
    name: "Sophie Martin",
    role: "Experte BI & Cloud",
    expertise: ["Power BI", "Azure", "SQL Server"],
    avatar: "/instructor.jpg",
    bio: "12 ans d'expérience en Business Intelligence. Certifiée Microsoft Azure & Power BI.",
  },
  {
    id: "i2",
    name: "Marc Dubois",
    role: "Architecte Data",
    expertise: ["SQL", "Python"],
    avatar: "/instructor.jpg",
    bio: "Architecte data senior avec une expertise en pipelines de données et optimisation SQL.",
  },
  {
    id: "i3",
    name: "Julie Lefebvre",
    role: "Data Scientist",
    expertise: ["Python", "Machine Learning"],
    avatar: "/instructor.jpg",
    bio: "Spécialiste en Machine Learning et Deep Learning. Docteure en informatique.",
  },
  {
    id: "i4",
    name: "Thomas Bernard",
    role: "Développeur Full-Stack",
    expertise: ["React", "Next.js"],
    avatar: "/instructor.jpg",
    bio: "Expert en développement web moderne. Contributeur open-source actif.",
  },
]
