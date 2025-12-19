"use client"

import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { MessagesTab } from "@/components/messages-tab"
import { Award, Download } from "lucide-react"
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar-context"

interface Certificate {
  id: string
  courseTitle: string
  instructor: string
  date: string
  imageUrl: string
  downloadUrl: string
}

const certificates: Certificate[] = [
  {
    id: "CERT-2025-001",
    courseTitle: "Fondamentaux de Power BI",
    instructor: "Alexandre Dupont",
    date: "20 Octobre 2025",
    imageUrl: "/certificate.png",
    downloadUrl: "/certificates/powerbi-cert.pdf",
  },
  {
    id: "CERT-2025-002",
    courseTitle: "SQL pour l'Analyse de Données",
    instructor: "Marie Lambert",
    date: "05 Septembre 2025",
    imageUrl: "/certificate.png",
    downloadUrl: "/certificates/sql-cert.pdf",
  },
  {
    id: "CERT-2025-003",
    courseTitle: "Visualisation de Données Avancée",
    instructor: "Julien Moreau",
    date: "01 Août 2025",
    imageUrl: "/certificate.png",
    downloadUrl: "/certificates/dataviz-cert.pdf",
  },
]

function CertificatesGrid() {
  const { isCollapsed } = useSidebar()

  // 👇 Dynamic grid layout
  const gridCols = isCollapsed
    ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4"
    : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"

  return (
    <div className={`grid ${gridCols} gap-6 transition-all duration-300`}>
      {certificates.map((cert) => (
        <div
          key={cert.id}
          className="rounded-xl border border-border bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/80 shadow-md p-4 flex flex-col hover:shadow-lg transition-shadow duration-300"
        >
          {/* Certificate Preview */}
          <div className="w-full h-48 rounded-lg overflow-hidden bg-muted/30 mb-4 border border-border/60">
            <img
              src={cert.imageUrl || "/placeholder.svg"}
              alt={cert.courseTitle}
              className="w-full h-full object-cover transition-transform duration-300 "
            />
          </div>

          {/* Info */}
          <div className="flex-1 flex flex-col justify-between space-y-2">
            <h3 className="text-lg font-semibold text-foreground leading-snug">
              {cert.courseTitle}
            </h3>

            <div className="text-sm text-muted-foreground space-y-1">
              <p>
                <span className="text-foreground/80 font-medium">Formateur :</span>{" "}
                {cert.instructor}
              </p>
              <p>
                <span className="text-foreground/80 font-medium">Date :</span>{" "}
                {cert.date}
              </p>
              <p className="text-xs text-muted-foreground/80">ID : {cert.id}</p>
            </div>
          </div>

          {/* Action */}
          <div className="mt-4 flex justify-end">
            <a
              href={cert.downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 inline-flex items-center gap-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Download size={16} />
              Voir / Télécharger
            </a>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function CertificatesPage() {
  return (
    <SidebarProvider>
      <div className="flex h-screen bg-muted/30">
        <Sidebar />

        <main className="flex-1 overflow-auto">
          <Header />

          <div className="p-6 md:p-8 space-y-8">
            {/* Page Title */}
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <Award className="text-accent" size={28} />
                Mes certificats
              </h2>
              <p className="text-sm text-muted-foreground">
                Vous avez complété {certificates.length} certificats 🎓
              </p>
            </div>

            {/* Certificates Grid */}
            <CertificatesGrid />
          </div>

          <Footer />
        </main>

        <MessagesTab />
      </div>
    </SidebarProvider>
  )
}
