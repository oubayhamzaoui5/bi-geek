"use client"

import { Suspense, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import "@mux/mux-player"
import { ArrowLeft, FileText } from "lucide-react"

import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { MessagesTab } from "@/components/messages-tab"

import MuxPlayerClient from "@/components/MuxPlayerClient"
import { InstructorSection } from "@/components/student/instructor-section"
import { SidebarProvider } from "@/components/ui/sidebar-context"

function VideoViewerContent() {
  const searchParams = useSearchParams()
  const playbackId = searchParams.get("pid") ?? undefined
  const title = searchParams.get("title") || "Lecture vidéo"
  const description =
    searchParams.get("desc") ||
    "Dans cette leçon, vous apprendrez les bases de l’analyse de données avec Pandas. Nous explorerons comment importer des fichiers CSV, manipuler des DataFrames et nettoyer efficacement vos données pour les étapes de visualisation."

  const poster = useMemo(
    () =>
      playbackId
        ? `https://image.mux.com/${playbackId}/thumbnail.jpg?time=2&fit_mode=preserve&width=1280`
        : undefined,
    [playbackId]
  )

  const attachments = [
    { name: "Slides du cours.pdf", href: "/test.pdf" },
    { name: "Notebook Pandas.pdf", href: "/test.pdf" },
    { name: "Exemples de DataFrames.pdf", href: "/test.pdf" },
  ]

  return (
    <SidebarProvider>
      <div className="flex h-screen bg-background">
        <Sidebar />

        <main className="flex-1 overflow-auto">
          <Header />

          <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
            {/* Back Button */}
            <div className="flex items-center mb-2">
              <button
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                onClick={() => history.back()}
              >
                <ArrowLeft className="w-5 h-5" />
                Retour
              </button>
            </div>

            {/* If no video */}
            {!playbackId ? (
              <div className="max-w-3xl space-y-4">
                <h1 className="text-2xl font-bold text-foreground">Aucune vidéo</h1>
                <p className="text-muted-foreground">
                  Le paramètre <code>pid</code> (playbackId) est manquant. Ajoutez-le à l’URL pour lancer la lecture.
                </p>
              </div>
            ) : (
              <>
                {/* Player */}
                <MuxPlayerClient playbackId={playbackId} title={title} poster={poster} muted />

                {/* Two-column layout with equal height */}
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-stretch mb-4">
                  {/* Left: Title + Description */}
                  <div className="h-full">
                    <div className="h-full rounded-xl border border-border bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/80 shadow-md p-6 flex flex-col">
                      <h1 className="text-3xl font-bold text-foreground mb-3">{title}</h1>
                      <p className="text-muted-foreground leading-relaxed">{description}</p>
                    </div>
                  </div>

                  {/* Right: Instructor */}
                  <div className="h-full">
                    <InstructorSection />
                  </div>
                </div>

                {/* Attachments Section */}
                <div className="space-y-3">
                  <h2 className="text-2xl font-bold text-foreground">Pièces jointes</h2>

                  {attachments.length > 0 ? (
                    <div className="flex flex-wrap gap-4">
                      {attachments.map((file, idx) => (
                        <a
                          key={idx}
                          href={file.href}
                          target="_blank"
                          rel="noreferrer"
                          title={file.name}
                          className="group rounded-xl border border-border bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/80 shadow-md
                                     hover:bg-muted/60 transition-colors
                                     w-[160px] h-[160px] flex flex-col items-center justify-center"
                        >
                          <FileText className="w-10 h-10 text-accent mb-3 transition-transform group-hover:scale-110" />
                          <span className="text-xs sm:text-sm font-medium text-center text-foreground px-2 line-clamp-2">
                            {file.name}
                          </span>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Aucune pièce jointe pour le moment.</p>
                  )}
                </div>
              </>
            )}
          </div>

          <Footer />
        </main>

        <MessagesTab />
      </div>
    </SidebarProvider>
  )
}

export default function VideoViewerPage() {
  return (
    <Suspense>
      <VideoViewerContent />
    </Suspense>
  )
}
