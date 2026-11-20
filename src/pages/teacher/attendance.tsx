import { useState, useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { format } from "date-fns"
import {
  Layers,
  Save,
  Check,
  X,
  Clock,
} from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/hooks/use-auth"
import {
  fetchTeacherDashboard,
  fetchBatchRoster,
  fetchAttendanceForDate,
  saveBatchAttendance,
} from "@/services/teacher-module"
import { getInitials } from "@/lib/utils"
import { toast } from "sonner"
import type { AttendanceStatus } from "@/types/database"

export function TeacherAttendancePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const { profile } = useAuth()

  const [dateStr, setDateStr] = useState<string>(format(new Date(), "yyyy-MM-dd"))
  const initialBatchId = searchParams.get("batchId") || ""
  const [selectedBatchId, setSelectedBatchId] = useState<string>(initialBatchId)

  // Local state for attendance statuses: student_id -> status
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceStatus>>({})
  const [isDirty, setIsDirty] = useState<boolean>(false)

  // 1. Fetch teacher batches
  const { data: dashboard, isLoading: batchesLoading } = useQuery({
    queryKey: ["teacher-dashboard", profile?.id],
    queryFn: () => fetchTeacherDashboard(profile?.id || ""),
    enabled: !!profile?.id,
  })

  const batches = dashboard?.batches || []

  // Auto-select batch if none selected
  useEffect(() => {
    if (!selectedBatchId && batches.length > 0 && batches[0]) {
      setSelectedBatchId(batches[0].id)
    }
  }, [selectedBatchId, batches])

  // Sync batchId to URL search params
  const handleSelectBatch = (id: string) => {
    setSelectedBatchId(id)
    setSearchParams({ batchId: id })
  }

  // 2. Fetch enrolled students roster for selected batch
  const { data: roster, isLoading: rosterLoading } = useQuery({
    queryKey: ["batch-roster", selectedBatchId],
    queryFn: () => fetchBatchRoster(selectedBatchId),
    enabled: !!selectedBatchId,
  })

  // 3. Fetch existing attendance records for selected batch and date
  const { data: existingAttendance, isLoading: attendanceLoading } = useQuery({
    queryKey: ["batch-attendance-date", selectedBatchId, dateStr],
    queryFn: () => fetchAttendanceForDate(selectedBatchId, dateStr),
    enabled: !!selectedBatchId && !!dateStr,
  })

  // Initialize or populate local attendance state
  useEffect(() => {
    if (!roster) return

    const initial: Record<string, AttendanceStatus> = {}

    for (const student of roster) {
      // If record exists in DB for this date, use it; otherwise default to "present"
      const existingStatus = existingAttendance?.[student.id]
      if (existingStatus) {
        initial[student.id] = existingStatus
      } else {
        initial[student.id] = "present"
      }
    }

    setAttendanceMap(initial)
    setIsDirty(false)
  }, [roster, existingAttendance, selectedBatchId, dateStr])

  // Set individual student status
  const setStudentStatus = (studentId: string, status: AttendanceStatus) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: status,
    }))
    setIsDirty(true)
  }

  // Quick Action: Mark All Present
  const markAllPresent = () => {
    if (!roster) return
    const allPresent: Record<string, AttendanceStatus> = {}
    for (const s of roster) {
      allPresent[s.id] = "present"
    }
    setAttendanceMap(allPresent)
    setIsDirty(true)
    toast.info("All students marked as Present")
  }

  // Save Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!roster || !selectedBatchId) return

      const records = roster.map((s) => ({
        student_id: s.id,
        status: attendanceMap[s.id] || "present",
      }))

      return saveBatchAttendance(
        selectedBatchId,
        dateStr,
        records,
        profile?.id
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["batch-attendance-date", selectedBatchId, dateStr] })
      queryClient.invalidateQueries({ queryKey: ["batch-roster", selectedBatchId] })
      queryClient.invalidateQueries({ queryKey: ["teacher-dashboard", profile?.id] })
      setIsDirty(false)
      toast.success("Attendance successfully saved!")
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save attendance")
    },
  })

  // Attendance metrics calculation
  const totalCount = roster?.length || 0
  const presentCount = Object.values(attendanceMap).filter((s) => s === "present").length
  const absentCount = Object.values(attendanceMap).filter((s) => s === "absent").length
  const lateCount = Object.values(attendanceMap).filter((s) => s === "late").length
  const presentPercent = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0

  const activeBatch = batches.find((b) => b.id === selectedBatchId)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Daily Attendance Register"
        description="Select a class and date to log student presence, absences, and late arrivals."
        badge={
          <Badge variant="outline" className="border-indigo-400/50 text-indigo-600 dark:text-indigo-400">
            {activeBatch ? activeBatch.name : "Attendance Register"}
          </Badge>
        }
      >
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || totalCount === 0}
          className="gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 shadow-md"
        >
          <Save className="h-4 w-4" />
          <span>{saveMutation.isPending ? "Saving..." : isDirty ? "Save Changes *" : "Saved"}</span>
        </Button>
      </PageHeader>

      {/* Control Bar: Batch Selector & Date Picker */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {/* Batch Selector */}
            <div className="space-y-1 sm:w-64">
              <Label className="text-xs text-muted-foreground">Select Batch</Label>
              <Select value={selectedBatchId} onValueChange={handleSelectBatch}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Choose batch..." />
                </SelectTrigger>
                <SelectContent>
                  {batches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name} ({b.timing})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Picker */}
            <div className="space-y-1 sm:w-44">
              <Label className="text-xs text-muted-foreground">Date</Label>
              <div className="relative">
                <Input
                  type="date"
                  value={dateStr}
                  onChange={(e) => setDateStr(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Quick Mark All Action */}
          <div className="flex items-center gap-2 self-start sm:self-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={markAllPresent}
              disabled={totalCount === 0}
              className="h-9 text-xs gap-1.5 border-emerald-500/30 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
            >
              <Check className="h-3.5 w-3.5" />
              <span>Mark All Present</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* Attendance Stats Summary Bar */}
      {totalCount > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="rounded-xl border border-border/60 bg-card p-3 text-center">
            <span className="text-[11px] text-muted-foreground block font-medium">Total Enrolled</span>
            <span className="text-xl font-bold text-foreground">{totalCount}</span>
          </div>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-center">
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 block font-medium">Present</span>
            <span className="text-xl font-bold text-emerald-600">{presentCount}</span>
          </div>
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 text-center">
            <span className="text-[11px] text-rose-600 dark:text-rose-400 block font-medium">Absent</span>
            <span className="text-xl font-bold text-rose-600">{absentCount}</span>
          </div>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-center">
            <span className="text-[11px] text-amber-600 dark:text-amber-400 block font-medium">Late</span>
            <span className="text-xl font-bold text-amber-600">{lateCount}</span>
          </div>
          <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3 text-center">
            <span className="text-[11px] text-indigo-600 dark:text-indigo-400 block font-medium">Turnout</span>
            <span className="text-xl font-bold text-indigo-600">{presentPercent}%</span>
          </div>
        </div>
      )}

      {/* Attendance Register Table */}
      {batchesLoading || rosterLoading || attendanceLoading ? (
        <div className="rounded-2xl border border-border/60 bg-card p-8 animate-pulse space-y-4" />
      ) : totalCount > 0 ? (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40 border-b border-border/60 text-xs font-semibold text-muted-foreground uppercase">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4 text-center">Overall %</th>
                  <th className="py-3 px-4 text-right">Attendance Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {(roster || []).map((student, idx) => {
                  const status = attendanceMap[student.id] || "present"

                  return (
                    <tr key={student.id} className="hover:bg-accent/40 transition-colors">
                      <td className="py-3.5 px-4 text-center text-xs font-mono text-muted-foreground">
                        {idx + 1}
                      </td>

                      <td className="py-3.5 px-4">
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

                      <td className="py-3.5 px-4 text-xs text-muted-foreground">
                        {student.phone || "—"}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="font-mono text-xs font-bold text-foreground">
                          {student.attendanceRate}%
                        </span>
                      </td>

                      {/* 3-way toggle buttons */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex rounded-xl p-1 bg-muted/60 border border-border/40 gap-1">
                          {/* Present */}
                          <button
                            type="button"
                            onClick={() => setStudentStatus(student.id, "present")}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                              status === "present"
                                ? "bg-emerald-600 text-white shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            <Check className="h-3 w-3" />
                            <span>Present</span>
                          </button>

                          {/* Late */}
                          <button
                            type="button"
                            onClick={() => setStudentStatus(student.id, "late")}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                              status === "late"
                                ? "bg-amber-500 text-white shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            <Clock className="h-3 w-3" />
                            <span>Late</span>
                          </button>

                          {/* Absent */}
                          <button
                            type="button"
                            onClick={() => setStudentStatus(student.id, "absent")}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                              status === "absent"
                                ? "bg-rose-600 text-white shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            <X className="h-3 w-3" />
                            <span>Absent</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <EmptyState
          icon={Layers}
          title={batches.length === 0 ? "No batches assigned" : "No students in this batch"}
          description={
            batches.length === 0
              ? "You do not have any teaching classes assigned yet."
              : "There are currently no students enrolled in this batch."
          }
        />
      )}
    </div>
  )
}
