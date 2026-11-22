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
    <div className="space-y-6 w-full max-w-full min-w-0">
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
            className="w-full sm:w-auto gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-xs sm:text-sm shrink-0"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span className="truncate">Mark Attendance for {activeBatch.name}</span>
          </Button>
        )}
      </PageHeader>

      {batchesLoading ? (
        <div className="h-48 rounded-2xl border border-border/60 bg-card p-6 animate-pulse" />
      ) : batches.length > 0 ? (
        <div className="grid gap-6 lg:grid-cols-12 w-full max-w-full min-w-0">
          {/* Batches Selector List (4 cols) */}
          <div className="lg:col-span-4 space-y-3 w-full max-w-full min-w-0">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">
              Select Batch
            </h3>
            {batches.map((batch) => {
              const isSelected = activeBatch?.id === batch.id
              return (
                <div
                  key={batch.id}
                  onClick={() => setSelectedBatch(batch)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all w-full max-w-full min-w-0 ${
                    isSelected
                      ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 shadow-sm"
                      : "border-border/60 bg-card hover:border-indigo-500/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 min-w-0">
                    <div className="space-y-1.5 flex-1 pr-1 min-w-0">
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
                      <h4 className="font-bold text-sm text-foreground truncate">
                        {batch.name}
                      </h4>
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5 min-w-0">
                        <Clock className="h-3 w-3 text-indigo-500 shrink-0" />
                        <span className="truncate">{batch.schedule_summary || batch.timing}</span>
                      </p>
                    </div>

                    <Badge
                      variant={isSelected ? "default" : "outline"}
                      className="text-[11px] font-semibold shrink-0"
                    >
                      {batch.student_count} Students
                    </Badge>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Student Roster Table / Cards for Selected Batch (8 cols) */}
          <div className="lg:col-span-8 space-y-3 w-full max-w-full min-w-0">
            <div className="flex items-center justify-between px-1 gap-2 min-w-0">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider truncate">
                Student Roster: {activeBatch?.name}
              </h3>
              <span className="text-xs text-muted-foreground shrink-0">
                {roster?.length || 0} enrolled
              </span>
            </div>

            <Card className="w-full max-w-full min-w-0 overflow-hidden">
              {rosterLoading ? (
                <div className="p-8 space-y-3 animate-pulse">
                  <div className="h-4 w-32 bg-muted/60 rounded" />
                  <div className="h-10 bg-muted/40 rounded-xl" />
                  <div className="h-10 bg-muted/40 rounded-xl" />
                </div>
              ) : (roster || []).length > 0 ? (
                <>
                  {/* Mobile Stacked Cards (Visible on screens < 640px) */}
                  <div className="sm:hidden divide-y divide-border/40 w-full max-w-full min-w-0">
                    {(roster || []).map((student) => (
                      <div key={student.id} className="p-3.5 space-y-2.5 w-full max-w-full min-w-0">
                        <div className="flex items-start justify-between gap-2 min-w-0">
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <Avatar className="h-9 w-9 shrink-0 ring-2 ring-indigo-500/20">
                              <AvatarFallback>
                                {getInitials(student.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-foreground text-sm truncate">
                                {student.full_name}
                              </p>
                              <p className="text-[11px] text-muted-foreground break-all">
                                {student.email}
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span
                              className={`font-mono text-xs font-bold px-2 py-0.5 rounded-full inline-block ${
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
                              {student.presentDays}/{student.totalDays} sessions
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-border/30 w-full min-w-0">
                          <div className="min-w-0">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-0.5">
                              Contact
                            </span>
                            {student.phone ? (
                              <a
                                href={`tel:${student.phone}`}
                                className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium truncate"
                              >
                                <Phone className="h-3 w-3 shrink-0" />
                                <span className="truncate">{student.phone}</span>
                              </a>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-0.5">
                              Guardian
                            </span>
                            <p className="font-medium text-foreground truncate">
                              {student.guardian_name || "—"}
                            </p>
                            {student.guardian_phone && (
                              <a
                                href={`tel:${student.guardian_phone}`}
                                className="text-muted-foreground hover:text-foreground text-[11px] truncate block"
                              >
                                {student.guardian_phone}
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop / Tablet Table View (Visible on screens >= 640px) */}
                  <div className="hidden sm:block overflow-x-auto w-full max-w-full min-w-0">
                    <table className="w-full text-left text-sm min-w-[520px]">
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
                              <div className="flex items-center gap-3 min-w-0">
                                <Avatar className="h-9 w-9 ring-2 ring-indigo-500/20 shrink-0">
                                  <AvatarFallback>
                                    {getInitials(student.full_name)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <p className="font-semibold text-foreground text-sm truncate">
                                    {student.full_name}
                                  </p>
                                  <p className="text-[11px] text-muted-foreground break-all">
                                    {student.email}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="py-3 px-4 text-xs text-muted-foreground">
                              {student.phone ? (
                                <a
                                  href={`tel:${student.phone}`}
                                  className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 hover:underline"
                                >
                                  <Phone className="h-3 w-3 shrink-0" />
                                  <span>{student.phone}</span>
                                </a>
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
                                className={`font-mono text-xs font-bold px-2 py-0.5 rounded-full inline-block ${
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
                </>
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
