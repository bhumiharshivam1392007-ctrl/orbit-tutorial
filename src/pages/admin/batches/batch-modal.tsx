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
  areTimesOverlapping,
  timeStringToMinutes,
  groupBatchSubjects,
  DAY_OPTIONS,
  DAY_PRESETS,
  type BatchFormData,
  type BatchSubjectFormItem,
  type SubjectTimeSlot,
} from "@/services/batches"
import { toast } from "sonner"
import type { BatchWithSubjects } from "@/types/database"
import { Plus, Trash2, BookOpen, Clock } from "lucide-react"

interface BatchModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  batchToEdit?: BatchWithSubjects | null
}

const initialSlot = (): SubjectTimeSlot => ({
  days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
  start_time: "09:00",
  end_time: "10:30",
})

const initialSubjectItem = (): BatchSubjectFormItem => ({
  subject: "",
  teacher_id: "none",
  slots: [initialSlot()],
})

export function BatchModal({ open, onOpenChange, batchToEdit }: BatchModalProps) {
  const queryClient = useQueryClient()

  const [name, setName] = useState("")
  const [monthlyFee, setMonthlyFee] = useState<string>("500")
  const [status, setStatus] = useState<"active" | "inactive">("active")
  const [subjects, setSubjects] = useState<BatchSubjectFormItem[]>([initialSubjectItem()])

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
        const grouped = groupBatchSubjects(batchToEdit.batch_subjects)
        setSubjects(grouped.length > 0 ? grouped : [initialSubjectItem()])
      } else if (batchToEdit.subject) {
        // Fallback for legacy single-subject records
        const fallbackDays = batchToEdit.timing ? batchToEdit.timing.split(" ")[0] || "Mon-Fri" : "Mon-Fri"
        setSubjects([
          {
            subject: batchToEdit.subject,
            teacher_id: batchToEdit.teacher_id || "none",
            slots: [
              {
                days: fallbackDays.includes("Mon") ? ["Mon", "Tue", "Wed", "Thu", "Fri"] : ["Mon", "Tue", "Wed", "Thu", "Fri"],
                start_time: "09:00",
                end_time: "10:30",
              },
            ],
          },
        ])
      } else {
        setSubjects([initialSubjectItem()])
      }
    } else {
      setName("")
      setMonthlyFee("500")
      setStatus("active")
      setSubjects([initialSubjectItem()])
    }
  }, [batchToEdit, open])

  // Subject level handlers
  const handleSubjectNameChange = (subIndex: number, value: string) => {
    setSubjects((prev) => {
      const next = [...prev]
      const cur = next[subIndex]
      if (cur) next[subIndex] = { ...cur, subject: value }
      return next
    })
  }

  const handleTeacherChange = (subIndex: number, teacherId: string) => {
    setSubjects((prev) => {
      const next = [...prev]
      const cur = next[subIndex]
      if (cur) next[subIndex] = { ...cur, teacher_id: teacherId }
      return next
    })
  }

  const addSubjectRow = () => {
    setSubjects((prev) => [
      ...prev,
      {
        subject: "",
        teacher_id: "none",
        slots: [
          {
            days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
            start_time: "11:00",
            end_time: "12:30",
          },
        ],
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

  // Slot level handlers
  const addSlot = (subIndex: number) => {
    setSubjects((prev) => {
      const next = [...prev]
      const cur = next[subIndex]
      if (cur) {
        next[subIndex] = {
          ...cur,
          slots: [
            ...cur.slots,
            {
              days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
              start_time: "09:00",
              end_time: "10:30",
            },
          ],
        }
      }
      return next
    })
  }

  const removeSlot = (subIndex: number, slotIndex: number) => {
    setSubjects((prev) => {
      const next = [...prev]
      const cur = next[subIndex]
      if (!cur) return prev
      if (cur.slots.length <= 1) {
        toast.error("A subject must have at least one time slot.")
        return prev
      }
      next[subIndex] = {
        ...cur,
        slots: cur.slots.filter((_, i) => i !== slotIndex),
      }
      return next
    })
  }

  const toggleSlotDay = (subIndex: number, slotIndex: number, dayKey: string) => {
    setSubjects((prev) => {
      const next = [...prev]
      const cur = next[subIndex]
      if (!cur) return prev
      const curSlot = cur.slots[slotIndex]
      if (!curSlot) return prev

      const exists = curSlot.days.includes(dayKey)
      let updatedDays: string[]
      if (exists) {
        updatedDays = curSlot.days.filter((d) => d !== dayKey)
      } else {
        const order = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        updatedDays = [...curSlot.days, dayKey].sort((a, b) => order.indexOf(a) - order.indexOf(b))
      }

      const updatedSlots = [...cur.slots]
      updatedSlots[slotIndex] = { ...curSlot, days: updatedDays }
      next[subIndex] = { ...cur, slots: updatedSlots }
      return next
    })
  }

  const applyPreset = (subIndex: number, slotIndex: number, presetDays: string[]) => {
    setSubjects((prev) => {
      const next = [...prev]
      const cur = next[subIndex]
      if (!cur) return prev
      const curSlot = cur.slots[slotIndex]
      if (!curSlot) return prev

      const updatedSlots = [...cur.slots]
      updatedSlots[slotIndex] = { ...curSlot, days: [...presetDays] }
      next[subIndex] = { ...cur, slots: updatedSlots }
      return next
    })
  }

  const handleSlotTimeChange = (
    subIndex: number,
    slotIndex: number,
    field: "start_time" | "end_time",
    val: string
  ) => {
    setSubjects((prev) => {
      const next = [...prev]
      const cur = next[subIndex]
      if (!cur) return prev
      const curSlot = cur.slots[slotIndex]
      if (!curSlot) return prev

      const updatedSlots = [...cur.slots]
      updatedSlots[slotIndex] = { ...curSlot, [field]: val }
      next[subIndex] = { ...cur, slots: updatedSlots }
      return next
    })
  }

  const mutation = useMutation({
    mutationFn: async () => {
      // 1. Basic batch info validation
      if (!name.trim()) {
        throw new Error("Please enter a Batch / Class name (e.g. Class 6)")
      }
      if (subjects.length === 0) {
        throw new Error("Please add at least one subject for this batch")
      }

      // 2. Validate each subject and slot
      for (let i = 0; i < subjects.length; i++) {
        const s = subjects[i]
        if (!s) continue
        const subjectTitle = s.subject.trim() || `Subject #${i + 1}`

        if (!s.subject.trim()) {
          throw new Error(`Subject name is required for row #${i + 1}`)
        }
        if (s.slots.length === 0) {
          throw new Error(`Please add at least one time slot for "${subjectTitle}"`)
        }

        for (let k = 0; k < s.slots.length; k++) {
          const slot = s.slots[k]
          if (!slot) continue
          if (!slot.days || slot.days.length === 0) {
            throw new Error(`Please select at least one day for "${subjectTitle}" (Slot #${k + 1})`)
          }
          if (!slot.start_time || !slot.end_time) {
            throw new Error(`Please provide both start and end times for "${subjectTitle}" (Slot #${k + 1})`)
          }
          const sMin = timeStringToMinutes(slot.start_time)
          const eMin = timeStringToMinutes(slot.end_time)
          if (sMin >= eMin) {
            throw new Error(
              `Start time (${slot.start_time}) must be earlier than end time (${slot.end_time}) for "${subjectTitle}" (Slot #${k + 1})`
            )
          }
        }

        // 3. Intra-subject overlap check (between slots of the same subject)
        for (let a = 0; a < s.slots.length; a++) {
          const slotA = s.slots[a]
          if (!slotA) continue
          for (let b = a + 1; b < s.slots.length; b++) {
            const slotB = s.slots[b]
            if (!slotB) continue

            if (areDaysOverlapping(slotA.days, slotB.days)) {
              if (areTimesOverlapping(slotA.start_time, slotA.end_time, slotB.start_time, slotB.end_time)) {
                const commonDays = slotA.days.filter((d) => slotB.days.includes(d)).join(", ")
                throw new Error(
                  `Conflict in "${subjectTitle}": Slot #${a + 1} (${slotA.start_time}-${slotA.end_time}) and Slot #${b + 1} (${slotB.start_time}-${slotB.end_time}) overlap on ${commonDays}.`
                )
              }
            }
          }
        }
      }

      // 4. Intra-batch teacher collision check (same teacher assigned to multiple subjects in this batch)
      for (let i = 0; i < subjects.length; i++) {
        const s1 = subjects[i]
        if (!s1 || !s1.teacher_id || s1.teacher_id === "none") continue

        for (let j = i + 1; j < subjects.length; j++) {
          const s2 = subjects[j]
          if (!s2 || !s2.teacher_id || s2.teacher_id === "none") continue

          if (s1.teacher_id === s2.teacher_id) {
            for (const slot1 of s1.slots) {
              for (const slot2 of s2.slots) {
                if (areDaysOverlapping(slot1.days, slot2.days)) {
                  if (areTimesOverlapping(slot1.start_time, slot1.end_time, slot2.start_time, slot2.end_time)) {
                    const teacherObj = (teachers || []).find((t) => t.id === s1.teacher_id)
                    const teacherName = teacherObj?.profiles?.full_name || "The selected teacher"
                    const commonDays = slot1.days.filter((d) => slot2.days.includes(d)).join(", ")
                    throw new Error(
                      `Conflict in this class: ${teacherName} is scheduled at overlapping times on ${commonDays} between "${s1.subject}" (${slot1.start_time}-${slot1.end_time}) and "${s2.subject}" (${slot2.start_time}-${slot2.end_time}).`
                    )
                  }
                }
              }
            }
          }
        }
      }

      // 5. External schedule collision check against other batches in the institute
      for (const s of subjects) {
        if (!s || !s.teacher_id || s.teacher_id === "none") continue
        for (let k = 0; k < s.slots.length; k++) {
          const slot = s.slots[k]
          if (!slot) continue

          const conflict = await validateTeacherSchedule(
            s.teacher_id,
            slot.days,
            slot.start_time,
            slot.end_time,
            slot.id, // exclude current slot id if it already existed in DB
            batchToEdit?.id // exclude all rows of current batch to avoid false positives
          )

          if (conflict.hasConflict) {
            throw new Error(conflict.message || `Schedule conflict detected for "${s.subject}" (Slot #${k + 1}).`)
          }
        }
      }

      // 6. Build payload & submit
      const payload: BatchFormData = {
        name: name.trim(),
        monthly_fee: Number(monthlyFee) || 0,
        status,
        subjectItems: subjects,
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
      <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
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
                  Add subjects taught in this class with their faculty and multiple flexible lecture time slots.
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addSubjectRow}
                className="gap-1 text-xs border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Subject</span>
              </Button>
            </div>

            {/* Subject Cards */}
            <div className="space-y-4">
              {subjects.map((sub, subIndex) => (
                <div
                  key={subIndex}
                  className="p-3.5 sm:p-4 rounded-xl border border-border/80 bg-card space-y-3.5 relative shadow-sm"
                >
                  {/* Subject Header */}
                  <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded">
                        Subject #{subIndex + 1}
                      </span>
                      {sub.subject && (
                        <span className="text-xs font-semibold text-foreground truncate max-w-[200px]">
                          {sub.subject}
                        </span>
                      )}
                    </div>

                    {subjects.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeSubjectRow(subIndex)}
                        className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        title="Remove Subject"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>

                  {/* Subject Name & Assigned Teacher */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-foreground">Subject Name *</Label>
                      <Input
                        placeholder="e.g. Mathematics, English, Hindi"
                        value={sub.subject}
                        onChange={(e) => handleSubjectNameChange(subIndex, e.target.value)}
                        required
                        className="h-9 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-foreground">Assigned Teacher</Label>
                      <Select
                        value={sub.teacher_id || "none"}
                        onValueChange={(val) => handleTeacherChange(subIndex, val)}
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

                  {/* Time Slots Section for this Subject */}
                  <div className="space-y-2.5 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <Clock className="h-3 w-3 text-indigo-500" />
                        <span>Schedule Slots ({sub.slots.length})</span>
                      </span>
                    </div>

                    {/* Individual Slot Cards */}
                    <div className="space-y-2.5">
                      {sub.slots.map((slot, slotIndex) => (
                        <div
                          key={slotIndex}
                          className="p-3 rounded-lg border border-border/70 bg-muted/20 space-y-2.5"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-foreground text-[11px]">
                              Time Slot {slotIndex + 1}
                            </span>
                            {sub.slots.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeSlot(subIndex, slotIndex)}
                                className="h-6 px-2 text-[11px] text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-3 w-3 mr-1" />
                                Remove Slot
                              </Button>
                            )}
                          </div>

                          {/* Quick Presets */}
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="text-[10px] text-muted-foreground font-medium mr-1">
                              Quick Presets:
                            </span>
                            {DAY_PRESETS.map((preset) => {
                              const isActive =
                                preset.days.length === slot.days.length &&
                                preset.days.every((d) => slot.days.includes(d))
                              return (
                                <button
                                  key={preset.label}
                                  type="button"
                                  onClick={() => applyPreset(subIndex, slotIndex, preset.days)}
                                  className={`text-[10px] px-2 py-0.5 rounded font-medium transition-colors border ${
                                    isActive
                                      ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                                      : "bg-background hover:bg-muted text-muted-foreground hover:text-foreground border-border/70"
                                  }`}
                                >
                                  {preset.label}
                                </button>
                              )
                            })}
                          </div>

                          {/* Day Toggle Chips */}
                          <div className="space-y-1">
                            <span className="text-[10px] text-muted-foreground block font-medium">
                              Select Days (Click to toggle):
                            </span>
                            <div className="flex flex-wrap items-center gap-1.5">
                              {DAY_OPTIONS.map((d) => {
                                const isSelected = slot.days.includes(d.key)
                                return (
                                  <button
                                    key={d.key}
                                    type="button"
                                    onClick={() => toggleSlotDay(subIndex, slotIndex, d.key)}
                                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all border ${
                                      isSelected
                                        ? "bg-indigo-600 text-white border-indigo-600 shadow-xs ring-1 ring-indigo-500/50"
                                        : "bg-background hover:bg-muted/80 text-foreground border-border/80"
                                    }`}
                                    title={d.full}
                                  >
                                    {d.label}
                                  </button>
                                )
                              })}
                            </div>
                          </div>

                          {/* Slot Start & End Time */}
                          <div className="grid grid-cols-2 gap-3 pt-1">
                            <div className="space-y-1">
                              <Label className="text-[10px] text-muted-foreground">Start Time *</Label>
                              <Input
                                type="time"
                                value={slot.start_time}
                                onChange={(e) =>
                                  handleSlotTimeChange(subIndex, slotIndex, "start_time", e.target.value)
                                }
                                required
                                className="h-8 text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] text-muted-foreground">End Time *</Label>
                              <Input
                                type="time"
                                value={slot.end_time}
                                onChange={(e) =>
                                  handleSlotTimeChange(subIndex, slotIndex, "end_time", e.target.value)
                                }
                                required
                                className="h-8 text-xs"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Add Another Slot Button */}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addSlot(subIndex)}
                      className="w-full text-xs h-8 border-dashed border-indigo-400/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/40 gap-1.5"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>+ Add another time slot for {sub.subject || `Subject #${subIndex + 1}`}</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Another Subject Button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addSubjectRow}
              className="w-full py-2.5 text-xs border-dashed border-border gap-1.5 text-muted-foreground hover:text-foreground"
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
