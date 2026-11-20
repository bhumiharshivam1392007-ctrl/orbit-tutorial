import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  CreditCard,
  Printer,
  Receipt,
  CheckCircle2,
} from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { PrintableReceiptModal } from "@/components/shared/printable-receipt"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/hooks/use-auth"
import { fetchStudentFeeLedger, type StudentFeePaymentItem } from "@/services/student-module"
import { formatCurrency, formatDate } from "@/lib/utils"

export function StudentFeesPage() {
  const { profile } = useAuth()
  const [selectedReceipt, setSelectedReceipt] = useState<StudentFeePaymentItem | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ["student-fee-ledger", profile?.id],
    queryFn: () => fetchStudentFeeLedger(profile?.id || ""),
    enabled: !!profile?.id,
  })

  const payments = data?.payments || []
  const totalPaid = data?.totalPaid || 0
  const monthlyTotal = data?.monthlyTotal || 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fee Ledger & Payment Receipts"
        description="Review all recorded fee deposits, monthly billing history, and print verified fee receipts."
        badge={
          <Badge variant="outline" className="border-emerald-400/50 text-emerald-600 dark:text-emerald-400">
            Fee Portal
          </Badge>
        }
      />

      {/* Fee Metrics Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="p-5 rounded-2xl border border-border/60 bg-card">
          <span className="text-xs text-muted-foreground block font-medium">Total Fees Paid</span>
          <span className="text-2xl font-bold text-foreground mt-1 block">
            {formatCurrency(totalPaid)}
          </span>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Verified deposits
          </span>
        </div>

        <div className="p-5 rounded-2xl border border-border/60 bg-card">
          <span className="text-xs text-muted-foreground block font-medium">Monthly Active Tuition</span>
          <span className="text-2xl font-bold text-foreground mt-1 block">
            {formatCurrency(monthlyTotal)}
          </span>
          <span className="text-[11px] text-muted-foreground mt-1 block">
            Based on enrolled batches
          </span>
        </div>

        <div className="p-5 rounded-2xl border border-border/60 bg-card">
          <span className="text-xs text-muted-foreground block font-medium">Receipts Available</span>
          <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1 block">
            {payments.length}
          </span>
          <span className="text-[11px] text-muted-foreground mt-1 block">
            Ready to download or print
          </span>
        </div>
      </div>

      {/* Payment Ledger Table */}
      {isLoading ? (
        <div className="h-48 rounded-2xl border border-border/60 bg-card p-6 animate-pulse" />
      ) : payments.length > 0 ? (
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-border/60 flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Receipt className="h-4 w-4 text-indigo-600" />
              <span>Payment History & Receipts</span>
            </h3>
            <span className="text-xs text-muted-foreground">
              {payments.length} transactions
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40 border-b border-border/60 text-xs font-semibold text-muted-foreground uppercase">
                <tr>
                  <th className="py-3 px-4">Receipt Ref</th>
                  <th className="py-3 px-4">Billing Month</th>
                  <th className="py-3 px-4">Batch</th>
                  <th className="py-3 px-4">Payment Date</th>
                  <th className="py-3 px-4">Mode</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {payments.map((pay) => (
                  <tr key={pay.id} className="hover:bg-accent/40 transition-colors">
                    <td className="py-3 px-4 font-mono text-xs text-muted-foreground">
                      REC-{pay.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="py-3 px-4 font-semibold text-foreground">
                      {pay.month_label}
                    </td>
                    <td className="py-3 px-4 text-xs text-muted-foreground">
                      {pay.batch_name}
                    </td>
                    <td className="py-3 px-4 text-xs text-muted-foreground">
                      {formatDate(pay.payment_date)}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                        {pay.payment_mode}
                      </Badge>
                      {pay.transaction_ref && (
                        <span className="block text-[10px] text-muted-foreground font-mono mt-0.5">
                          {pay.transaction_ref}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-foreground">
                      {formatCurrency(pay.amount)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs gap-1.5 hover:border-indigo-500/50 hover:text-indigo-600"
                        onClick={() => setSelectedReceipt(pay)}
                      >
                        <Printer className="h-3.5 w-3.5" />
                        <span>Receipt</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <EmptyState
          icon={CreditCard}
          title="No fee payments recorded"
          description="There are currently no fee receipts or payments logged for your student account."
        />
      )}

      {/* Printable Receipt Modal */}
      {selectedReceipt && (
        <PrintableReceiptModal
          open={!!selectedReceipt}
          onOpenChange={(isOpen: boolean) => {
            if (!isOpen) setSelectedReceipt(null)
          }}
          payment={{
            id: selectedReceipt.id,
            student_id: "",
            batch_id: selectedReceipt.batch_id,
            amount: selectedReceipt.amount,
            payment_mode: selectedReceipt.payment_mode,
            transaction_ref: selectedReceipt.transaction_ref,
            payment_date: selectedReceipt.payment_date,
            month_label: selectedReceipt.month_label,
            status: selectedReceipt.status,
            notes: null,
            recorded_by: null,
            created_at: selectedReceipt.created_at,
            students: {
              profiles: {
                full_name: profile?.full_name || "Student",
                email: profile?.email || "",
                phone: profile?.phone || "",
              },
            },
            batches: {
              name: selectedReceipt.batch_name,
              subject: "",
              timing: "",
            },
          } as any}
        />
      )}
    </div>
  )
}
