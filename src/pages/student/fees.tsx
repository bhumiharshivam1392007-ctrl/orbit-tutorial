import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  CreditCard,
  Printer,
  Receipt,
  CheckCircle2,
  ShieldAlert,
  Calendar,
} from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { PrintableReceiptModal } from "@/components/shared/printable-receipt"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/hooks/use-auth"
import { fetchStudentFeeLedger, type StudentFeePaymentItem } from "@/services/student-module"
import { formatCurrency, formatDate } from "@/lib/utils"

export function StudentFeesPage() {
  const { profile } = useAuth()
  const [activeTab, setActiveTab] = useState<string>("ledger")
  const [selectedReceipt, setSelectedReceipt] = useState<StudentFeePaymentItem | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ["student-fee-ledger", profile?.id],
    queryFn: () => fetchStudentFeeLedger(profile?.id || ""),
    enabled: !!profile?.id,
  })

  const payments = data?.payments || []
  const ledgerItems = data?.ledgerItems || []
  const totalPaid = data?.totalPaid || 0
  const monthlyTotal = data?.monthlyTotal || 0

  const pendingDuesCount = ledgerItems.filter((i) => i.status === "due").length
  const waivedCount = ledgerItems.filter((i) => i.status === "waived").length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fee Ledger & Payment Receipts"
        description="Review your monthly tuition billing status, fee waivers, deposits, and print official fee receipts."
        badge={
          <Badge variant="outline" className="border-emerald-400/50 text-emerald-600 dark:text-emerald-400">
            Fee Portal
          </Badge>
        }
      />

      {/* Fee Metrics Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
        <div className="p-4 sm:p-5 rounded-2xl border border-border/60 bg-card">
          <span className="text-xs text-muted-foreground block font-medium">Total Fees Paid</span>
          <span className="text-xl sm:text-2xl font-bold text-foreground mt-1 block">
            {formatCurrency(totalPaid)}
          </span>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Verified deposits
          </span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl border border-border/60 bg-card">
          <span className="text-xs text-muted-foreground block font-medium">Monthly Active Tuition</span>
          <span className="text-xl sm:text-2xl font-bold text-foreground mt-1 block">
            {formatCurrency(monthlyTotal)}
          </span>
          <span className="text-[11px] text-muted-foreground mt-1 block">
            {pendingDuesCount > 0 ? (
              <span className="text-rose-500 font-semibold">{pendingDuesCount} Pending Month(s)</span>
            ) : waivedCount > 0 ? (
              <span className="text-amber-500 font-semibold">{waivedCount} Month(s) Waived</span>
            ) : (
              "All accounts clear"
            )}
          </span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl border border-border/60 bg-card">
          <span className="text-xs text-muted-foreground block font-medium">Payment Receipts</span>
          <span className="text-xl sm:text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1 block">
            {payments.length}
          </span>
          <span className="text-[11px] text-muted-foreground mt-1 block">
            Ready to download or print
          </span>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted/60 p-1 rounded-xl">
          <TabsTrigger value="ledger" className="rounded-lg text-xs font-semibold">
            Monthly Fee Ledger ({ledgerItems.length})
          </TabsTrigger>
          <TabsTrigger value="receipts" className="rounded-lg text-xs font-semibold">
            Payment Receipts ({payments.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Monthly Fee Ledger */}
        <TabsContent value="ledger" className="space-y-4">
          {isLoading ? (
            <div className="h-48 rounded-2xl border border-border/60 bg-card p-6 animate-pulse" />
          ) : ledgerItems.length > 0 ? (
            <Card className="overflow-hidden">
              <div className="p-4 border-b border-border/60 flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-indigo-600" />
                  <span>Monthly Billing & Waiver Schedule</span>
                </h3>
                <span className="text-xs text-muted-foreground">
                  {ledgerItems.length} billing periods
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm min-w-[560px]">
                  <thead className="bg-muted/40 border-b border-border/60 text-xs font-semibold text-muted-foreground uppercase">
                    <tr>
                      <th className="py-3 px-4">Billing Month</th>
                      <th className="py-3 px-4">Enrolled Class</th>
                      <th className="py-3 px-4">Monthly Fee</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Remarks</th>
                      <th className="py-3 px-4 text-right">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {ledgerItems.map((item) => (
                      <tr key={item.id} className="hover:bg-accent/40 transition-colors">
                        <td className="py-3 px-4 font-semibold text-foreground">
                          {item.month_label}
                        </td>
                        <td className="py-3 px-4 text-xs font-medium text-muted-foreground">
                          {item.batch_name}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs">
                          {formatCurrency(item.monthly_fee)}
                        </td>
                        <td className="py-3 px-4">
                          {item.status === "paid" && (
                            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[11px] font-semibold">
                              Paid
                            </Badge>
                          )}
                          {item.status === "waived" && (
                            <Badge
                              variant="outline"
                              className="border-amber-400 text-amber-500 bg-amber-500/10 text-[11px] font-semibold gap-1"
                            >
                              <ShieldAlert className="h-3 w-3" />
                              <span>Waived</span>
                            </Badge>
                          )}
                          {item.status === "due" && (
                            <Badge variant="destructive" className="text-[11px] font-semibold">
                              Due
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">
                          {item.status === "waived" ? (
                            <span className="text-amber-600 dark:text-amber-400 italic">
                              {item.waiver_reason || "Fee waived by institute"}
                            </span>
                          ) : item.status === "paid" && item.payment_date ? (
                            <span>Paid on {formatDate(item.payment_date)}</span>
                          ) : item.status === "due" ? (
                            <span className="text-rose-500 font-medium">Payment pending</span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {item.payment_item ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs gap-1.5 hover:border-indigo-500/50 hover:text-indigo-600"
                              onClick={() => setSelectedReceipt(item.payment_item!)}
                            >
                              <Printer className="h-3.5 w-3.5" />
                              <span>Receipt</span>
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            <EmptyState
              icon={Calendar}
              title="No billing schedule available"
              description="Your account is not currently enrolled in any fee-applicable academic classes."
            />
          )}
        </TabsContent>

        {/* Tab 2: Payment Receipts */}
        <TabsContent value="receipts" className="space-y-4">
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
                <table className="w-full text-left text-sm min-w-[560px]">
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
        </TabsContent>
      </Tabs>

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
