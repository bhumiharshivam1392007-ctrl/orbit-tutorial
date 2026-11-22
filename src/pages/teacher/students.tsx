import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  Users2,
  Search,
  Layers,
  Phone,
  GraduationCap,
  AlertCircle,
  CheckCircle2,
} from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/hooks/use-auth"
import { fetchTeacherAllStudents } from "@/services/teacher-module"
import { getInitials } from "@/lib/utils"

export function TeacherStudentsPage() {
  const { profile } = useAuth()
  const [search, setSearch] = useState("")
  const [batchFilter, setBatchFilter] = useState("all")

  const { data, isLoading } = useQuery({
    queryKey: ["teacher-all-students", profile?.id],
    queryFn: () => fetchTeacherAllStudents(profile?.id || ""),
    enabled: !!profile?.id,
  })

  const rawStudents = data?.students || []
  const batches = data?.batches || []

  // Filter students based on search and selected batch
  const filteredStudents = useMemo(() => {
    return rawStudents.filter((student) => {
      const matchesSearch =
        student.full_name.toLowerCase().includes(search.toLowerCase()) ||
        student.email.toLowerCase().includes(search.toLowerCase()) ||
        (student.phone && student.phone.includes(search)) ||
        (student.guardian_name && student.guardian_name.toLowerCase().includes(search.toLowerCase()))

      const matchesBatch = batchFilter === "all" || student.batch_id === batchFilter

      return matchesSearch && matchesBatch
    })
  }, [rawStudents, search, batchFilter])

  // Attendance metrics
  const highAttendanceCount = rawStudents.filter((s) => s.attendanceRate >= 80).length
  const lowAttendanceCount = rawStudents.filter((s) => s.attendanceRate < 60 && s.totalDays > 0).length

  return (
    <div className="space-y-6 w-full max-w-full min-w-0">
      <PageHeader
        title="My Students Directory"
        description="Search, view profiles and check attendance records for all students enrolled across your classes."
        badge={
          <Badge variant="outline" className="border-indigo-400/40 text-indigo-600 dark:text-indigo-400">
            {rawStudents.length} Students
          </Badge>
        }
      />

      {/* Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 w-full max-w-full min-w-0">
        <Card className="p-4 border-border/60 bg-card/60 backdrop-blur-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Enrolled
            </span>
            <p className="text-2xl font-bold text-foreground">{rawStudents.length}</p>
            <p className="text-[11px] text-muted-foreground">Across {batches.length} batches</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Users2 className="h-5 w-5" />
          </div>
        </Card>

        <Card className="p-4 border-border/60 bg-card/60 backdrop-blur-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Good Attendance (&ge;80%)
            </span>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {highAttendanceCount}
            </p>
            <p className="text-[11px] text-muted-foreground">Consistent learners</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </Card>

        <Card className="p-4 border-border/60 bg-card/60 backdrop-blur-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Attention Needed (&lt;60%)
            </span>
            <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">
              {lowAttendanceCount}
            </p>
            <p className="text-[11px] text-muted-foreground">Irregular attendance</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <AlertCircle className="h-5 w-5" />
          </div>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-full min-w-0">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by student name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10 w-full"
          />
        </div>

        <div className="w-full sm:w-56 shrink-0">
          <Select value={batchFilter} onValueChange={setBatchFilter}>
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Filter by Batch" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Batches ({rawStudents.length})</SelectItem>
              {batches.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Student List */}
      <Card className="w-full max-w-full min-w-0 overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-4 animate-pulse">
            <div className="h-5 w-40 bg-muted/60 rounded" />
            <div className="h-12 bg-muted/40 rounded-xl" />
            <div className="h-12 bg-muted/40 rounded-xl" />
            <div className="h-12 bg-muted/40 rounded-xl" />
          </div>
        ) : filteredStudents.length > 0 ? (
          <>
            {/* Mobile Stacked Cards (<640px) */}
            <div className="sm:hidden divide-y divide-border/40 w-full max-w-full min-w-0">
              {filteredStudents.map((student) => (
                <div key={`${student.id}-${student.batch_id}`} className="p-4 space-y-3 w-full max-w-full min-w-0">
                  <div className="flex items-start justify-between gap-2 min-w-0">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <Avatar className="h-10 w-10 shrink-0 ring-2 ring-indigo-500/20">
                        <AvatarFallback>{getInitials(student.full_name)}</AvatarFallback>
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

                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px] py-0 text-indigo-600 dark:text-indigo-400">
                      <Layers className="h-2.5 w-2.5 mr-1" />
                      {student.batch_name}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-border/30 w-full min-w-0">
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-0.5">
                        Student Phone
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

            {/* Desktop Table View (>=640px) */}
            <div className="hidden sm:block overflow-x-auto w-full max-w-full min-w-0">
              <table className="w-full text-left text-sm min-w-[600px]">
                <thead className="bg-muted/40 border-b border-border/60 text-xs font-semibold text-muted-foreground uppercase">
                  <tr>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Batch</th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4">Guardian</th>
                    <th className="py-3 px-4 text-right">Attendance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredStudents.map((student) => (
                    <tr key={`${student.id}-${student.batch_id}`} className="hover:bg-accent/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar className="h-9 w-9 ring-2 ring-indigo-500/20 shrink-0">
                            <AvatarFallback>{getInitials(student.full_name)}</AvatarFallback>
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

                      <td className="py-3 px-4">
                        <Badge variant="outline" className="text-xs bg-indigo-50/50 dark:bg-indigo-950/40 border-indigo-300">
                          {student.batch_name}
                        </Badge>
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
                        <p className="font-medium text-foreground">{student.guardian_name || "—"}</p>
                        {student.guardian_phone && (
                          <p className="text-[11px] text-muted-foreground">{student.guardian_phone}</p>
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
            <p className="font-semibold text-foreground">
              {search || batchFilter !== "all" ? "No matching students found" : "No students enrolled yet"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {search || batchFilter !== "all"
                ? "Try clearing your search query or selecting a different batch filter."
                : "Students will appear here once the administrator assigns them to your batches."}
            </p>
          </div>
        )}
      </Card>
    </div>
  )
}
