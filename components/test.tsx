'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Star,
  Clock,
  Award,
  BookOpen,
  Users,
  CheckCircle,
  ChevronDown,
  Play,
  Linkedin,
  Github,
  Quote,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

// Hero Section
function HeroSection() {
  return (
    <section className="relative min-h-screen bg-gradient-to-br from-background via-background to-secondary/5 pt-20 md:pt-32 pb-12 md:pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
                Maîtrisez le
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/70">
                  {' '}
                  Web Moderne
                </span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground mt-4 leading-relaxed">
                Apprenez les technologies les plus demandées du marché avec un curriculum pensé par des experts du secteur.
              </p>
            </div>

            {/* Rating */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={20}
                    className="fill-primary text-primary"
                  />
                ))}
              </div>
              <div>
                <p className="font-semibold text-foreground">4.9/5</p>
                <p className="text-sm text-muted-foreground">
                  1,284 avis
                </p>
              </div>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 bg-secondary/50 px-4 py-2 rounded-full">
                <Clock size={18} className="text-primary" />
                <span className="text-sm font-medium">42 heures</span>
              </div>
              <div className="flex items-center gap-2 bg-secondary/50 px-4 py-2 rounded-full">
                <Award size={18} className="text-primary" />
                <span className="text-sm font-medium">Certificat</span>
              </div>
              <div className="flex items-center gap-2 bg-secondary/50 px-4 py-2 rounded-full">
                <Users size={18} className="text-primary" />
                <span className="text-sm font-medium">Tous niveaux</span>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button
                size="lg"
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                S'inscrire à la formation
              </Button>
              <Button
                size="lg"
                variant="outline"
              >
                Voir le programme
              </Button>
            </div>
          </motion.div>

          {/* Right Content - Course Preview Card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-8 aspect-video flex items-center justify-center border border-primary/20 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <motion.div
                whileHover={{ scale: 1.1 }}
                className="relative z-10"
              >
                <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center cursor-pointer shadow-lg">
                  <Play size={32} className="text-primary-foreground fill-primary-foreground ml-1" />
                </div>
              </motion.div>
            </div>

            {/* Floating Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="absolute -bottom-6 right-0 bg-background border border-border rounded-xl shadow-lg p-4 md:w-64"
            >
              <p className="text-sm font-semibold text-foreground mb-1">
                Approuvé par 5,000+ étudiants
              </p>
              <p className="text-xs text-muted-foreground">
                Rejoignez notre communauté grandissante de professionnels.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

// Learning Outcomes Section
function LearningOutcomesSection() {
  const outcomes = [
    {
      icon: BookOpen,
      title: 'Fondamentaux solides',
      description:
        'Maîtrisez les concepts core du développement web moderne',
    },
    {
      icon: Award,
      title: 'Projets réels',
      description: 'Construisez un portfolio avec des projets professionnels',
    },
    {
      icon: Users,
      title: 'Mentorat expert',
      description: 'Accès à une communauté de développeurs expérimentés',
    },
    {
      icon: CheckCircle,
      title: 'Certificat reconnu',
      description: 'Obtenez une certification respectable par l\'industrie',
    },
    {
      icon: Clock,
      title: 'Flexibilité totale',
      description: 'Apprenez à votre rythme, 24/7, depuis n\'importe où',
    },
    {
      icon: Star,
      title: 'Support lifetime',
      description: 'Accès permanent au contenu et aux mises à jour',
    },
  ]

  return (
    <section className="py-20 md:py-32 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Ce que vous allez apprendre
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Acquérez les compétences essentielles pour transformer votre carrière et rester à la pointe de la technologie.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {outcomes.map((outcome, idx) => {
            const Icon = outcome.icon
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: idx * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="p-6 bg-secondary/30 border-border hover:border-primary/30 hover:bg-secondary/50 transition-all duration-300">
                  <Icon className="w-10 h-10 text-primary mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {outcome.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {outcome.description}
                  </p>
                </Card>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// Curriculum Section
function CurriculumSection() {
  const modules = [
    {
      title: 'Module 1: Les Fondamentaux',
      lessons: 8,
      duration: '4h 30min',
      topics: [
        'Introduction au web',
        'Structure HTML',
        'Styling CSS avancé',
        'Responsive Design',
      ],
    },
    {
      title: 'Module 2: JavaScript Essentiel',
      lessons: 10,
      duration: '6h 15min',
      topics: [
        'Syntaxe et variables',
        'Manipuler le DOM',
        'Événements et fonctions',
        'Asynchronous JavaScript',
      ],
    },
    {
      title: 'Module 3: React en Profondeur',
      lessons: 12,
      duration: '8h 45min',
      topics: [
        'Composants et JSX',
        'State et Hooks',
        'Gestion d\'état avancée',
        'Performance optimization',
      ],
    },
    {
      title: 'Module 4: Backend et Bases de Données',
      lessons: 9,
      duration: '5h 30min',
      topics: [
        'Node.js et Express',
        'Architecture REST',
        'SQL et NoSQL',
        'Authentification',
      ],
    },
    {
      title: 'Module 5: Projets Capstone',
      lessons: 6,
      duration: '7h 00min',
      topics: [
        'Projet 1: Plateforme de blog',
        'Projet 2: Application e-commerce',
        'Déploiement en production',
        'Code review et best practices',
      ],
    },
    {
      title: 'Module 6: Évolution Professionnelle',
      lessons: 5,
      duration: '3h 00min',
      topics: [
        'Portfolio et CV',
        'Préparation aux entretiens',
        'Networking et communauté',
        'Ressources et apprentissage continu',
      ],
    },
  ]

  return (
    <section className="py-20 md:py-32 bg-secondary/5">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Programme détaillé
          </h2>
          <p className="text-lg text-muted-foreground">
            6 modules progressifs conçus pour vous transformer en développeur web compétent.
          </p>
        </motion.div>

        <Accordion type="single" collapsible className="space-y-4">
          {modules.map((module, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: idx * 0.1 }}
              viewport={{ once: true }}
            >
              <AccordionItem value={`module-${idx}`} className="border-border rounded-lg overflow-hidden">
                <AccordionTrigger className="bg-background hover:bg-secondary/50 px-6 py-4 text-left data-[state=open]:bg-secondary/50">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="text-2xl font-bold text-primary">
                      {idx + 1}
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground text-lg">
                        {module.title}
                      </h3>
                      <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <BookOpen size={14} />
                          {module.lessons} leçons
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={14} />
                          {module.duration}
                        </span>
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="bg-secondary/20 px-6 py-4">
                  <ul className="space-y-2">
                    {module.topics.map((topic, topicIdx) => (
                      <li
                        key={topicIdx}
                        className="flex items-start gap-3 text-muted-foreground"
                      >
                        <CheckCircle size={18} className="text-primary flex-shrink-0 mt-0.5" />
                        <span>{topic}</span>
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </motion.div>
          ))}
        </Accordion>
      </div>
    </section>
  )
}

// Instructor Section
function InstructorSection() {
  return (
    <section className="py-20 md:py-32 bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-12 text-center">
            Apprenez d'un expert
          </h2>

          <Card className="p-8 md:p-12 bg-gradient-to-br from-secondary/40 to-secondary/20 border-border">
            <div className="flex flex-col md:flex-row gap-8 items-center">
              {/* Avatar */}
              <div className="flex-shrink-0">
                <div className="w-32 h-32 md:w-40 md:h-40 bg-gradient-to-br from-primary/30 to-primary/10 rounded-2xl flex items-center justify-center border-2 border-primary/20">
                  <div className="w-28 h-28 md:w-36 md:h-36 bg-primary rounded-xl flex items-center justify-center text-4xl font-bold text-primary-foreground">
                    JS
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-foreground mb-1">
                  Jean-Paul Sartre
                </h3>
                <p className="text-primary font-semibold mb-4">
                  Senior Full-Stack Developer · Tech Lead
                </p>

                <p className="text-muted-foreground leading-relaxed mb-6">
                  Avec plus de 12 ans d'expérience en développement web, Jean-Paul a travaillé pour des startups et des grandes entreprises tech. Il est passionné par l'éducation et a formé plus de 50,000 développeurs.
                </p>

                <div className="space-y-3 mb-6">
                  <div className="flex items-start gap-3">
                    <CheckCircle size={20} className="text-primary flex-shrink-0" />
                    <span className="text-muted-foreground">
                      Expert en React, Node.js et architecture moderne
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle size={20} className="text-primary flex-shrink-0" />
                    <span className="text-muted-foreground">
                      A contribué à plusieurs projets open-source populaires
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle size={20} className="text-primary flex-shrink-0" />
                    <span className="text-muted-foreground">
                      Mentor actif et speaker international
                    </span>
                  </div>
                </div>

                {/* Social Icons */}
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 bg-transparent"
                  >
                    <Linkedin size={18} />
                    LinkedIn
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 bg-transparent"
                  >
                    <Github size={18} />
                    GitHub
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </section>
  )
}

// Testimonials Section
function TestimonialsSection() {
  const testimonials = [
    {
      name: 'Marie Dupont',
      company: 'TechStart Inc.',
      rating: 5,
      quote:
        'Cette formation a complètement transformé ma carrière. J\'ai pu obtenir mon premier poste de développeur senior en 6 mois après avoir terminé le cours.',
    },
    {
      name: 'Lucas Bernard',
      company: 'Digital Solutions',
      rating: 5,
      quote:
        'Le contenu est extrêmement pertinent et à jour. J\'apprécie vraiment la façon dont les concepts complexes sont expliqués de manière simple et pratique.',
    },
    {
      name: 'Sophie Leclerc',
      company: 'Innovation Labs',
      rating: 5,
      quote:
        'Les projets pratiques m\'ont vraiment aidé à comprendre comment appliquer les concepts dans le monde réel. Très recommandé!',
    },
  ]

  return (
    <section className="py-20 md:py-32 bg-secondary/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Ce que pensent nos étudiants
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Découvrez pourquoi des milliers de développeurs nous font confiance.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((testimonial, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: idx * 0.1 }}
              viewport={{ once: true }}
            >
              <Card className="p-6 bg-background border-border flex flex-col h-full">
                {/* Rating */}
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={16}
                      className="fill-primary text-primary"
                    />
                  ))}
                </div>

                {/* Quote */}
                <p className="text-muted-foreground leading-relaxed mb-6 flex-1 italic">
                  "{testimonial.quote}"
                </p>

                {/* Author */}
                <div>
                  <p className="font-semibold text-foreground">
                    {testimonial.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {testimonial.company}
                  </p>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Company Logos */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          viewport={{ once: true }}
          className="mt-16 text-center"
        >
          <p className="text-sm text-muted-foreground mb-8">
            Nos étudiants travaillent maintenant pour:
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8">
            {['Google', 'Meta', 'Microsoft', 'Spotify', 'Amazon'].map(
              (company) => (
                <div
                  key={company}
                  className="text-lg font-semibold text-muted-foreground/70 hover:text-foreground transition-colors"
                >
                  {company}
                </div>
              )
            )}
          </div>
        </motion.div>
      </div>
    </section>
  )
}

// Certificate Section
function CertificateSection() {
  return (
    <section className="py-20 md:py-32 bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left - Certificate Image */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-8 aspect-video flex items-center justify-center border border-primary/20">
              <div className="bg-white/90 backdrop-blur rounded-lg shadow-xl p-8 max-w-sm w-full transform -rotate-3">
                <div className="space-y-4">
                  <h3 className="text-2xl font-bold text-primary text-center">
                    Certificate of Completion
                  </h3>
                  <p className="text-center text-gray-600 text-sm">
                    This certifies that
                  </p>
                  <p className="text-center text-lg font-bold text-gray-900">
                    [Student Name]
                  </p>
                  <p className="text-center text-gray-600 text-sm">
                    has successfully completed the Web Development Masterclass
                  </p>
                  <div className="flex justify-between pt-4 border-t">
                    <div>
                      <p className="text-xs text-gray-500">Issued</p>
                      <p className="text-sm font-semibold">January 2025</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">ID</p>
                      <p className="text-sm font-semibold">CERT-2025-001</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right - Content */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Certificat reconnu par l'industrie
              </h2>
              <p className="text-lg text-muted-foreground">
                Obtenez une certification professionnelle que vous pouvez fièrement ajouter à votre CV et à vos profils de réseaux sociaux.
              </p>
            </div>

            <div className="space-y-4">
              {[
                'Partageable sur LinkedIn et autres plateformes',
                'Vérifiable en ligne par les recruteurs',
                'Reconnu par plus de 5,000 entreprises tech',
                'Boost votre profil professionnel',
              ].map((item, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <CheckCircle size={24} className="text-primary flex-shrink-0" />
                  <span className="text-foreground">{item}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

// FAQ Section
function FAQSection() {
  const faqs = [
    {
      question: 'Est-ce adapté aux débutants complets?',
      answer:
        'Absolument! Le cours commence par les fondamentaux. Aucune expérience préalable n\'est requise. Nous guidons les étudiants depuis zéro jusqu\'à un niveau professionnel.',
    },
    {
      question: 'Ai-je accès au contenu à vie?',
      answer:
        'Oui, vous avez un accès illimité à tous les matériaux de cours. Cela inclut les mises à jour futures et les ressources supplémentaires que nous ajoutons au cours.',
    },
    {
      question: 'Le certificat est-il vraiment utile?',
      answer:
        'Oui, de nombreux étudiants l\'ont utilisé pour obtenir des postes ou des augmentations. Les recruteurs reconnaissent la valeur du certificat car il est vérifiable en ligne.',
    },
    {
      question: 'Puis-je payer plus tard?',
      answer:
        'Oui, nous proposons des plans de paiement flexibles. Vous pouvez échelonner vos paiements sur 3 ou 6 mois selon vos préférences.',
    },
    {
      question: 'Combien de temps cela prendra-t-il pour apprendre?',
      answer:
        'Le cours contient 42 heures de contenu vidéo. La plupart des étudiants terminent en 8-12 semaines en étudiant 5-8 heures par semaine.',
    },
    {
      question: 'Y a-t-il un support étudiant?',
      answer:
        'Oui, vous avez accès à une communauté d\'étudiants active, des forums de discussion et un support par email. Notre équipe répondra à vos questions dans les 24 heures.',
    },
  ]

  return (
    <section className="py-20 md:py-32 bg-secondary/5">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Questions fréquentes
          </h2>
          <p className="text-lg text-muted-foreground">
            Tout ce que vous devez savoir sur la formation.
          </p>
        </motion.div>

        <Accordion type="single" collapsible className="space-y-3">
          {faqs.map((faq, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: idx * 0.05 }}
              viewport={{ once: true }}
            >
              <AccordionItem value={`faq-${idx}`} className="border-border rounded-lg overflow-hidden">
                <AccordionTrigger className="bg-background hover:bg-secondary/50 px-6 py-4 data-[state=open]:bg-secondary/50">
                  <span className="text-foreground font-semibold text-left">
                    {faq.question}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="bg-secondary/20 px-6 py-4 text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            </motion.div>
          ))}
        </Accordion>
      </div>
    </section>
  )
}

// Final CTA Section
function FinalCTASection() {
  return (
    <section className="py-20 md:py-32 bg-gradient-to-br from-primary/5 via-background to-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center space-y-8"
        >
          <div className="space-y-4">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground leading-tight">
              Prêt à transformer vos compétences?
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Rejoignez les milliers de développeurs qui ont déjà changé leur carrière. Commencez votre parcours d'apprentissage dès aujourd'hui.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-lg px-8"
            >
              S'inscrire à la formation
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-lg px-8 bg-transparent"
            >
              Parler à un conseiller
            </Button>
          </div>

          <p className="text-sm text-muted-foreground pt-4">
            ✓ Accès immédiat · ✓ Paiement sécurisé · ✓ Garantie 30 jours
          </p>
        </motion.div>
      </div>
    </section>
  )
}

// Sticky Enrollment Card
function StickyEnrollmentCard() {
  const [isSticky, setIsSticky] = useState(false)

  return (
    <motion.div
      animate={{ y: isSticky ? 0 : -100, opacity: isSticky ? 1 : 0 }}
      transition={{ duration: 0.3 }}
      className="fixed bottom-4 right-4 z-40 hidden lg:block"
      onMouseEnter={() => setIsSticky(true)}
      onMouseLeave={() => setIsSticky(false)}
      onTouchStart={() => setIsSticky(true)}
    >
      {isSticky && (
        <Card className="p-6 bg-background border-border shadow-xl w-80">
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">À partir de</p>
              <p className="text-3xl font-bold text-foreground">497€</p>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle size={16} className="text-primary" />
                <span className="text-foreground">42 heures de contenu</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle size={16} className="text-primary" />
                <span className="text-foreground">6 modules complets</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle size={16} className="text-primary" />
                <span className="text-foreground">Certificat inclus</span>
              </div>
            </div>

            <Button
              size="sm"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              S'inscrire maintenant
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Paiements sécurisés · Accès à vie
            </p>
          </div>
        </Card>
      )}
    </motion.div>
  )
}

// Main Page Component
export default function CourseLandingPage() {
  return (
    <main className="min-h-screen bg-background">
      <HeroSection />
      <LearningOutcomesSection />
      <CurriculumSection />
      <InstructorSection />
      <TestimonialsSection />
      <CertificateSection />
      <FAQSection />
      <FinalCTASection />
      <StickyEnrollmentCard />
    </main>
  )
}
