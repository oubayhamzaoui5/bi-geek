"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Mail, MapPin, Phone, Facebook, Linkedin, Instagram, ArrowUpRight } from "lucide-react"
import { SiWhatsapp } from "react-icons/si"

const CONTACT_INFO = {
  email: "contact@bigeek.tn",
  phone: "58 611 283",
  location: "53 Rue Du Lac Léman, Tunis 1053",
  whatsapp: "21658611283",
  socials: [
    { name: "Facebook",  href: "https://www.facebook.com",  icon: Facebook },
    { name: "LinkedIn",  href: "https://www.linkedin.com",  icon: Linkedin },
    { name: "Instagram", href: "https://www.instagram.com", icon: Instagram },
  ],
}

export function Contact() {
  return (
    <section
      id="contact"
      className="relative overflow-hidden -mx-4 md:-mx-16 px-4 md:px-16 py-20 md:py-28 border-y border-border"
      style={{ backgroundColor: "oklch(0.965 0.004 80)" }}
    >
      <div className="container mx-auto px-4 md:px-6 relative z-10">

        {/* Top row */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-14">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="flex items-center gap-3 mb-5"
            >
              <div className="h-px w-8 bg-accent" />
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent font-medium">
                Contactez-nous
              </span>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55, delay: 0.1 }}
              className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-[1.0]"
            >
              Une question sur<br />
              nos <span className="text-accent">formations ?</span>
            </motion.h2>
          </div>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: 0.2 }}
            className="text-muted-foreground text-sm leading-relaxed max-w-xs md:text-right"
          >
            Une question, une inscription, une collaboration —<br />
            nous répondons sous 24h.
          </motion.p>
        </div>

        {/* Contact cells */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 border border-border bg-white"
        >
          {/* Email */}
          <Link
            href={`mailto:${CONTACT_INFO.email}`}
            className="group p-8 border-b md:border-b-0 md:border-r border-border hover:bg-accent/[0.03] transition-colors duration-300 flex flex-col justify-between gap-6 min-h-[160px]"
          >
            <div className="flex items-center justify-between">
              <Mail className="h-5 w-5 text-muted-foreground/50 group-hover:text-accent transition-colors duration-300" />
              <ArrowUpRight className="h-4 w-4 text-muted-foreground/30 opacity-0 group-hover:opacity-100 group-hover:text-accent transition-all duration-300" />
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/50 mb-2">Email</p>
              <p className="font-display font-semibold text-foreground text-base group-hover:text-accent transition-colors duration-300 break-all">
                {CONTACT_INFO.email}
              </p>
            </div>
          </Link>

          {/* Phone */}
          <Link
            href={`tel:${CONTACT_INFO.phone.replace(/\s+/g, "")}`}
            className="group p-8 border-b md:border-b-0 md:border-r border-border hover:bg-accent/[0.03] transition-colors duration-300 flex flex-col justify-between gap-6 min-h-[160px]"
          >
            <div className="flex items-center justify-between">
              <Phone className="h-5 w-5 text-muted-foreground/50 group-hover:text-accent transition-colors duration-300" />
              <ArrowUpRight className="h-4 w-4 text-muted-foreground/30 opacity-0 group-hover:opacity-100 group-hover:text-accent transition-all duration-300" />
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/50 mb-2">Téléphone</p>
              <p className="font-display font-semibold text-foreground text-base group-hover:text-accent transition-colors duration-300">
                {CONTACT_INFO.phone}
              </p>
            </div>
          </Link>

          {/* Address */}
          <div className="group p-8 hover:bg-accent/[0.03] transition-colors duration-300 flex flex-col justify-between gap-6 min-h-[160px]">
            <MapPin className="h-5 w-5 text-muted-foreground/50" />
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/50 mb-2">Adresse</p>
              <p className="font-display font-semibold text-foreground text-base leading-snug">
                {CONTACT_INFO.location}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Bottom bar */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.35 }}
          className="mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 pt-6 border-t border-border"
        >
          <div className="flex items-center gap-3">
            {CONTACT_INFO.socials.map(({ name, href, icon: Icon }) => (
              <Link
                key={name}
                href={href}
                target="_blank"
                rel="noreferrer"
                aria-label={name}
                className="w-9 h-9 border border-border bg-white flex items-center justify-center text-muted-foreground hover:border-accent hover:text-accent transition-all duration-300"
              >
                <Icon className="h-4 w-4" />
              </Link>
            ))}
          </div>

          <Link
            href={`https://wa.me/${CONTACT_INFO.whatsapp}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2.5 bg-[#25D366] hover:bg-[#20c05c] px-5 py-2.5 text-sm font-semibold text-white transition-colors"
          >
            <SiWhatsapp className="h-4 w-4" />
            Envoyer un message
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
