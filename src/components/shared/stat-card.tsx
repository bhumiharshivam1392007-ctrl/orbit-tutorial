import { motion } from "framer-motion"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatCardProps {
  title: string
  value: string | number
  change?: string
  trend?: "up" | "down" | "neutral"
  icon: LucideIcon
  description?: string
  gradient?: string
  delay?: number
}

export function StatCard({
  title,
  value,
  change,
  trend = "neutral",
  icon: Icon,
  description,
  gradient = "from-indigo-500/10 to-violet-500/10 text-indigo-600 dark:text-indigo-400",
  delay = 0,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-4 sm:p-6 shadow-sm transition-all hover:shadow-md hover:border-indigo-500/30"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs sm:text-sm font-medium text-muted-foreground">{title}</span>
        <div
          className={cn(
            "flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-gradient-to-br transition-transform group-hover:scale-105",
            gradient
          )}
        >
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
      </div>

      <div className="mt-2.5 sm:mt-3">
        <div className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-foreground">
          {value}
        </div>
        {(change || description) && (
          <div className="mt-1.5 sm:mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            {change && (
              <span
                className={cn(
                  "font-medium",
                  trend === "up" && "text-emerald-600 dark:text-emerald-400",
                  trend === "down" && "text-rose-600 dark:text-rose-400",
                  trend === "neutral" && "text-muted-foreground"
                )}
              >
                {change}
              </span>
            )}
            {description && <span className="truncate">{description}</span>}
          </div>
        )}
      </div>

      {/* Subtle bottom border accent */}
      <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
    </motion.div>
  )
}
