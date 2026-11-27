import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { format } from "date-fns"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { fetchStudents } from "@/services/students"
import { fetchBatches } from "@/services/batches"
import { createFeeWaiver } from "@/services/fees"
import { toast } from "sonner"
import { ShieldAlert, Users, User } from "lucide-react"

interface WaiveMonthModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialStudentId?: string
  initialBatchId?: string
}

export function WaiveMonthModal({
  open,
  onOpenChange,
  initialStudentId,
  initialBatchId,
}: WaiveMonthModalProps) {
  const queryClient = useQueryClient()

  const [scope, setScope] = useState<"student" | "all">(initialStudentId ? "student" : "student")
  const [studentId, setStudentId] = useState<string>(initialStudentId || "")
  const [batchId, setBatchId] = useState<string>(initialBatchId || "all")
  const [month, setMonth] = useState<string>(format(new Date(), "yyyy-MM"))
  const [reason, setReason] = useState<string>("")

  const { data: students } = useQuery({
    queryKey: ["students"],
    queryFn: fetchStudents,
    enabled: open,
  })

  const { data: batches } = useQuery({
    queryKey: ["batches"],
    queryFn: fetchBatches,
    enabled: open,
  })

  const mutation = useMutation({
    mutationFn: async () => {
      if (scope === "student" && !studentId) {
        throw new Error("Please select a student for the fee waiver")
      }
      if (!month) {
        throw new Error("Please select the waiver month")
      }

      return createFeeWaiver({
        student_id: scope === "student" ? studentId : null,
        batch_id: batchId === "all" ? null : batchId,
        month: `${month}-01`,
        reason: reason.trim() || undefined,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fee-waivers"] })
      queryClient.invalidateQueries({ queryKey: ["pending-dues"] })
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] })
      queryClient.invalidateQueries({ queryKey: ["student-fee-ledger"] })
      queryClient.invalidateQueries({ queryKey: ["student-dashboard"] })
      toast.success(
        scope === "all"
          ? "Fee waiver applied for ALL students"
          : "Fee waiver applied for student"
      )
      onOpenChange(false)
      setReason("")
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create fee waiver")
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-lg p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <ShieldAlert className="h-5 w-5 text-amber-500" />
            <span>Waive Monthly Tuition Fee</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Exempt a student or all students from monthly tuition fees for a specific billing cycle.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Scope Selector */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Waiver Scope *</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setScope("student")}
                className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-medium text-left transition-all ${
                  scope === "student"
                    ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 ring-1 ring-indigo-500"
                    : "border-border/60 hover:bg-muted/50 text-foreground"
                }`}
              >
                <User className="h-4 w-4 shrink-0 text-indigo-500" />
                <div>
                  <div className="font-semibold">Selected Student</div>
                  <div className="text-[10px] text-muted-foreground">Single student exemption</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setScope("all")}
                className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-medium text-left transition-all ${
                  scope === "all"
                    ? "border-amber-600 bg-amber-50/50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 ring-1 ring-amber-500"
                    : "border-border/60 hover:bg-muted/50 text-foreground"
                }`}
              >
                <Users className="h-4 w-4 shrink-0 text-amber-500" />
                <div>
                  <div className="font-semibold">All Students</div>
                  <div className="text-[10px] text-muted-foreground">Institute-wide waiver</div>
                </div>
              </button>
            </div>
          </div>

          {/* Student Selector (if single student) */}
          {scope === "student" && (
            <div className="space-y-1.5">
              <Label htmlFor="w-student">Select Student *</Label>
              <Select value={studentId} onValueChange={setStudentId}>
                <SelectTrigger id="w-student" className="w-full">
                  <SelectValue placeholder="Choose student..." />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {(students || []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.profiles?.full_name || "Student"} ({s.profiles?.email || "No email"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Batch Selector (Optional, default all batches) */}
          <div className="space-y-1.5">
            <Label htmlFor="w-batch">Applicable Class / Batch</Label>
            <Select value={batchId} onValueChange={setBatchId}>
              <SelectTrigger id="w-batch" className="w-full">
                <SelectValue placeholder="All Batches (Institute-wide)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes & Batches</SelectItem>
                {(batches || []).map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name} (₹{b.monthly_fee}/mo)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Select a specific class, or leave as 'All Classes' to waive all enrolled classes.
            </p>
          </div>

          {/* Month Picker */}
          <div className="space-y-1.5">
            <Label htmlFor="w-month">Waiver Month *</Label>
            <Input
              id="w-month"
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              required
            />
          </div>

          {/* Reason (Optional) */}
          <div className="space-y-1.5">
            <Label htmlFor="w-reason">Reason / Notes (Optional)</Label>
            <Input
              id="w-reason"
              placeholder="e.g. Festival holiday, merit scholarship, medical concession"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
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
            <Button
              type="submit"
              disabled={mutation.isPending}
              className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5"
            >
              {mutation.isPending ? "Applying..." : "Grant Fee Waiver"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
