import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import {
  X,
  BookOpen,
  Clock,
  Users,
  GraduationCap,
  IndianRupee,
  Edit2,
  AlertTriangle,
  Phone,
  Search,
  CheckCircle2,
  Power,
  ChevronRight,
  Sparkles,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  fetchBatchStudents,
  toggleBatchStatus,
  groupBatchSubjects,
  formatSlotTiming,
  type BatchStudentItem,
} from "@/services/batches"
import { formatCurrency, formatDate } from "@/lib/utils"
import { toast } from "sonner"
import type { BatchWithSubjects } from "@/types/database"

interface BatchDetailsDrawerProps {
  batch: BatchWithSubjects | null
  open: boolean
  onClose: () => void
  onEdit: (batch: BatchWithSubjects) => void
}

export function BatchDetailsDrawer({
  batch,
  open,
  onClose,
  onEdit,
}: BatchDetailsDrawerProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<"subjects" | "students" | "actions">("subjects")
  const [studentSearch, setStudentSearch] = useState("")

  // Query enrolled students when drawer is open
  const { data: students, isLoading: loadingStudents } = useQuery<BatchStudentItem[]>({
    queryKey: ["batch-students", batch?.id],
    queryFn: () => (batch?.id ? fetchBatchStudents(batch.id) : Promise.resolve([])),
    enabled: open && !!batch?.id,
  })

  // Toggle active/inactive mutation
  const toggleMutation = useMutation({
    mutationFn: () => {
      if (!batch) throw new Error("No batch selected")
      return toggleBatchStatus(batch.id, batch.status)
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["batches"] })
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] })
      const newStatus = (updated as any)?.status || (batch?.status === "active" ? "inactive" : "active")
      toast.success(
        `Batch "${batch?.name}" is now ${newStatus === "active" ? "active" : "inactive"}.`
      )
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update batch status")
    },
  })

  if (!batch) return null

  // Group multiple timetable slots per subject
  const groupedSubjects = groupBatchSubjects(batch.batch_subjects || [])
  const subjectCount = groupedSubjects.length || (batch.subject ? 1 : 0)
  const isActive = batch.status === "active"

  // Count unassigned subjects
  const unassignedCount = (batch.batch_subjects || []).filter(
    (s) => !s.teacher_id || s.teacher_id === "none"
  ).length

  // Filter students by local search
  const filteredStudents = (students || []).filter((s) => {
    const q = studentSearch.toLowerCase().trim()
    if (!q) return true
    return (
      s.full_name.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      s.phone.toLowerCase().includes(q) ||
      (s.guardian_name || "").toLowerCase().includes(q)
    )
  })

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogPrimitive.Portal>
        {/* Backdrop Overlay */}
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs transition-opacity duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />

        {/* Slide-over Drawer Content */}
        <DialogPrimitive.Content
          className="fixed inset-y-0 right-0 z-50 w-full sm:max-w-xl md:max-w-2xl bg-card border-l border-border/80 shadow-2xl p-0 flex flex-col data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right duration-300 focus:outline-none h-full"
          aria-label={`Batch details for ${batch.name}`}
        >
          {/* Header Banner */}
          <div className="p-4 sm:p-6 border-b border-border/70 bg-gradient-to-r from-card to-muted/20 relative shrink-0">
            {/* Top row: Badges + Action Buttons */}
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Active / Inactive Badge */}
                <Badge
                  variant="outline"
                  className={
                    isActive
                      ? "text-xs font-semibold text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-50/70 dark:bg-emerald-950/40"
                      : "text-xs font-semibold text-muted-foreground bg-muted/50"
                  }
                >
                  <span
                    className={`h-2 w-2 rounded-full mr-1.5 ${
                      isActive ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"
                    }`}
                  />
                  {isActive ? "Active Batch" : "Inactive Batch"}
                </Badge>

                {/* Subject Count Badge */}
                <Badge
                  variant="secondary"
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/50 dark:border-indigo-900/50"
                >
                  <BookOpen className="h-3 w-3 mr-1 inline" />
                  {subjectCount} {subjectCount === 1 ? "Subject" : "Subjects"}
                </Badge>

                {/* Faculty Unassigned Warning Pill */}
                {unassignedCount > 0 && (
                  <Badge
                    variant="outline"
                    className="text-xs font-semibold text-amber-600 dark:text-amber-400 border-amber-500/40 bg-amber-50/70 dark:bg-amber-950/40"
                  >
                    <AlertTriangle className="h-3 w-3 mr-1 inline" />
                    {unassignedCount} Unassigned Faculty
                  </Badge>
                )}
              </div>

              {/* Header Buttons: Quick Edit + Close */}
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onClose()
                    onEdit(batch)
                  }}
                  className="h-8 gap-1.5 text-xs border-indigo-400/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Edit Batch</span>
                </Button>

                <DialogPrimitive.Close
                  onClick={onClose}
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  aria-label="Close drawer"
                >
                  <X className="h-4 w-4" />
                </DialogPrimitive.Close>
              </div>
            </div>

            {/* Batch Name */}
            <DialogPrimitive.Title className="text-xl sm:text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
              <span className="truncate">{batch.name}</span>
            </DialogPrimitive.Title>

            {/* Metric Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 mt-4">
              {/* Monthly Fee */}
              <div className="p-2.5 rounded-xl border border-border/60 bg-card/60 flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <IndianRupee className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block truncate">
                    Monthly Tuition
                  </span>
                  <span className="text-sm font-bold text-foreground">
                    {formatCurrency(batch.monthly_fee)}
                  </span>
                </div>
              </div>

              {/* Total Enrolled */}
              <div className="p-2.5 rounded-xl border border-border/60 bg-card/60 flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <GraduationCap className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block truncate">
                    Enrolled Students
                  </span>
                  <span className="text-sm font-bold text-foreground">
                    {batch.student_count || 0} Students
                  </span>
                </div>
              </div>

              {/* Total Subjects */}
              <div className="p-2.5 rounded-xl border border-border/60 bg-card/60 hidden sm:flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
                  <BookOpen className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block truncate">
                    Curriculum
                  </span>
                  <span className="text-sm font-bold text-foreground">
                    {subjectCount} Courses
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="px-4 sm:px-6 pt-3 pb-2 border-b border-border/60 bg-card/40 shrink-0">
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as "subjects" | "students" | "actions")}
              className="w-full"
            >
              <TabsList className="w-full grid grid-cols-3 bg-muted/60 p-1 rounded-xl">
                <TabsTrigger
                  value="subjects"
                  className="gap-1.5 text-xs font-semibold py-1.5"
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>Subjects ({subjectCount})</span>
                </TabsTrigger>
                <TabsTrigger
                  value="students"
                  className="gap-1.5 text-xs font-semibold py-1.5"
                >
                  <Users className="h-3.5 w-3.5" />
                  <span>Students ({students?.length || batch.student_count || 0})</span>
                </TabsTrigger>
                <TabsTrigger
                  value="actions"
                  className="gap-1.5 text-xs font-semibold py-1.5"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Quick Actions</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {/* TAB 1: SUBJECTS & TIMETABLE */}
            {activeTab === "subjects" && (
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-indigo-500" />
                    <span>Subjects & Faculty Timetable</span>
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      onClose()
                      onEdit(batch)
                    }}
                    className="h-7 text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
                  >
                    + Manage Subjects
                  </Button>
                </div>

                {groupedSubjects.length > 0 ? (
                  <div className="space-y-3">
                    {groupedSubjects.map((sub, sIdx) => {
                      const teacherObj = (batch.batch_subjects || []).find(
                        (bs) =>
                          bs.subject.toLowerCase() === sub.subject.toLowerCase() &&
                          bs.teacher_id === sub.teacher_id
                      )
                      const teacherName = teacherObj?.teachers?.profiles?.full_name
                      const teacherEmail = teacherObj?.teachers?.profiles?.email
                      const teacherSubject = teacherObj?.teachers?.subject
                      const hasTeacher = Boolean(teacherName && sub.teacher_id && sub.teacher_id !== "none")

                      return (
                        <div
                          key={sIdx}
                          className={`p-4 rounded-xl border transition-all space-y-3 ${
                            hasTeacher
                              ? "border-border/80 bg-card/80 hover:border-indigo-500/40"
                              : "border-amber-400/50 bg-amber-50/10 dark:bg-amber-950/10 shadow-xs"
                          }`}
                        >
                          {/* Subject Header + Teacher info */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-2.5">
                            <div className="space-y-0.5">
                              <span className="text-base font-bold text-foreground">
                                {sub.subject}
                              </span>
                              {teacherSubject && (
                                <span className="text-[11px] text-muted-foreground block">
                                  Subject Specialization: {teacherSubject}
                                </span>
                              )}
                            </div>

                            {/* Faculty Status */}
                            {hasTeacher ? (
                              <div className="flex items-center gap-2 self-start sm:self-auto bg-muted/40 px-2.5 py-1 rounded-lg border border-border/50">
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src="" />
                                  <AvatarFallback className="text-[10px] bg-indigo-600 text-white font-bold">
                                    {teacherName?.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="text-left">
                                  <span className="text-xs font-semibold text-foreground block leading-tight">
                                    {teacherName}
                                  </span>
                                  {teacherEmail && (
                                    <span className="text-[10px] text-muted-foreground block leading-tight">
                                      {teacherEmail}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              /* Prominent Unassigned Faculty Warning */
                              <div className="flex items-center gap-1.5 self-start sm:self-auto px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400">
                                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                <span className="text-xs font-semibold">
                                  No Faculty Assigned
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Time Slots */}
                          <div className="space-y-1.5">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
                              Scheduled Slots ({sub.slots.length})
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {sub.slots.map((slot, slotIdx) => (
                                <span
                                  key={slotIdx}
                                  className="inline-flex items-center gap-1.5 text-xs text-indigo-700 dark:text-indigo-300 font-medium bg-indigo-50 dark:bg-indigo-950/70 px-2.5 py-1 rounded-lg border border-indigo-200/60 dark:border-indigo-800/50 shadow-xs"
                                >
                                  <Clock className="h-3 w-3 text-indigo-500" />
                                  <span>{formatSlotTiming(slot.days, slot.start_time, slot.end_time)}</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="p-8 text-center rounded-xl border border-dashed border-border/70 space-y-2">
                    <BookOpen className="h-8 w-8 text-muted-foreground/60 mx-auto" />
                    <p className="text-sm font-semibold text-foreground">No subjects added yet</p>
                    <p className="text-xs text-muted-foreground">
                      Click Edit Batch to add academic subjects, assign faculty, and set lecture hours.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        onClose()
                        onEdit(batch)
                      }}
                      className="text-xs mt-2"
                    >
                      + Add First Subject
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: ENROLLED STUDENTS */}
            {activeTab === "students" && (
              <div className="space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-indigo-500" />
                    <span>Enrolled Student Roster ({students?.length || 0})</span>
                  </h4>

                  {/* Filter Search */}
                  {(students || []).length > 0 && (
                    <div className="relative w-full sm:w-56">
                      <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                      <Input
                        placeholder="Search student..."
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                        className="h-8 pl-8 text-xs"
                      />
                    </div>
                  )}
                </div>

                {loadingStudents ? (
                  <div className="space-y-2.5">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-16 rounded-xl border border-border/60 bg-card p-3 animate-pulse"
                      />
                    ))}
                  </div>
                ) : filteredStudents.length > 0 ? (
                  <div className="space-y-2">
                    {filteredStudents.map((stu) => (
                      <div
                        key={stu.enrollment_id}
                        className="p-3 rounded-xl border border-border/70 bg-card/60 hover:bg-muted/30 transition-colors flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar className="h-9 w-9 shrink-0">
                            <AvatarImage src={stu.avatar_url || ""} />
                            <AvatarFallback className="text-xs font-bold bg-indigo-600 text-white">
                              {stu.full_name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <span className="text-sm font-bold text-foreground block truncate">
                              {stu.full_name}
                            </span>
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
                              {stu.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  <span>{stu.phone}</span>
                                </span>
                              )}
                              {stu.guardian_name && (
                                <span className="truncate">
                                  • Guardian: {stu.guardian_name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <Badge
                            variant="outline"
                            className="text-[10px] text-emerald-600 border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/30"
                          >
                            Active
                          </Badge>
                          {stu.enrolled_on && (
                            <span className="text-[10px] text-muted-foreground block mt-1">
                              Enrolled {formatDate(stu.enrolled_on)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center rounded-xl border border-dashed border-border/70 space-y-2">
                    <GraduationCap className="h-8 w-8 text-muted-foreground/60 mx-auto" />
                    <p className="text-sm font-semibold text-foreground">
                      {studentSearch ? "No matching students found" : "No students enrolled yet"}
                    </p>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      {studentSearch
                        ? "Try clearing your search keyword."
                        : `Students enrolled in "${batch.name}" will automatically appear in this roster.`}
                    </p>
                    {!studentSearch && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          onClose()
                          navigate("/admin/students")
                        }}
                        className="text-xs mt-2"
                      >
                        Go to Student Directory
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: QUICK ACTIONS */}
            {activeTab === "actions" && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                  <span>Administrative Actions</span>
                </h4>

                <div className="grid gap-2.5">
                  {/* Action 1: Edit Details */}
                  <button
                    type="button"
                    onClick={() => {
                      onClose()
                      onEdit(batch)
                    }}
                    className="p-3.5 rounded-xl border border-border/70 bg-card hover:bg-muted/40 transition-all flex items-center justify-between text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        <Edit2 className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-foreground block group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          Edit Class Name, Fee & Timetable
                        </span>
                        <span className="text-[11px] text-muted-foreground block">
                          Modify subjects, faculty allocations, and lecture days
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  {/* Action 2: Toggle Active Status */}
                  <button
                    type="button"
                    disabled={toggleMutation.isPending}
                    onClick={() => toggleMutation.mutate()}
                    className="p-3.5 rounded-xl border border-border/70 bg-card hover:bg-muted/40 transition-all flex items-center justify-between text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                          isActive
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        <Power className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-foreground block">
                          {isActive ? "Deactivate Class Batch" : "Activate Class Batch"}
                        </span>
                        <span className="text-[11px] text-muted-foreground block">
                          {isActive
                            ? "Temporarily hide class from active enrollment lists"
                            : "Re-enable batch for active student enrollments"}
                        </span>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {toggleMutation.isPending ? "Updating..." : isActive ? "Active" : "Inactive"}
                    </Badge>
                  </button>

                  {/* Action 3: Manage Enrollments */}
                  <button
                    type="button"
                    onClick={() => {
                      onClose()
                      navigate("/admin/students")
                    }}
                    className="p-3.5 rounded-xl border border-border/70 bg-card hover:bg-muted/40 transition-all flex items-center justify-between text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
                        <Users className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-foreground block group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          Enroll New Student to {batch.name}
                        </span>
                        <span className="text-[11px] text-muted-foreground block">
                          Add a student and attach this class batch
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  {/* Action 4: Fee Ledger */}
                  <button
                    type="button"
                    onClick={() => {
                      onClose()
                      navigate("/admin/fees")
                    }}
                    className="p-3.5 rounded-xl border border-border/70 bg-card hover:bg-muted/40 transition-all flex items-center justify-between text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <IndianRupee className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-foreground block group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          View Batch Fee Collections & Dues
                        </span>
                        <span className="text-[11px] text-muted-foreground block">
                          Check student tuition payments and pending dues
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  {/* Action 5: Attendance */}
                  <button
                    type="button"
                    onClick={() => {
                      onClose()
                      navigate("/admin/attendance")
                    }}
                    className="p-3.5 rounded-xl border border-border/70 bg-card hover:bg-muted/40 transition-all flex items-center justify-between text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-foreground block group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          Batch Attendance Register
                        </span>
                        <span className="text-[11px] text-muted-foreground block">
                          Review daily student attendance records
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Drawer Footer */}
          <div className="p-4 border-t border-border/70 bg-card/60 flex items-center justify-between gap-3 shrink-0">
            <span className="text-xs text-muted-foreground truncate">
              {batch.name} • {formatCurrency(batch.monthly_fee)}/mo
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                className="text-xs"
              >
                Close
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  onClose()
                  onEdit(batch)
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5"
              >
                <Edit2 className="h-3.5 w-3.5" />
                <span>Edit Batch</span>
              </Button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
