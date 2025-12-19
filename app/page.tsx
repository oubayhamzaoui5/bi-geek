import { Navbar } from "@/components/navbar"
import { Hero } from "@/components/hero"
import { ProgramsGrid } from "@/components/programs-grid"
import { Tracks } from "@/components/tracks"
import { Instructors } from "@/components/instructors"
import { Testimonials } from "@/components/testimonials"
import {Contact} from "@/components/contact"
import { Faq } from "@/components/faq"
import { Footer } from "@/components/footer"
import { AboutHero } from "@/components/about-hero"
import MissionVisionApproach from "@/components/missionvisionapproach"

export default function Home() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="px-4 md:px-24">
        <Hero />
                <AboutHero />
        <MissionVisionApproach />

        <Instructors />
        <Testimonials />
        <Contact />

        <Faq />
      </main>
      <Footer />
    </div>
  )
}
