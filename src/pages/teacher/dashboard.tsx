import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import {
  Layers,
  Users,
  CheckCircle2,
  Clock,
  ArrowRight,
  Bell,
  Sparkles,
  CalendarDays,
} from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { StatCard } from "@/components/shared/stat-card"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/hooks/use-auth"
import { fetchTeacherDashboard } from "@/services/teacher-module"
import { formatDate } from "@/lib/utils"
import { format } from "date-fns"

export function TeacherDashboardPage() {
  const navigate = useNavigate()
  const { profile } = useAuth()

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ["teacher-dashboard", profile?.id],
    queryFn: () => fetchTeacherDashboard(profile?.id || ""),
    enabled: !!profile?.id,
  })

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-muted/60 rounded" />
        <div className="grid grid-cols-3 gap-4">
          <div className="h-28 bg-card rounded-2xl border" />
          <div className="h-28 bg-card rounded-2xl border" />
          <div className="h-28 bg-card rounded-2xl border" />
        </div>
        <div className="h-64 bg-card rounded-2xl border" />
      </div>
    )
  }

  const [viewTab, setViewTab] = useState<"today" | "all">("today")
  const todayDayName = format(new Date(), "EEEE")

  const { teacher, batches, totalStudents, todayAttendanceStats, recentAnnouncements, todayLectures } =
    dashboard || {
      teacher: null,
      batches: [],
      totalStudents: 0,
      todayAttendanceStats: { markedBatches: 0, totalBatches: 0 },
      recentAnnouncements: [],
      todayLectures: [],
    }

  const allMarkedToday =
    todayAttendanceStats.totalBatches > 0 &&
    todayAttendanceStats.markedBatches >= todayAttendanceStats.totalBatches

  return (
    <div className="space-y-6 w-full max-w-full min-w-0">
      <PageHeader
        title={`Welcome, ${profile?.full_name?.split(" ")[0] || "Faculty"}! 👨‍🏫`}
        description={
          teacher?.subject
            ? `Specialization in ${teacher.subject} • ${batches.length} active classes assigned`
            : "Review your active batches, student rosters, and log daily lecture attendance."
        }
        badge={
          <Badge variant="outline" className="border-indigo-400/50 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/50">
            Faculty Space
          </Badge>
        }
      >
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Button
            onClick={() => navigate("/teacher/schedule")}
            variant="outline"
            className="w-full sm:w-auto gap-2 text-xs sm:text-sm"
          >
            <Clock className="h-4 w-4 text-indigo-500" />
            <span>My Timetable</span>
          </Button>
          <Button
            onClick={() => navigate("/teacher/attendance")}
            className="w-full sm:w-auto gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 shadow-md text-xs sm:text-sm"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>Mark Daily Attendance</span>
          </Button>
        </div>
      </PageHeader>

      {/* Metric Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3 w-full max-w-full min-w-0">
        <div onClick={() => navigate("/teacher/batches")} className="cursor-pointer">
          <StatCard
            title="Assigned Batches"
            value={batches.length}
            description="Active teaching classes"
            icon={Layers}
            delay={0}
          />
        </div>

        <div onClick={() => navigate("/teacher/students")} className="cursor-pointer">
          <StatCard
            title="Total Students"
            value={totalStudents}
            description="Across all your batches"
            icon={Users}
            gradient="from-violet-500/10 to-purple-500/10 text-violet-600 dark:text-violet-400"
            delay={0.05}
          />
        </div>

        <div onClick={() => navigate("/teacher/attendance")} className="cursor-pointer">
          <StatCard
            title="Today's Attendance"
            value={`${todayAttendanceStats.markedBatches} of ${todayAttendanceStats.totalBatches}`}
            change={allMarkedToday ? "All Completed" : "Pending Batches"}
            trend={allMarkedToday ? "up" : "down"}
            icon={CheckCircle2}
            gradient="from-emerald-500/10 to-teal-500/10 text-emerald-600 dark:text-emerald-400"
            delay={0.1}
          />
        </div>
      </div>

      {/* Main Grid: My Batches Schedule + Announcements */}
      <div className="grid gap-6 lg:grid-cols-7 w-full max-w-full min-w-0">
        {/* Batches Schedule (4 cols) */}
        <Card className="lg:col-span-4 w-full max-w-full min-w-0 overflow-hidden">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 gap-2">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-indigo-500" />
                <span>My Lectures & Batches</span>
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {viewTab === "today"
                  ? `Lectures scheduled for today (${todayDayName})`
                  : "All active teaching batches and schedules"}
              </p>
            </div>
            <div className="flex items-center gap-1.5 self-start sm:self-auto">
              <div className="flex rounded-lg border border-border/60 p-0.5 bg-muted/40 text-xs">
                <button
                  type="button"
                  onClick={() => setViewTab("today")}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                    viewTab === "today"
                      ? "bg-background text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Today ({todayLectures.length})
                </button>
                <button
                  type="button"
                  onClick={() => setViewTab("all")}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                    viewTab === "all"
                      ? "bg-background text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  All Batches ({batches.length})
                </button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/teacher/batches")}
                className="text-xs gap-1 text-indigo-600 dark:text-indigo-400 h-8"
              >
                <span>Roster</span>
                <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-3 pt-0 w-full max-w-full min-w-0">
            {viewTab === "today" ? (
              todayLectures.length > 0 ? (
                todayLectures.map((lec) => (
                  <div
                    key={lec.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-border/70 bg-indigo-50/20 dark:bg-indigo-950/20 hover:border-indigo-500/40 transition-all w-full max-w-full min-w-0"
                  >
                    <div className="space-y-1 flex-1 pr-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-sm text-foreground truncate">
                          {lec.batch_name}
                        </span>
                        <Badge variant="secondary" className="text-[10px] py-0 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 font-semibold">
                          {lec.subject}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground min-w-0">
                        <span className="flex items-center gap-1 font-medium text-foreground min-w-0">
                          <Clock className="h-3 w-3 text-indigo-500 shrink-0" />
                          <span className="truncate">{lec.timeFormatted}</span>
                        </span>
                        <span>•</span>
                        <span className="shrink-0">{lec.student_count} Students</span>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      className="h-8 gap-1.5 text-xs w-full sm:w-auto shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white"
                      onClick={() => navigate(`/teacher/attendance?batchId=${lec.batch_id}`)}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Take Attendance</span>
                    </Button>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-sm text-muted-foreground space-y-2">
                  <div className="h-10 w-10 mx-auto rounded-full bg-muted/60 flex items-center justify-center">
                    <CalendarDays className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="font-semibold text-foreground">No lectures scheduled for today ({todayDayName})</p>
                  <p className="text-xs text-muted-foreground">
                    You have no scheduled classes on {todayDayName}.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewTab("all")}
                    className="text-xs mt-1"
                  >
                    View All {batches.length} Assigned Batches
                  </Button>
                </div>
              )
            ) : batches.length > 0 ? (
              batches.map((batch) => (
                <div
                  key={batch.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-border/60 bg-muted/20 hover:border-indigo-500/30 transition-all w-full max-w-full min-w-0"
                >
                  <div className="space-y-1.5 flex-1 pr-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-sm text-foreground truncate">
                        {batch.name}
                      </span>
                      {batch.teacher_subjects && batch.teacher_subjects.length > 0 ? (
                        batch.teacher_subjects.map((ts) => (
                          <Badge key={ts.id} variant="secondary" className="text-[10px] py-0 text-indigo-600 dark:text-indigo-400">
                            {ts.subject} {ts.start_time && ts.end_time ? `(${ts.start_time.slice(0, 5)}-${ts.end_time.slice(0, 5)})` : ""}
                          </Badge>
                        ))
                      ) : (
                        <Badge variant="secondary" className="text-[10px] py-0">
                          {batch.subject}
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-muted-foreground min-w-0">
                      <span className="flex items-center gap-1 min-w-0">
                        <Clock className="h-3 w-3 text-indigo-500 shrink-0" />
                        <span className="truncate">{batch.schedule_summary || batch.timing}</span>
                      </span>
                      <span>•</span>
                      <span className="shrink-0">{batch.student_count} Students Enrolled</span>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5 text-xs w-full sm:w-auto shrink-0 hover:border-indigo-400 hover:text-indigo-600"
                    onClick={() => navigate(`/teacher/attendance?batchId=${batch.id}`)}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Attendance</span>
                  </Button>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-sm text-muted-foreground space-y-1">
                <p>No batches assigned to your faculty profile yet.</p>
                <p className="text-xs text-muted-foreground/80">
                  The administrator will allocate batches to you from the Admin panel.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notices & Announcements (3 cols) */}
        <Card className="lg:col-span-3 flex flex-col justify-between w-full max-w-full min-w-0 overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Bell className="h-4 w-4 text-indigo-500 shrink-0" />
                <span>Institute Notices</span>
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/teacher/announcements")}
                className="text-xs text-indigo-600 dark:text-indigo-400"
              >
                <span>View All</span>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Updates for teachers and students
            </p>
          </CardHeader>

          <CardContent className="space-y-3 pt-0 w-full max-w-full min-w-0">
            {recentAnnouncements.length > 0 ? (
              recentAnnouncements.slice(0, 3).map((notice) => (
                <div
                  key={notice.id}
                  className="p-3.5 rounded-xl border border-border/50 bg-card space-y-1.5 w-full max-w-full min-w-0"
                >
                  <div className="flex items-center justify-between text-xs gap-2">
                    <span className="font-semibold text-foreground truncate flex-1">
                      {notice.title}
                    </span>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {formatDate(notice.created_at)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed break-words">
                    {notice.content}
                  </p>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-xs text-muted-foreground">
                No active announcements at this time.
              </div>
            )}

            <Button
              variant="outline"
              onClick={() => navigate("/teacher/announcements")}
              className="w-full text-xs h-9 gap-1.5 mt-2"
            >
              <Sparkles className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
              <span>Broadcast Notice to My Students</span>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
