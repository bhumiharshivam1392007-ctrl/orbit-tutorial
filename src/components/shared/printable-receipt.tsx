import { Printer, CheckCircle2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { formatCurrency, formatDate } from "@/lib/utils"
import type { FeePaymentWithDetails } from "@/types/database"

interface PrintableReceiptModalProps {
  payment: FeePaymentWithDetails | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PrintableReceiptModal({
  payment,
  open,
  onOpenChange,
}: PrintableReceiptModalProps) {
  if (!payment) return null

  const handlePrint = () => {
    window.print()
  }

  const receiptNo =
    payment.transaction_ref ||
    `ORB-${payment.id.slice(0, 8).toUpperCase()}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0 bg-background">
        <DialogHeader className="p-4 sm:p-6 pb-0 no-print">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base sm:text-lg font-bold">Fee Payment Receipt</DialogTitle>
            <Button
              onClick={handlePrint}
              size="sm"
              className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8 sm:h-9"
            >
              <Printer className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Print Receipt</span>
            </Button>
          </div>
        </DialogHeader>

        {/* Printable Paper Canvas */}
        <div className="p-4 sm:p-8 print:p-0" id="printable-receipt-content">
          <div className="rounded-2xl border-2 border-indigo-500/20 bg-card p-4 sm:p-8 shadow-sm print:border-none print:shadow-none print:p-2">
            {/* Institute Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b pb-4 sm:pb-6 border-border/80">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-bold text-lg sm:text-xl shadow-md shrink-0">
                  O
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
                    ORBIT COACHING INSTITUTE
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Excellence in Competitive & Board Coaching
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Tel: +91 98765 43210 • Email: contact@orbit.edu
                  </p>
                </div>
              </div>

              <div className="sm:text-right">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600">
                  <CheckCircle2 className="h-3.5 w-3.5" /> PAID
                </span>
                <p className="text-xs font-mono font-medium text-muted-foreground mt-1.5">
                  Receipt #{receiptNo}
                </p>
                <p className="text-xs text-muted-foreground">
                  Date: {formatDate(payment.payment_date)}
                </p>
              </div>
            </div>

            {/* Student & Batch Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4 sm:py-6 text-sm border-b border-border/80">
              <div className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Student Details
                </span>
                <p className="font-semibold text-foreground text-base">
                  {payment.students?.profiles?.full_name || "Student"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Email: {payment.students?.profiles?.email || "N/A"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Phone: {payment.students?.profiles?.phone || "N/A"}
                </p>
              </div>

              <div className="space-y-1 sm:text-right">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Batch & Timing
                </span>
                <p className="font-semibold text-foreground text-base">
                  {payment.batches?.name || "N/A"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Subject: {payment.batches?.subject || "N/A"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Schedule: {payment.batches?.timing || "N/A"}
                </p>
              </div>
            </div>

            {/* Payment Particulars Table */}
            <div className="py-4 sm:py-6 overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[380px]">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground uppercase font-semibold">
                    <th className="pb-2">Description</th>
                    <th className="pb-2">Billing Period</th>
                    <th className="pb-2">Payment Mode</th>
                    <th className="pb-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  <tr>
                    <td className="py-3 font-medium">Tuition & Coaching Fee</td>
                    <td className="py-3 text-muted-foreground">{payment.month_label}</td>
                    <td className="py-3 capitalize text-muted-foreground">
                      {payment.payment_mode.replace("_", " ")}
                    </td>
                    <td className="py-3 text-right font-semibold text-foreground">
                      {formatCurrency(payment.amount)}
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border font-bold">
                    <td colSpan={3} className="pt-4 text-base">Total Paid</td>
                    <td className="pt-4 text-right text-base text-indigo-600 dark:text-indigo-400">
                      {formatCurrency(payment.amount)}
                    </td>
                  </tr>
                </tfoot>
              </table>

              {payment.notes && (
                <p className="mt-4 text-xs italic text-muted-foreground">
                  Remarks: {payment.notes}
                </p>
              )}
            </div>

            {/* Footer with Authorization Stamp */}
            <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-border flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
              <div className="text-xs text-muted-foreground space-y-1">
                <p>• Computer-generated fee acknowledgment receipt.</p>
                <p>• Fees once paid are non-refundable & non-transferable.</p>
              </div>

              <div className="sm:text-center self-end sm:self-auto">
                <div className="h-10 w-32 border-b border-dashed border-border mx-auto mb-1.5" />
                <p className="text-xs font-semibold text-foreground">Authorized Signatory</p>
                <p className="text-[10px] text-muted-foreground">ORBIT Accounts Office</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

