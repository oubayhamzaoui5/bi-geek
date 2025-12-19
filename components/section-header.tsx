interface SectionHeaderProps {
  title: string
  subtitle?: string
  description?: string
  centered?: boolean
}

export function SectionHeader({ title, subtitle, description, centered = false }: SectionHeaderProps) {
  return (
    <div className={cn("mb-12", centered && "text-center")}>
      {subtitle && <p className="text-sm font-semibold uppercase tracking-wider text-[#954ABF] mb-3">{subtitle}</p>}
      <h2 className="text-3xl md:text-4xl font-bold text-balance mb-4">{title}</h2>
      {description && <p className="text-lg text-muted-foreground max-w-2xl text-pretty">{description}</p>}
    </div>
  )
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ")
}
