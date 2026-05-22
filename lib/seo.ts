export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://bi-geek.net"

export const siteConfig = {
  name: "BI Geek",
  url: siteUrl,
  title: "BI Geek | Centre de formation tech en Tunisie",
  description:
    "BI Geek est un centre de formation technologique en Tunisie spécialisé en Data Analytics, Business Intelligence, IA, Cloud, Cyber Security, développement web et management.",
  locale: "fr_FR",
  og: {
    home: "/og-home.webp",
    formations: "/og-formations.webp",
    about: "/og-about.webp",
    enterprise: "/og-enterprise.webp",
    fallback: "/placeholder-course.webp",
  },
}

export function absoluteUrl(path = "/") {
  if (path.startsWith("http")) return path
  return `${siteConfig.url}${path.startsWith("/") ? path : `/${path}`}`
}

export function getOgImage(path?: string | null) {
  return absoluteUrl(path || siteConfig.og.fallback)
}
