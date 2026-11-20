import { useQuery } from "@tanstack/react-query"
import {
  Clock,
  User,
  GraduationCap,
  Calendar,
} from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useAuth } from "@/hooks/use-auth"
import { fetchStudentDashboard } from "@/services/student-module"
import { formatCurrency, formatDate, getInitials } from "@/lib/utils"

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
        <div className="grid gap-6 md:grid-cols-2">
          {batches.map((batch) => (
            <Card
              key={batch.batch_id}
              className="p-6 space-y-4 hover:border-indigo-500/30 transition-all hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div>
                  <Badge variant="secondary" className="text-xs font-semibold mb-2">
                    {batch.subject}
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

              {/* Timing */}
              <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/40 border border-border/50 text-xs">
                <Clock className="h-4 w-4 text-indigo-500" />
                <span className="font-semibold text-foreground">Schedule:</span>
                <span className="text-muted-foreground">{batch.timing}</span>
              </div>

              {/* Instructor Information */}
              <div className="border-t border-border/50 pt-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 ring-2 ring-indigo-500/20">
                    <AvatarFallback className="bg-indigo-50 text-indigo-600 font-bold dark:bg-indigo-950 dark:text-indigo-300">
                      {batch.teacher_name ? getInitials(batch.teacher_name) : <User className="h-4 w-4" />}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <span className="text-[11px] text-muted-foreground block">Faculty Instructor</span>
                    <h4 className="text-sm font-bold text-foreground">
                      {batch.teacher_name || "Faculty Assigned"}
                    </h4>
                    {batch.teacher_subject && (
                      <p className="text-xs text-muted-foreground">
                        {batch.teacher_subject} Specialist
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-right text-[11px] text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-indigo-500" />
                  <span>Enrolled: {formatDate(batch.enrolled_at)}</span>
                </div>
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
