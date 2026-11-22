import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { fetchTeachers } from "@/services/teachers"
import {
  createBatch,
  updateBatch,
  validateTeacherSchedule,
  areDaysOverlapping,
  type BatchFormData,
  type BatchSubjectInput,
} from "@/services/batches"
import { toast } from "sonner"
import type { BatchWithSubjects } from "@/types/database"
import { Plus, Trash2, BookOpen, Clock } from "lucide-react"

interface BatchModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  batchToEdit?: BatchWithSubjects | null
}

const DEFAULT_DAYS_OPTIONS = [
  "Mon-Fri",
  "Mon-Sat",
  "Mon, Wed, Fri",
  "Tue, Thu, Sat",
  "Saturday & Sunday",
  "Daily",
]

const initialSubjectRow = (): BatchSubjectInput => ({
  subject: "",
  teacher_id: "none",
  days: "Mon-Fri",
  start_time: "09:00",
  end_time: "10:30",
})

export function BatchModal({ open, onOpenChange, batchToEdit }: BatchModalProps) {
  const queryClient = useQueryClient()

  const [name, setName] = useState("")
  const [monthlyFee, setMonthlyFee] = useState<string>("500")
  const [status, setStatus] = useState<"active" | "inactive">("active")
  const [subjects, setSubjects] = useState<BatchSubjectInput[]>([initialSubjectRow()])

  // Fetch teachers for dropdown
  const { data: teachers } = useQuery({
    queryKey: ["teachers"],
    queryFn: fetchTeachers,
    enabled: open,
  })

  useEffect(() => {
    if (batchToEdit) {
      setName(batchToEdit.name)
      setMonthlyFee(String(batchToEdit.monthly_fee ?? 0))
      setStatus(batchToEdit.status)

      if (batchToEdit.batch_subjects && batchToEdit.batch_subjects.length > 0) {
        setSubjects(
          batchToEdit.batch_subjects.map((bs) => ({
            id: bs.id,
            subject: bs.subject || "",
            teacher_id: bs.teacher_id || "none",
            days: bs.days || "Mon-Fri",
            start_time: bs.start_time ? bs.start_time.slice(0, 5) : "09:00",
            end_time: bs.end_time ? bs.end_time.slice(0, 5) : "10:30",
          }))
        )
      } else if (batchToEdit.subject) {
        // Fallback for legacy records
        const fallbackDays = batchToEdit.timing ? (batchToEdit.timing.split(" ")[0] || "Mon-Fri") : "Mon-Fri"
        setSubjects([
          {
            subject: batchToEdit.subject,
            teacher_id: batchToEdit.teacher_id || "none",
            days: fallbackDays,
            start_time: "09:00",
            end_time: "10:30",
          },
        ])
      } else {
        setSubjects([initialSubjectRow()])
      }
    } else {
      setName("")
      setMonthlyFee("500")
      setStatus("active")
      setSubjects([initialSubjectRow()])
    }
  }, [batchToEdit, open])

  const handleSubjectChange = (
    index: number,
    field: keyof BatchSubjectInput,
    value: string
  ) => {
    setSubjects((prev) => {
      const next = [...prev]
      const current = next[index]
      if (current) {
        next[index] = { ...current, [field]: value }
      }
      return next
    })
  }

  const addSubjectRow = () => {
    setSubjects((prev) => [
      ...prev,
      {
        subject: "",
        teacher_id: "none",
        days: "Mon-Fri",
        start_time: "11:00",
        end_time: "12:30",
      },
    ])
  }

  const removeSubjectRow = (index: number) => {
    if (subjects.length <= 1) {
      toast.error("A batch must have at least one subject.")
      return
    }
    setSubjects((prev) => prev.filter((_, i) => i !== index))
  }

  const toMinutes = (timeStr: string): number => {
    if (!timeStr) return 0
    const [h, m] = timeStr.split(":").map(Number)
    return (h || 0) * 60 + (m || 0)
  }

  const mutation = useMutation({
    mutationFn: async () => {
      // 1. Basic validation
      if (!name.trim()) {
        throw new Error("Please enter a Batch / Class name (e.g. Class 6)")
      }
      if (subjects.length === 0) {
        throw new Error("Please add at least one subject for this batch")
      }

      // 2. Row level validation
      for (let i = 0; i < subjects.length; i++) {
        const s = subjects[i]
        if (!s) continue
        if (!s.subject.trim()) {
          throw new Error(`Subject name is required for row #${i + 1}`)
        }
        if (!s.start_time || !s.end_time) {
          throw new Error(`Please provide both start and end times for "${s.subject}"`)
        }
        const startMin = toMinutes(s.start_time)
        const endMin = toMinutes(s.end_time)
        if (startMin >= endMin) {
          throw new Error(`Start time (${s.start_time}) must be earlier than end time (${s.end_time}) for "${s.subject}"`)
        }
      }

      // 3. Intra-batch collision check (same teacher overlapping within this same form)
      for (let i = 0; i < subjects.length; i++) {
        const s1 = subjects[i]
        if (!s1) continue
        for (let j = i + 1; j < subjects.length; j++) {
          const s2 = subjects[j]
          if (!s2) continue
          if (
            s1.teacher_id &&
            s1.teacher_id !== "none" &&
            s1.teacher_id === s2.teacher_id
          ) {
            if (areDaysOverlapping(s1.days, s2.days)) {
              const start1 = toMinutes(s1.start_time)
              const end1 = toMinutes(s1.end_time)
              const start2 = toMinutes(s2.start_time)
              const end2 = toMinutes(s2.end_time)
              const overlaps = !(end1 <= start2 || start1 >= end2)
              if (overlaps) {
                const teacherObj = (teachers || []).find((t) => t.id === s1.teacher_id)
                const teacherName = teacherObj?.profiles?.full_name || "The selected teacher"
                throw new Error(
                  `Conflict in this class: ${teacherName} has overlapping times between "${s1.subject}" (${s1.start_time}-${s1.end_time}) and "${s2.subject}" (${s2.start_time}-${s2.end_time})`
                )
              }
            }
          }
        }
      }

      // 4. External schedule collision check against other batches
      for (const s of subjects) {
        if (!s) continue
        if (s.teacher_id && s.teacher_id !== "none") {
          const conflict = await validateTeacherSchedule(
            s.teacher_id,
            s.days,
            s.start_time,
            s.end_time,
            s.id, // exclude current subject row if editing
            batchToEdit?.id // exclude current batch
          )
          if (conflict.hasConflict) {
            throw new Error(conflict.message || "Teacher schedule conflict detected.")
          }
        }
      }

      // 5. Build payload & submit
      const payload: BatchFormData = {
        name: name.trim(),
        monthly_fee: Number(monthlyFee) || 0,
        status,
        subjects,
      }

      if (batchToEdit) {
        return updateBatch(batchToEdit.id, payload)
      } else {
        return createBatch(payload)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["batches"] })
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] })
      queryClient.invalidateQueries({ queryKey: ["teachers"] })
      toast.success(batchToEdit ? "Batch updated successfully!" : "Batch created successfully!")
      onOpenChange(false)
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save batch")
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-indigo-600" />
            <span>{batchToEdit ? "Edit Class Batch" : "Create New Class Batch"}</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 py-2">
          {/* Section 1: Basic Class Info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5 sm:col-span-1">
              <Label htmlFor="batch-name" className="text-xs font-semibold">
                Class / Batch Name *
              </Label>
              <Input
                id="batch-name"
                placeholder="e.g. Class 6"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="batch-fee" className="text-xs font-semibold">
                Class Monthly Fee (₹) *
              </Label>
              <Input
                id="batch-fee"
                type="number"
                placeholder="500"
                value={monthlyFee}
                onChange={(e) => setMonthlyFee(e.target.value)}
                required
                min={0}
              />
              <span className="text-[10px] text-muted-foreground block">
                Single fee for the entire class
              </span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Status</Label>
              <Select value={status} onValueChange={(v: "active" | "inactive") => setStatus(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active Class</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Section 2: Subjects & Teachers Repeatable List */}
          <div className="space-y-3 pt-2 border-t border-border/60">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-indigo-500" />
                  <span>Subjects & Faculty Timetable ({subjects.length})</span>
                </h4>
                <p className="text-[11px] text-muted-foreground">
                  Add all subjects taught in this class with their faculty and lecture timings.
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addSubjectRow}
                className="gap-1 text-xs border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Subject</span>
              </Button>
            </div>

            {/* Subject Rows */}
            <div className="space-y-3">
              {subjects.map((sub, index) => (
                <div
                  key={index}
                  className="p-3.5 rounded-xl border border-border/70 bg-card/60 space-y-3 relative group"
                >
                  <div className="flex items-center justify-between border-b border-border/40 pb-2">
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                      Subject #{index + 1}
                    </span>

                    {subjects.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeSubjectRow(index)}
                        className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        title="Remove Subject"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Subject Name */}
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">Subject Name *</Label>
                      <Input
                        placeholder="e.g. Mathematics, English, Hindi"
                        value={sub.subject}
                        onChange={(e) => handleSubjectChange(index, "subject", e.target.value)}
                        required
                        className="h-9 text-xs"
                      />
                    </div>

                    {/* Teacher Dropdown */}
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">Assigned Teacher</Label>
                      <Select
                        value={sub.teacher_id || "none"}
                        onValueChange={(val) => handleSubjectChange(index, "teacher_id", val)}
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="Select teacher" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Teacher Assigned</SelectItem>
                          {(teachers || []).map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.profiles?.full_name || "Teacher"}{" "}
                              {t.subject ? `(${t.subject})` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Days */}
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">Days *</Label>
                      <Select
                        value={sub.days}
                        onValueChange={(val) => handleSubjectChange(index, "days", val)}
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="Select days" />
                        </SelectTrigger>
                        <SelectContent>
                          {DEFAULT_DAYS_OPTIONS.map((opt) => (
                            <SelectItem key={opt} value={opt}>
                              {opt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Start Time */}
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">Start Time *</Label>
                      <Input
                        type="time"
                        value={sub.start_time}
                        onChange={(e) => handleSubjectChange(index, "start_time", e.target.value)}
                        required
                        className="h-9 text-xs"
                      />
                    </div>

                    {/* End Time */}
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">End Time *</Label>
                      <Input
                        type="time"
                        value={sub.end_time}
                        onChange={(e) => handleSubjectChange(index, "end_time", e.target.value)}
                        required
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addSubjectRow}
              className="w-full py-2 text-xs border-dashed border-border gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <Plus className="h-4 w-4" />
              <span>+ Add Another Subject to {name || "Class"}</span>
            </Button>
          </div>

          <DialogFooter className="pt-3 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={mutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[120px]"
            >
              {mutation.isPending
                ? "Saving Class..."
                : batchToEdit
                ? "Update Class"
                : "Create Class Batch"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
