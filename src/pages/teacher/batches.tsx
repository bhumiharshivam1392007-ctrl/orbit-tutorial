import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import {
  Layers,
  Clock,
  CheckCircle2,
  Phone,
  GraduationCap,
} from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useAuth } from "@/hooks/use-auth"
import { fetchTeacherDashboard, fetchBatchRoster, type TeacherBatchItem } from "@/services/teacher-module"
import { getInitials } from "@/lib/utils"

export function TeacherBatchesPage() {
  const navigate = useNavigate()
  const { profile } = useAuth()

  const [selectedBatch, setSelectedBatch] = useState<TeacherBatchItem | null>(null)

  // Fetch teacher's batches
  const { data: dashboard, isLoading: batchesLoading } = useQuery({
    queryKey: ["teacher-dashboard", profile?.id],
    queryFn: () => fetchTeacherDashboard(profile?.id || ""),
    enabled: !!profile?.id,
  })

  const batches = dashboard?.batches || []

  // Auto-select first batch if none selected
  const activeBatch = selectedBatch || (batches.length > 0 ? batches[0] : null)

  // Fetch roster for selected batch
  const { data: roster, isLoading: rosterLoading } = useQuery({
    queryKey: ["batch-roster", activeBatch?.id],
    queryFn: () => fetchBatchRoster(activeBatch!.id),
    enabled: !!activeBatch?.id,
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Batches & Student Rosters"
        description="View class timetables and student enrollment profiles for your assigned courses."
        badge={
          <Badge variant="outline" className="border-indigo-400/40 text-indigo-600 dark:text-indigo-400">
            {batches.length} Batches
          </Badge>
        }
      >
        {activeBatch && (
          <Button
            onClick={() => navigate(`/teacher/attendance?batchId=${activeBatch.id}`)}
            className="gap-2 bg-gradient-to-r from-indigo-600 to-violet-600"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>Mark Attendance for {activeBatch.name}</span>
          </Button>
        )}
      </PageHeader>

      {batchesLoading ? (
        <div className="h-48 rounded-2xl border border-border/60 bg-card p-6 animate-pulse" />
      ) : batches.length > 0 ? (
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Batches Selector List (4 cols) */}
          <div className="lg:col-span-4 space-y-3">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">
              Select Batch
            </h3>
            {batches.map((batch) => {
              const isSelected = activeBatch?.id === batch.id
              return (
                <div
                  key={batch.id}
                  onClick={() => setSelectedBatch(batch)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 shadow-sm"
                      : "border-border/60 bg-card hover:border-indigo-500/30"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1.5 flex-1 pr-2">
                      <div className="flex flex-wrap gap-1">
                        {batch.teacher_subjects && batch.teacher_subjects.length > 0 ? (
                          batch.teacher_subjects.map((ts) => (
                            <Badge key={ts.id} variant="secondary" className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
                              {ts.subject} {ts.start_time && ts.end_time ? `(${ts.start_time.slice(0, 5)}-${ts.end_time.slice(0, 5)})` : ""}
                            </Badge>
                          ))
                        ) : (
                          <Badge variant="secondary" className="text-[10px] font-semibold">
                            {batch.subject}
                          </Badge>
                        )}
                      </div>
                      <h4 className="font-bold text-sm text-foreground">
                        {batch.name}
                      </h4>
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Clock className="h-3 w-3 text-indigo-500 shrink-0" />
                        <span className="truncate">{batch.schedule_summary || batch.timing}</span>
                      </p>
                    </div>

                    <Badge
                      variant={isSelected ? "default" : "outline"}
                      className="text-[11px] font-semibold"
                    >
                      {batch.student_count} Students
                    </Badge>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Student Roster Table for Selected Batch (8 cols) */}
          <div className="lg:col-span-8 space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Student Roster: {activeBatch?.name}
              </h3>
              <span className="text-xs text-muted-foreground">
                {roster?.length || 0} enrolled
              </span>
            </div>

            <Card>
              {rosterLoading ? (
                <div className="p-8 space-y-3 animate-pulse">
                  <div className="h-4 w-32 bg-muted/60 rounded" />
                  <div className="h-10 bg-muted/40 rounded-xl" />
                  <div className="h-10 bg-muted/40 rounded-xl" />
                </div>
              ) : (roster || []).length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-muted/40 border-b border-border/60 text-xs font-semibold text-muted-foreground uppercase">
                      <tr>
                        <th className="py-3 px-4">Student</th>
                        <th className="py-3 px-4">Contact</th>
                        <th className="py-3 px-4">Guardian</th>
                        <th className="py-3 px-4 text-right">Attendance Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {(roster || []).map((student) => (
                        <tr key={student.id} className="hover:bg-accent/40 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9 ring-2 ring-indigo-500/20">
                                <AvatarFallback>
                                  {getInitials(student.full_name)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-semibold text-foreground text-sm">
                                  {student.full_name}
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                  {student.email}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4 text-xs text-muted-foreground">
                            {student.phone ? (
                              <span className="flex items-center gap-1.5">
                                <Phone className="h-3 w-3 text-indigo-500" />
                                {student.phone}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>

                          <td className="py-3 px-4 text-xs">
                            <p className="font-medium text-foreground">
                              {student.guardian_name || "—"}
                            </p>
                            {student.guardian_phone && (
                              <p className="text-[11px] text-muted-foreground">
                                {student.guardian_phone}
                              </p>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right">
                            <span
                              className={`font-mono text-xs font-bold px-2 py-0.5 rounded-full ${
                                student.attendanceRate >= 80
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                  : student.attendanceRate >= 60
                                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                  : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                              }`}
                            >
                              {student.attendanceRate}%
                            </span>
                            <span className="block text-[10px] text-muted-foreground mt-0.5">
                              {student.presentDays} of {student.totalDays} sessions
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-12 text-center text-sm text-muted-foreground">
                  <GraduationCap className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="font-semibold text-foreground">No students enrolled yet</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Students will appear here once the administrator enrolls them into this batch.
                  </p>
                </div>
              )}
            </Card>
          </div>
        </div>
      ) : (
        <EmptyState
          icon={Layers}
          title="No batches assigned yet"
          description="Your administrator has not yet assigned any batches to your profile. Please check back soon."
        />
      )}
    </div>
  )
}
