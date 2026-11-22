import { useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import {
  Calendar,
  Clock,
  BookOpen,
  Layers,
  Users,
  CheckCircle2,
  Sparkles,
} from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/hooks/use-auth"
import { fetchTeacherWeeklySchedule } from "@/services/teacher-module"

const DAYS_OF_WEEK = ["All", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

export function TeacherSchedulePage() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [selectedDay, setSelectedDay] = useState("All")

  const { data: scheduleSlots, isLoading } = useQuery({
    queryKey: ["teacher-weekly-schedule", profile?.id],
    queryFn: () => fetchTeacherWeeklySchedule(profile?.id || ""),
    enabled: !!profile?.id,
  })

  const slots = scheduleSlots || []

  // Filter slots based on selected day
  const displayedSlots = useMemo(() => {
    if (selectedDay === "All") return slots
    return slots.filter((slot) => slot.dayList.includes(selectedDay))
  }, [slots, selectedDay])

  // Count unique batches
  const uniqueBatches = useMemo(() => {
    return new Set(slots.map((s) => s.batch_id)).size
  }, [slots])

  return (
    <div className="space-y-6 w-full max-w-full min-w-0">
      <PageHeader
        title="Weekly Lecture Timetable"
        description="Your scheduled teaching periods, room allocations, and quick daily attendance logs."
        badge={
          <Badge variant="outline" className="border-indigo-400/40 text-indigo-600 dark:text-indigo-400">
            {slots.length} Classes
          </Badge>
        }
      >
        <Button
          onClick={() => navigate("/teacher/attendance")}
          className="w-full sm:w-auto gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-xs sm:text-sm shrink-0"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>Mark Today's Attendance</span>
        </Button>
      </PageHeader>

      {/* Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 w-full max-w-full min-w-0">
        <Card className="p-4 border-border/60 bg-card/60 backdrop-blur-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Classes
            </span>
            <p className="text-2xl font-bold text-foreground">{slots.length}</p>
            <p className="text-[11px] text-muted-foreground">Subject sessions</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Calendar className="h-5 w-5" />
          </div>
        </Card>

        <Card className="p-4 border-border/60 bg-card/60 backdrop-blur-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Assigned Batches
            </span>
            <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">
              {uniqueBatches}
            </p>
            <p className="text-[11px] text-muted-foreground">Active class groups</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
            <Layers className="h-5 w-5" />
          </div>
        </Card>

        <Card className="p-4 border-border/60 bg-card/60 backdrop-blur-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Schedule Status
            </span>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">Active</p>
            <p className="text-[11px] text-muted-foreground">Regular academic term</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Sparkles className="h-5 w-5" />
          </div>
        </Card>
      </div>

      {/* Day Selector Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full no-scrollbar">
        {DAYS_OF_WEEK.map((day) => {
          const isActive = selectedDay === day
          return (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-sm"
                  : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/50"
              }`}
            >
              {day}
            </button>
          )
        })}
      </div>

      {/* Lecture Slots List */}
      {isLoading ? (
        <div className="space-y-3 w-full max-w-full min-w-0">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-28 rounded-2xl border border-border/60 bg-card p-4 animate-pulse"
            />
          ))}
        </div>
      ) : displayedSlots.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 w-full max-w-full min-w-0">
          {displayedSlots.map((slot) => (
            <Card
              key={slot.id}
              className="p-5 flex flex-col justify-between hover:border-indigo-500/30 transition-all shadow-sm w-full max-w-full min-w-0"
            >
              <div className="space-y-3 w-full min-w-0">
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <Badge
                    variant="outline"
                    className="text-xs bg-indigo-50/50 dark:bg-indigo-950/40 border-indigo-400/50 text-indigo-600 dark:text-indigo-400 truncate"
                  >
                    <BookOpen className="h-3 w-3 mr-1 shrink-0" />
                    <span className="truncate">{slot.subject}</span>
                  </Badge>

                  <span className="text-xs font-mono text-muted-foreground flex items-center gap-1 shrink-0">
                    <Clock className="h-3 w-3 text-indigo-500 shrink-0" />
                    <span>{slot.timeFormatted}</span>
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-base text-foreground truncate">
                    {slot.batch_name}
                  </h3>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                    <Users className="h-3 w-3 text-muted-foreground/70 shrink-0" />
                    <span>{slot.student_count} Students Enrolled</span>
                  </p>
                </div>

                <div className="flex flex-wrap gap-1 pt-1">
                  {slot.dayList.map((d) => (
                    <span
                      key={d}
                      className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-muted/60 text-muted-foreground"
                    >
                      {d.slice(0, 3)}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-4 mt-2 border-t border-border/40 w-full min-w-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(`/teacher/attendance?batchId=${slot.batch_id}`)}
                  className="w-full gap-2 text-xs hover:border-indigo-400 hover:text-indigo-600"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-indigo-500" />
                  <span>Mark Attendance</span>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Calendar}
          title="No lectures scheduled"
          description={
            selectedDay === "All"
              ? "You do not have any classes or timetables configured yet. Please check with your institute administrator."
              : `No classes scheduled on ${selectedDay}. Choose another day or view all days.`
          }
        />
      )}
    </div>
  )
}
