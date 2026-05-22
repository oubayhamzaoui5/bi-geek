export function isAiEnabled(): boolean {
  return process.env.AI_DISABLED !== "true"
}

export const AI_TECH_DOMAIN =
  "Business Intelligence (Power BI, Tableau, Looker Studio, DAX, Power Query), " +
  "Data Engineering (Azure Synapse, ETL/ELT, Cloud BI, Data Warehouse modeling), " +
  "Data Science (Python, Pandas, NumPy, scikit-learn, Statistics), " +
  "SQL (fondamentaux, optimisation, agrégations, jointures avancées), " +
  "Excel Avancé (formules, Power Query, Power Pivot), " +
  "et Visualisation de données."

export const AI_LEARNER_PROFILE =
  "Les apprenants sont des professionnels ou étudiants en reconversion qui souhaitent maîtriser " +
  "les outils de la data et de la BI pour progresser dans leur carrière. " +
  "Beaucoup ont une expérience avec Excel ou SQL basique et cherchent à monter en compétence " +
  "sur des outils comme Power BI, Azure, Python ou la modélisation de données."
