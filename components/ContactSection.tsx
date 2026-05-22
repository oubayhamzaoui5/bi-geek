"use client"

import Link from "next/link"
import { Mail, MapPin, Phone } from "lucide-react"

const contactInfo = {
  email: "contact@bigeek.tn",
  phone: "58 611 283",
  location: "53 Rue Du Lac Léman, Tunis 1053",
  whatsapp: "21658611283",
}

const MAP_HREF = "https://maps.app.goo.gl/Qve7QTuxsyVxRdrf8"

const socials = [
  {
    label: "WhatsApp",
    sub: "Envoyez-nous un message",
    href: `https://wa.me/21658611283`,
    color: "#25D366",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    ),
  },
  {
    label: "LinkedIn",
    sub: "Suivez notre actualité",
    href: "https://tn.linkedin.com/company/bigeek",
    color: "#0A66C2",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
  {
    label: "Facebook",
    sub: "Rejoignez notre communauté",
    href: "https://www.facebook.com/bigeeks/",
    color: "#1877F2",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  {
    label: "Instagram",
    sub: "Découvrez nos coulisses",
    href: "https://www.instagram.com/bi.geek/",
    color: "#E1306C",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
      </svg>
    ),
  },
]

function SectionLabel({ children }: { children: string }) {
  return (
    <div className="mb-4 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#8b0f82]">
      <span className="h-px w-8 bg-[#8b0f82]" />
      {children}
    </div>
  )
}

export function ContactSection() {
  return (
    <section id="contact" className="mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-24">
      <div className="mb-10 flex flex-col gap-5 md:mb-14 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <SectionLabel>Contactez-nous</SectionLabel>
          <h2 className="text-3xl font-semibold tracking-tight text-zinc-950 md:text-4xl">
            Une question sur nos formations ?
          </h2>
        </div>
        <p className="max-w-sm text-sm leading-6 text-zinc-600 md:text-right">
          Une question, une inscription, une collaboration : nous répondons sous 24h.
        </p>
      </div>

      {/* Social + WhatsApp cards */}
      <div className="mb-5 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
        {socials.map(({ label, sub, href, color, icon }) => (
          <Link
            key={label}
            href={href}
            target="_blank"
            rel="noreferrer"
            className="group flex items-center gap-4 rounded-lg border-2 bg-white p-4 transition hover:shadow-md"
            style={{ borderColor: color + "33" }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = color)}
            onMouseLeave={e => (e.currentTarget.style.borderColor = color + "33")}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" style={{ background: color + "12", color }}>
              {icon}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold" style={{ color }}>{label}</p>
              <p className="truncate text-xs text-zinc-500">{sub}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Contact info cards */}
      <div className="grid gap-5 md:grid-cols-3">
        {[
          { label: "Email",     value: contactInfo.email,    href: `mailto:${contactInfo.email}`,                  icon: Mail   },
          { label: "Téléphone", value: contactInfo.phone,    href: `tel:${contactInfo.phone.replace(/\s+/g, "")}`, icon: Phone  },
          { label: "Adresse",   value: contactInfo.location, href: MAP_HREF,                                       icon: MapPin },
        ].map(({ label, value, href, icon: Icon }) => (
          <Link
            key={label}
            href={href}
            target={href.startsWith("http") ? "_blank" : undefined}
            rel={href.startsWith("http") ? "noreferrer" : undefined}
            className="group block rounded-lg border border-zinc-200 bg-white p-6 shadow-sm transition hover:border-[#8b0f82]/40"
          >
            <Icon className="mb-8 h-5 w-5 text-[#8b0f82]" />
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
            <p className="mt-2 font-semibold text-zinc-950 transition-colors duration-200 group-hover:text-[#8b0f82]">{value}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 overflow-hidden rounded-xl border border-zinc-200 shadow-sm">
        <iframe
          title="BI Geek — 53 Rue Du Lac Léman, Tunis"
          src="https://maps.google.com/maps?q=BI+GEEK+53+Rue+du+Lac+Leman+Les+Berges+du+Lac+Tunis+Tunisie&output=embed&z=17"
          width="100%"
          height="360"
          style={{ border: 0, display: "block" }}
          loading="lazy"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    </section>
  )
}
