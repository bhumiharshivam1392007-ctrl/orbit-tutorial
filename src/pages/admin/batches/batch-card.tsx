import {
  GraduationCap,
  IndianRupee,
  MoreVertical,
  Edit2,
  Trash2,
  Eye,
  BookOpen,
} from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatCurrency } from "@/lib/utils"
import type { BatchWithSubjects } from "@/types/database"

interface BatchCardProps {
  batch: BatchWithSubjects
  onSelect: (batch: BatchWithSubjects) => void
  onEdit: (batch: BatchWithSubjects) => void
  onDelete: (batch: BatchWithSubjects) => void
}

export function BatchCard({ batch, onSelect, onEdit, onDelete }: BatchCardProps) {
  // Compute unique subject count
  const subjectCount = batch.batch_subjects && batch.batch_subjects.length > 0
    ? new Set(batch.batch_subjects.map((s) => s.subject.trim().toLowerCase())).size
    : batch.subject
    ? 1
    : 0

  const isActive = batch.status === "active"

  return (
    <Card
      onClick={() => onSelect(batch)}
      className="group relative cursor-pointer overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-indigo-500/10 hover:border-indigo-500/50 flex flex-col justify-between h-[155px] border-border/70 bg-card/90 backdrop-blur-sm"
      tabIndex={0}
      role="button"
      aria-label={`View details for ${batch.name}`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onSelect(batch)
        }
      }}
    >
      <CardHeader className="p-4 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1.5 min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Subject Count Badge */}
              <Badge
                variant="secondary"
                className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/50 dark:border-indigo-900/40 py-0.5"
              >
                <BookOpen className="h-3 w-3 mr-1 inline" />
                {subjectCount} {subjectCount === 1 ? "Subject" : "Subjects"}
              </Badge>

              {/* Status Badge */}
              <Badge
                variant="outline"
                className={
                  isActive
                    ? "text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/30 py-0.5"
                    : "text-[10px] text-muted-foreground bg-muted/40 py-0.5"
                }
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full mr-1 ${
                    isActive ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"
                  }`}
                />
                {isActive ? "Active" : "Inactive"}
              </Badge>
            </div>

            {/* Batch Name */}
            <CardTitle
              className="text-base sm:text-lg font-bold group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate pt-0.5"
              title={batch.name}
            >
              {batch.name}
            </CardTitle>
          </div>

          {/* Three-Dot Actions Menu (stopPropagation to avoid triggering card click) */}
          <div onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0 relative z-10"
                  aria-label={`Actions for ${batch.name}`}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={() => onSelect(batch)}>
                  <Eye className="mr-2 h-4 w-4 text-indigo-500" />
                  <span>View Details</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit(batch)}>
                  <Edit2 className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>Edit Details</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete(batch)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span>Delete Batch</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-1">
        <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs">
          {/* Monthly Tuition Fee */}
          <div className="flex items-center gap-1 font-semibold text-foreground">
            <IndianRupee className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{formatCurrency(batch.monthly_fee)} / mo</span>
          </div>

          {/* Enrolled Students */}
          <div className="flex items-center gap-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 text-indigo-600 dark:text-indigo-400 font-medium border border-indigo-200/40 dark:border-indigo-900/40">
            <GraduationCap className="h-3 w-3" />
            <span>{batch.student_count || 0} Enrolled</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
