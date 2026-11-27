import { useQuery } from "@tanstack/react-query"
import {
  Clock,
  GraduationCap,
  Calendar,
} from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/hooks/use-auth"
import { fetchStudentDashboard } from "@/services/student-module"
import { formatCurrency, formatDate } from "@/lib/utils"

export function StudentBatchesPage() {
  const { profile } = useAuth()

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ["student-dashboard", profile?.id],
    queryFn: () => fetchStudentDashboard(profile?.id || ""),
    enabled: !!profile?.id,
  })

  const batches = dashboard?.batches || []

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Classes & Batches"
        description="View your enrolled academic batches, assigned faculty instructors, and class timetables."
        badge={
          <Badge variant="outline" className="border-indigo-400/50 text-indigo-600 dark:text-indigo-400">
            {batches.length} Enrolled Classes
          </Badge>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="h-48 rounded-2xl border border-border/60 bg-card p-6 animate-pulse"
            />
          ))}
        </div>
      ) : batches.length > 0 ? (
        <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
          {batches.map((batch) => (
            <Card
              key={batch.batch_id}
              className="p-4 sm:p-6 space-y-4 hover:border-indigo-500/30 transition-all hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div>
                  <Badge variant="secondary" className="text-xs font-semibold mb-2">
                    {batch.subjects && batch.subjects.length > 0
                      ? `${batch.subjects.length} Subjects Included`
                      : batch.subject}
                  </Badge>
                  <h3 className="text-xl font-bold text-foreground">
                    {batch.batch_name}
                  </h3>
                </div>
                <div className="text-right">
                  <span className="text-xs text-muted-foreground block">Monthly Tuition</span>
                  <span className="text-base font-bold text-foreground">
                    {formatCurrency(batch.monthly_fee)}
                  </span>
                </div>
              </div>

              {/* Subjects & Faculty Timetable */}
              <div className="space-y-2 pt-1">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-indigo-500" />
                  <span>Subjects & Timetable</span>
                </span>

                <div className="space-y-2">
                  {batch.subjects && batch.subjects.length > 0 ? (
                    batch.subjects.map((sub) => (
                      <div
                        key={sub.id}
                        className="p-3 rounded-xl bg-muted/40 border border-border/50 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div className="space-y-0.5">
                          <span className="font-bold text-foreground text-sm">{sub.subject}</span>
                          <span className="text-muted-foreground block text-[11px]">
                            Faculty: {sub.teacher_name || "Faculty Assigned"}
                          </span>
                        </div>
                        <div className="text-right sm:text-right text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                          <span className="bg-indigo-50 dark:bg-indigo-950/60 px-2 py-1 rounded-md border border-indigo-200/50 dark:border-indigo-800/40">
                            {sub.days} • {sub.timing}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 rounded-xl bg-muted/40 border border-border/50 text-xs flex items-center justify-between">
                      <span className="text-muted-foreground">{batch.timing}</span>
                      <span className="font-medium">{batch.teacher_name || "Faculty Assigned"}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-border/50 pt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                  <span>Enrolled: {formatDate(batch.enrolled_at)}</span>
                </div>
                <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30">
                  Tuition Paid Monthly
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={GraduationCap}
          title="No classes assigned yet"
          description="You are currently not enrolled in any active class batch. Please reach out to your coaching institute coordinator."
        />
      )}
    </div>
  )
}
