import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  CheckCircle2,
  Calendar,
  XCircle,
  Clock,
  Filter,
} from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/hooks/use-auth"
import {
  fetchStudentAttendanceHistory,
  fetchStudentDashboard,
  type StudentAttendanceRecord,
} from "@/services/student-module"
import { formatDate } from "@/lib/utils"

export function StudentAttendancePage() {
  const { profile } = useAuth()
  const [filterBatch, setFilterBatch] = useState<string>("all")

  // 1. Fetch dashboard stats for metrics
  const { data: dashboard } = useQuery({
    queryKey: ["student-dashboard", profile?.id],
    queryFn: () => fetchStudentDashboard(profile?.id || ""),
    enabled: !!profile?.id,
  })

  // 2. Fetch attendance history
  const { data: history, isLoading } = useQuery({
    queryKey: ["student-attendance-history", profile?.id],
    queryFn: () => fetchStudentAttendanceHistory(profile?.id || ""),
    enabled: !!profile?.id,
  })

  const stats = dashboard?.attendance || { total: 0, present: 0, absent: 0, late: 0, percentage: 0 }
  const batches = dashboard?.batches || []

  // Filter records
  const filteredHistory = (history || []).filter((r) => {
    if (filterBatch === "all") return true
    return r.batch_id === filterBatch
  })

  const getStatusBadge = (status: StudentAttendanceRecord["status"]) => {
    switch (status) {
      case "present":
        return (
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-semibold gap-1">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            Present
          </Badge>
        )
      case "late":
        return (
          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 font-semibold gap-1">
            <Clock className="h-3 w-3 text-amber-600" />
            Late
          </Badge>
        )
      case "absent":
        return (
          <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 font-semibold gap-1">
            <XCircle className="h-3 w-3 text-rose-600" />
            Absent
          </Badge>
        )
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance Record & Turnout"
        description="Track your verified class presence, punctuality rate, and day-by-day attendance log."
        badge={
          <Badge variant="outline" className="border-emerald-400/50 text-emerald-600 dark:text-emerald-400">
            {stats.percentage}% Turnout
          </Badge>
        }
      />

      {/* Attendance Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <div className="rounded-2xl border border-border/60 bg-card p-3 sm:p-4 text-center">
          <span className="text-xs text-muted-foreground block font-medium">Classes Held</span>
          <span className="text-xl sm:text-2xl font-bold text-foreground mt-1 block">{stats.total}</span>
        </div>
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3 sm:p-4 text-center">
          <span className="text-xs text-emerald-600 dark:text-emerald-400 block font-medium">Days Present</span>
          <span className="text-xl sm:text-2xl font-bold text-emerald-600 mt-1 block">{stats.present}</span>
        </div>
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3 sm:p-4 text-center">
          <span className="text-xs text-amber-600 dark:text-amber-400 block font-medium">Days Late</span>
          <span className="text-xl sm:text-2xl font-bold text-amber-600 mt-1 block">{stats.late}</span>
        </div>
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-3 sm:p-4 text-center">
          <span className="text-xs text-rose-600 dark:text-rose-400 block font-medium">Days Absent</span>
          <span className="text-xl sm:text-2xl font-bold text-rose-600 mt-1 block">{stats.absent}</span>
        </div>
      </div>

      {/* History Log */}
      {isLoading ? (
        <div className="h-48 rounded-2xl border border-border/60 bg-card p-6 animate-pulse" />
      ) : (history || []).length > 0 ? (
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4 text-indigo-600" />
              <span>Daily Class Log</span>
            </h3>

            {/* Filter by Batch */}
            {batches.length > 1 && (
              <div className="flex items-center gap-2">
                <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                <Select value={filterBatch} onValueChange={setFilterBatch}>
                  <SelectTrigger className="h-8 text-xs w-44">
                    <SelectValue placeholder="All Batches" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Batches</SelectItem>
                    {batches.map((b) => (
                      <SelectItem key={b.batch_id} value={b.batch_id}>
                        {b.batch_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[360px]">
              <thead className="bg-muted/40 border-b border-border/60 text-xs font-semibold text-muted-foreground uppercase">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Batch / Class</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-accent/40 transition-colors">
                    <td className="py-3 px-4 font-medium text-foreground">
                      {formatDate(item.date)}
                    </td>
                    <td className="py-3 px-4 text-xs text-muted-foreground">
                      {item.batch_name}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {getStatusBadge(item.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <EmptyState
          icon={CheckCircle2}
          title="No attendance logged yet"
          description="Your instructors have not recorded attendance for your classes yet. Records will appear here as soon as classes are marked."
        />
      )}
    </div>
  )
}

