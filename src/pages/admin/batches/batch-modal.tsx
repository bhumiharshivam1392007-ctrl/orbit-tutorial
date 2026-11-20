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
import { createBatch, updateBatch, type BatchFormData } from "@/services/batches"
import { toast } from "sonner"
import type { Batch } from "@/types/database"

interface BatchModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  batchToEdit?: Batch | null
}

export function BatchModal({ open, onOpenChange, batchToEdit }: BatchModalProps) {
  const queryClient = useQueryClient()

  const [name, setName] = useState("")
  const [subject, setSubject] = useState("")
  const [timing, setTiming] = useState("")
  const [teacherId, setTeacherId] = useState<string>("none")
  const [monthlyFee, setMonthlyFee] = useState<string>("2000")
  const [status, setStatus] = useState<"active" | "inactive">("active")

  // Fetch teachers for dropdown
  const { data: teachers } = useQuery({
    queryKey: ["teachers"],
    queryFn: fetchTeachers,
    enabled: open,
  })

  useEffect(() => {
    if (batchToEdit) {
      setName(batchToEdit.name)
      setSubject(batchToEdit.subject)
      setTiming(batchToEdit.timing)
      setTeacherId(batchToEdit.teacher_id || "none")
      setMonthlyFee(String(batchToEdit.monthly_fee || 0))
      setStatus(batchToEdit.status)
    } else {
      setName("")
      setSubject("")
      setTiming("Mon-Fri 09:00-10:30")
      setTeacherId("none")
      setMonthlyFee("2500")
      setStatus("active")
    }
  }, [batchToEdit, open])

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: BatchFormData = {
        name: name.trim(),
        subject: subject.trim(),
        timing: timing.trim(),
        teacher_id: teacherId === "none" ? null : teacherId,
        monthly_fee: Number(monthlyFee),
        status,
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
      toast.success(batchToEdit ? "Batch updated successfully!" : "Batch created successfully!")
      onOpenChange(false)
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save batch")
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !subject || !timing) {
      toast.error("Please fill in all required fields")
      return
    }
    mutation.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{batchToEdit ? "Edit Batch" : "Create New Batch"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="batch-name">Batch Name *</Label>
            <Input
              id="batch-name"
              placeholder="e.g. JEE Mathematics Advanced"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="batch-subject">Subject *</Label>
              <Input
                id="batch-subject"
                placeholder="e.g. Mathematics"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="batch-fee">Monthly Fee (₹) *</Label>
              <Input
                id="batch-fee"
                type="number"
                placeholder="2500"
                value={monthlyFee}
                onChange={(e) => setMonthlyFee(e.target.value)}
                required
                min={0}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="batch-timing">Schedule & Timing *</Label>
            <Input
              id="batch-timing"
              placeholder="e.g. Mon-Fri 09:00 - 10:30 AM"
              value={timing}
              onChange={(e) => setTiming(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label>Assigned Teacher</Label>
            <Select value={teacherId} onValueChange={setTeacherId}>
              <SelectTrigger>
                <SelectValue placeholder="Select faculty member" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Teacher Assigned</SelectItem>
                {(teachers || []).map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.profiles?.full_name} ({t.subject || "Faculty"})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={(val: any) => setStatus(val)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving..." : batchToEdit ? "Update Batch" : "Create Batch"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

