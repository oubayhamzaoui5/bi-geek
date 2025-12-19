export interface PricingTier {
  id: string
  name: string
  price: string
  description: string
  features: string[]
  highlighted?: boolean
}

export const pricingTiers: PricingTier[] = [
  {
    id: "essentiel",
    name: "Essentiel",
    price: "499€",
    description: "Parfait pour débuter",
    features: [
      "Accès à 1 formation au choix",
      "Support par email",
      "Certificat de réussite",
      "Accès aux replays pendant 3 mois",
      "Ressources pédagogiques",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "1 299€",
    description: "Pour les professionnels ambitieux",
    features: [
      "Accès à 3 formations",
      "Support prioritaire",
      "Certificat de réussite",
      "Accès aux replays pendant 12 mois",
      "Ressources pédagogiques avancées",
      "Sessions de mentorat (2h)",
      "Accès à la communauté privée",
    ],
    highlighted: true,
  },
  {
    id: "entreprise",
    name: "Entreprise",
    price: "Sur mesure",
    description: "Solutions personnalisées",
    features: [
      "Formations illimitées",
      "Support dédié 24/7",
      "Certificats personnalisés",
      "Accès illimité aux replays",
      "Contenu sur mesure",
      "Mentorat illimité",
      "Communauté privée",
      "Reporting et analytics",
      "Facturation centralisée",
    ],
  },
]
