"use client"

import { motion } from "framer-motion"
import { BarChart3, Code2, Database } from "lucide-react"
import { Badge } from "@/components/ui/badge"

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.22, // 👈 one by one
      delayChildren: 0.15,
    },
  },
}

// Each card animates up into place
const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" },
  },
}

export function BiHeroVisual() {
  return (
    <motion.div
      className="relative w-full h-full flex items-center justify-center -ml-10"
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"                 // 👈 animate on scroll
      viewport={{ once: true, amount: 0.35 }} // 👈 triggers when ~35% visible
    >
      {/* Central Dashboard Card */}
      <motion.div variants={itemVariants} className="relative z-20">
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 4, repeat: Infinity, repeatType: "reverse" }}
          className="relative rounded-2xl border border-white/10 right-8 md:right-16 bg-white/10 backdrop-blur-md p-6 shadow-md hover:shadow-lg transition-all hover:-translate-y-1 w-80"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-accent/20">
              <BarChart3 className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm">Analytics Hub</h3>
              <p className="text-muted-foreground text-xs">Real-time Metrics</p>
            </div>
          </div>

          <div className="space-y-3 mb-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-xs">Revenue</span>
              <span className="font-bold text-foreground">$2.4M</span>
            </div>

            <div className="flex gap-1 h-8">
              <div className="flex-1 bg-chart-1/40 rounded-sm flex flex-col justify-end">
                <div className="bg-chart-1 rounded-sm h-1/3" />
              </div>
              <div className="flex-1 bg-chart-1/40 rounded-sm flex flex-col justify-end">
                <div className="bg-chart-1 rounded-sm h-2/3" />
              </div>
              <div className="flex-1 bg-chart-1/40 rounded-sm flex flex-col justify-end">
                <div className="bg-chart-1 rounded-sm h-1/2" />
              </div>
              <div className="flex-1 bg-chart-1/40 rounded-sm flex flex-col justify-end">
                <div className="bg-chart-1 rounded-sm h-3/4" />
              </div>
              <div className="flex-1 bg-chart-1/40 rounded-sm flex flex-col justify-end">
                <div className="bg-chart-1 rounded-sm h-1/3" />
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-xs">Conversion</span>
              <span className="font-bold text-foreground">+12.4%</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-xs">Power BI</Badge>
            <Badge variant="outline" className="text-xs">SQL</Badge>
            <Badge variant="outline" className="text-xs">Python</Badge>
          </div>
        </motion.div>
      </motion.div>

      {/* SQL Query Card */}
      <motion.div
        variants={itemVariants}
        className="absolute -top-2 right-2 md:-top-4 md:right-24 z-20"
      >
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 4.2, repeat: Infinity, repeatType: "reverse", delay: 0.2 }}
          className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur-md p-4 shadow-md hover:shadow-lg transition-all hover:-translate-y-1 w-72"
        >
          <div className="flex items-center gap-2 mb-3">
            <Database className="w-4 h-4 text-chart-2" />
            <span className="font-semibold text-foreground text-sm">Data Query</span>
          </div>
          <div className="bg-primary/10 rounded-lg p-3 font-mono text-xs text-muted-foreground space-y-1">
            <div><span className="text-chart-2">SELECT</span> revenue, date</div>
            <div><span className="text-chart-2">FROM</span> sales_data</div>
            <div><span className="text-chart-2">WHERE</span> year = 2025</div>
          </div>
        </motion.div>
      </motion.div>

      {/* Code Editor Card */}
      <motion.div
        variants={itemVariants}
        className="absolute bottom-0 right-4 md:-bottom-8 md:right-38 z-20"
      >
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 3.8, repeat: Infinity, repeatType: "reverse", delay: 0.4 }}
          className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur-md p-4 shadow-md hover:shadow-lg transition-all hover:-translate-y-1 w-72"
        >
          <div className="flex items-center gap-2 mb-3">
            <Code2 className="w-4 h-4 text-chart-3" />
            <span className="font-semibold text-foreground text-sm">React Component</span>
          </div>
          <div className="bg-primary/10 rounded-lg p-3 font-mono text-xs text-muted-foreground space-y-1">
            <div><span className="text-chart-3">export</span> <span className="text-chart-2">function</span> Dashboard()</div>
            <div className="ml-2"><span className="text-chart-2">return</span> ({"<>"}…)</div>
            <div className="ml-2">{"}"}</div>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}
