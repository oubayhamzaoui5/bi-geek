"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Target, Lightbulb, CheckCircle2 } from "lucide-react";

// === Framer Motion variants ===
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
    },
  },
};

const leftItemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" as const },
  },
};

const rightItemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" as const, delay: 0.1 },
  },
};

const approachGridVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2 },
  },
};

const approachLeftColumnVariants = {
  hidden: { opacity: 0, x: -40 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.6, ease: "easeOut" as const },
  },
};

const approachRightColumnVariants = {
  hidden: { opacity: 0, x: 40 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.6, ease: "easeOut" as const },
  },
};

const approachChildVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" as const },
  },
};

// === Component ===
export default function MissionVisionApproach() {
  return (
    <>
      {/* Mission & Vision Section */}
      <section className="py-10 md:py-18">
        <div className="container mx-auto px-3 sm:px-4">
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-start"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.25 }}
          >
            {/* Mission (left first) */}
            <motion.div className="space-y-4" variants={leftItemVariants}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                  <Target className="w-6 h-6 text-accent" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
                  Notre mission
                </h2>
              </div>

              <p className="text-sm sm:text-base md:text-lg text-muted-foreground leading-relaxed text-pretty">
                Rendre les compétences en data, BI et développement web
                accessibles, concrètes et orientées métier. Nous formons des
                professionnels qui peuvent immédiatement contribuer à des
                projets réels et évoluer dans leurs organisations.
              </p>

              <div className="pt-4">
                <Image
                  src="/team-working-together-on-data-analysis-project.jpg"
                  alt="Équipe travaillant ensemble"
                  width={400}
                  height={300}
                  className="rounded-2xl shadow-md object-cover w-full"
                />
              </div>
            </motion.div>

            {/* Vision (right, slightly later) */}
            <motion.div className="space-y-4" variants={rightItemVariants}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                  <Lightbulb className="w-6 h-6 text-accent dark:text-blue-400" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
                  Notre vision
                </h2>
              </div>

              <p className="text-sm sm:text-base md:text-lg text-muted-foreground leading-relaxed text-pretty">
                Construire une communauté d&apos;apprenants talentueux, de
                mentors expérimentés et d&apos;entreprises innovantes. Ensemble,
                nous créons un écosystème où chacun grandit, innove et réussit
                dans le domaine de la data et du développement.
              </p>

              <div className="pt-4">
                <Image
                  src="/professional-networking-event-with-diverse-profess.jpg"
                  alt="Communauté professionnelle"
                  width={400}
                  height={300}
                  className="rounded-2xl shadow-md object-cover w-full"
                />
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Pedagogical Approach Section */}
      <section className="py-8 md:py-18">
        <div className="container mx-auto px-3 sm:px-4">
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-32 items-start"
            variants={approachGridVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{
              once: true,
              amount: 0.1,
              margin: "100px 0px 0px 0px",
            }}
          >
            {/* Left: title, description, then list one by one */}
            <motion.div
              className="space-y-6"
              variants={approachLeftColumnVariants}
            >
              <motion.h2
                className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground"
                variants={approachChildVariants}
              >
                Notre approche <span className="text-accent">pédagogique</span>
              </motion.h2>

              <motion.p
                className="text-sm sm:text-base md:text-lg text-muted-foreground leading-relaxed text-pretty"
                variants={approachChildVariants}
              >
                Nous utilisons une pédagogie par projet axée sur
                l&apos;apprentissage pratique. Chaque bootcamp combine des
                ateliers intensifs, du mentorat personnalisé, des cas réels et
                du feedback continu pour assurer votre progression.
              </motion.p>

              <div className="space-y-3">
                {[
                  "Projets réels",
                  "Mentorat personnalisé",
                  "Feedback continu",
                  "Certifications reconnues",
                ].map((item, idx) => (
                  <motion.div
                    key={idx}
                    className="flex items-center gap-3"
                    variants={approachChildVariants}
                  >
                    <CheckCircle2 className="w-5 h-5 text-accent flex-shrink-0" />
                    <span className="text-sm md:text-base text-muted-foreground">
                      {item}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Right - Timeline: animates step by step, same time as title */}
            <motion.div variants={approachRightColumnVariants}>
              <div className="space-y-6">
                {[
                  {
                    step: 1,
                    title: "Diagnostic & objectifs",
                    desc: "Évaluation de vos compétences",
                  },
                  {
                    step: 2,
                    title: "Bootcamp intensif",
                    desc: "Formation accélérée 8-12 semaines",
                  },
                  {
                    step: 3,
                    title: "Projets encadrés",
                    desc: "Travail sur des cas réels",
                  },
                  {
                    step: 4,
                    title: "Suivi carrière",
                    desc: "Support après la formation",
                  },
                ].map((item, idx) => (
                  <motion.div
                    key={idx}
                    className="flex gap-4"
                    variants={approachChildVariants}
                  >
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center font-semibold text-sm">
                        {item.step}
                      </div>
                      {idx < 3 && (
                        <div className="w-1 h-16 md:h-20 bg-accent/20 mt-2" />
                      )}
                    </div>
                    <div className="pb-4">
                      <p className="font-semibold text-foreground">
                        {item.title}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {item.desc}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </>
  );
}
