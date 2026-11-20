import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { format } from "date-fns"
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
import { fetchStudents } from "@/services/students"
import { fetchBatches } from "@/services/batches"
import { recordFeePayment, type RecordPaymentFormData } from "@/services/fees"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "sonner"
import type { FeePaymentWithDetails } from "@/types/database"

interface RecordPaymentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialStudentId?: string
  initialBatchId?: string
  onPaymentSuccess?: (payment: FeePaymentWithDetails) => void
}

export function RecordPaymentModal({
  open,
  onOpenChange,
  initialStudentId,
  initialBatchId,
  onPaymentSuccess,
}: RecordPaymentModalProps) {
  const queryClient = useQueryClient()
  const { profile } = useAuth()

  const [studentId, setStudentId] = useState<string>(initialStudentId || "")
  const [batchId, setBatchId] = useState<string>(initialBatchId || "")
  const [amount, setAmount] = useState<string>("2500")
  const [paymentMode, setPaymentMode] = useState<"cash" | "upi" | "bank_transfer">("upi")
  const [transactionRef, setTransactionRef] = useState<string>("")
  const [paymentDate, setPaymentDate] = useState<string>(format(new Date(), "yyyy-MM-dd"))
  const [monthLabel, setMonthLabel] = useState<string>(format(new Date(), "MMM yyyy"))
  const [notes, setNotes] = useState<string>("")

  // Fetch students & batches
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

  useEffect(() => {
    if (initialStudentId) setStudentId(initialStudentId)
    if (initialBatchId) setBatchId(initialBatchId)
  }, [initialStudentId, initialBatchId, open])

  // When batch changes, update default amount
  useEffect(() => {
    if (batchId && batches) {
      const selected = batches.find((b) => b.id === batchId)
      if (selected && selected.monthly_fee) {
        setAmount(String(selected.monthly_fee))
      }
    }
  }, [batchId, batches])

  // Get batches available for selected student
  const selectedStudent = (students || []).find((s) => s.id === studentId)
  const studentBatches = selectedStudent
    ? (selectedStudent.enrollments || [])
        .filter((e) => e.status === "active")
        .map((e) => e.batches)
        .filter(Boolean)
    : batches || []

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: RecordPaymentFormData = {
        student_id: studentId,
        batch_id: batchId,
        amount: Number(amount),
        payment_mode: paymentMode,
        transaction_ref: transactionRef.trim() || undefined,
        payment_date: paymentDate,
        month_label: monthLabel.trim(),
        status: "paid",
        notes: notes.trim() || undefined,
      }

      return recordFeePayment(payload, profile?.id)
    },
    onSuccess: (newPayment: any) => {
      queryClient.invalidateQueries({ queryKey: ["fee-payments"] })
      queryClient.invalidateQueries({ queryKey: ["pending-dues"] })
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] })
      toast.success("Payment recorded successfully!")
      onOpenChange(false)
      if (onPaymentSuccess && newPayment) {
        onPaymentSuccess(newPayment)
      }
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to record payment")
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!studentId || !batchId || !amount) {
      toast.error("Please select a student, batch, and enter the fee amount")
      return
    }
    mutation.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Fee Payment</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Select Student */}
          <div className="space-y-1.5">
            <Label>Student *</Label>
            <Select value={studentId} onValueChange={setStudentId}>
              <SelectTrigger>
                <SelectValue placeholder="Select student..." />
              </SelectTrigger>
              <SelectContent>
                {(students || []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.profiles?.full_name} ({s.profiles?.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Select Batch */}
          <div className="space-y-1.5">
            <Label>Batch *</Label>
            <Select value={batchId} onValueChange={setBatchId}>
              <SelectTrigger>
                <SelectValue placeholder="Select enrolled batch..." />
              </SelectTrigger>
              <SelectContent>
                {(studentBatches || []).map((b: any) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name} (₹{b.monthly_fee}/mo)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="fee-amount">Amount (₹) *</Label>
              <Input
                id="fee-amount"
                type="number"
                placeholder="2500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                min={1}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fee-month">Billing Month *</Label>
              <Input
                id="fee-month"
                placeholder="e.g. Nov 2026"
                value={monthLabel}
                onChange={(e) => setMonthLabel(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Payment Mode *</Label>
              <Select value={paymentMode} onValueChange={(val: any) => setPaymentMode(val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="upi">UPI / QR Code</SelectItem>
                  <SelectItem value="cash">Cash in Hand</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer / NEFT</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fee-date">Payment Date *</Label>
              <Input
                id="fee-date"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fee-ref">Transaction / Reference ID</Label>
            <Input
              id="fee-ref"
              placeholder="e.g. UPI-9847294827 or Cheque No"
              value={transactionRef}
              onChange={(e) => setTransactionRef(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fee-notes">Notes / Remarks</Label>
            <Input
              id="fee-notes"
              placeholder="Optional remarks"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Recording..." : "Record & Generate Slip"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

