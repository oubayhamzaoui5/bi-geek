export interface Program {
  id: string
  title: string
  category: "BI" | "Data" | "Web" | "Cloud" | "AI/ML"
  level: "Débutant" | "Intermédiaire" | "Avancé"
  hours: number
  shortDescription: string
  slug: string
}

export const programs: Program[] = [
  {
    id: "1",
    title: "Power BI : De zéro à expert",
    category: "BI",
    level: "Débutant",
    hours: 24,
    shortDescription:
      "Maîtrisez Power BI de A à Z : modélisation de données, DAX, visualisations avancées et déploiement.",
    slug: "power-bi-expert",
  },
  {
    id: "2",
    title: "SQL pour l'analyse de données",
    category: "Data",
    level: "Intermédiaire",
    hours: 18,
    shortDescription: "Requêtes avancées, optimisation, CTEs, window functions et analyse de données complexes.",
    slug: "sql-analyse-donnees",
  },
  {
    id: "3",
    title: "Python pour la Data Science",
    category: "Data",
    level: "Intermédiaire",
    hours: 32,
    shortDescription: "Pandas, NumPy, visualisation avec Matplotlib/Seaborn, et introduction au Machine Learning.",
    slug: "python-data-science",
  },
  {
    id: "4",
    title: "React & Next.js : Applications modernes",
    category: "Web",
    level: "Avancé",
    hours: 28,
    shortDescription: "Développez des applications web performantes avec React 19, Next.js 15 et TypeScript.",
    slug: "react-nextjs-moderne",
  },
  {
    id: "5",
    title: "Azure Data Engineering",
    category: "Cloud",
    level: "Avancé",
    hours: 36,
    shortDescription: "Architectures data sur Azure : Data Factory, Synapse Analytics, Databricks et Data Lake.",
    slug: "azure-data-engineering",
  },
  {
    id: "6",
    title: "Machine Learning avec Python",
    category: "AI/ML",
    level: "Avancé",
    hours: 40,
    shortDescription: "Scikit-learn, TensorFlow, modèles supervisés/non-supervisés, et déploiement de modèles.",
    slug: "machine-learning-python",
  },
]
