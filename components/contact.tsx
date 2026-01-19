"use client"

import Image from "next/image"
import Link from "next/link"
import { Mail, MapPin, Phone, Facebook, Linkedin, Instagram } from "lucide-react"
import { SiWhatsapp } from "react-icons/si" // Official WhatsApp icon

const CONTACT_INFO = {
  email: "contact@bigeek.tn",
  phone: "58 611 283",
  location: "53 Rue Du Lac Léman, Tunis 1053",
  whatsapp: "21658611283", // phone number without spaces
  socials: [
    { name: "Facebook", href: "https://www.facebook.com", icon: Facebook },
    { name: "LinkedIn", href: "https://www.linkedin.com", icon: Linkedin },
    { name: "Instagram", href: "https://www.instagram.com", icon: Instagram },
  ],
}

export function Contact() {
  return (
    <section id="contact" className="relative bg-accent  -mx-4 md:mx-0 py-0 text-white overflow-hidden">
      <div className="container mx-auto px-4 flex flex-col md:flex-row items-center gap-12">
        {/* LEFT — Person Image */}
        <div className="hidden md:flex justify-center md:w-1/2">
          <Image
            src="/person4.webp"
            alt="Contact person"
            width={600}
            height={600}
            className="object-contain"
            priority
          />
        </div>

        {/* RIGHT — Contact Info */}
        <div className="w-full md:w-1/2 flex flex-col gap-6 py-4 md:py-0">
          {/* Optional Header */}
          <h3 className="text-3xl sm:text-4xl font-bold">Entrons en contact</h3>
          <p className="text-sm sm:text-base text-white/90">
            Vous avez une question, un projet ou souhaitez collaborer ? <br /> Voici comment nous contacter.
          </p>

          {/* Contact Details */}
          <ul className="space-y-4 text-white">
            <li className="flex items-center gap-3">
              <Mail className="h-5 w-5" />
              <Link
                href={`mailto:${CONTACT_INFO.email}`}
                className="hover:underline"
              >
                {CONTACT_INFO.email}
              </Link>
            </li>
            <li className="flex items-center gap-3">
              <Phone className="h-5 w-5 " />
              <Link
                href={`tel:${CONTACT_INFO.phone.replace(/\s+/g, "")}`}
                className="hover:underline"
              >
                {CONTACT_INFO.phone}
              </Link>
            </li>
            <li className="flex items-center gap-3">
              <MapPin className="h-5 w-5 " />
              <span>{CONTACT_INFO.location}</span>
            </li>
          </ul>

          {/* Social Links */}
          <div className="flex flex-wrap gap-3 mt-4">
            {CONTACT_INFO.socials.map(({ name, href, icon: Icon }) => (
              <Link
                key={name}
                href={href}
                target="_blank"
                rel="noreferrer"
                aria-label={name}
                className="inline-flex items-center gap-2 rounded-xl border border-2 border-white/50 px-3 py-2 text-sm hover:underline transition"
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{name}</span>
              </Link>
            ))}
          </div>

          {/* WhatsApp Button */}
          <div className="mt-4">
            <Link
              href={`https://wa.me/${CONTACT_INFO.whatsapp}`}
              target="_blank"
              rel="noreferrer"
              aria-label="WhatsApp"
              className="inline-flex items-center gap-2 rounded-sm bg-[#25D366] px-4 py-2 text-sm font-medium hover:bg-[#1ebe57] transition -mt-4"
            >
              <SiWhatsapp className="h-6 w-6 text-white" />
              <span className="text-white">Envoyez-nous un message</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
