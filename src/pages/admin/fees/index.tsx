import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Receipt,
  Plus,
  Search,
  Printer,
  AlertCircle,
  IndianRupee,
  Layers,
  ArrowRight,
  TrendingUp,
  ShieldAlert,
  Trash2,
  Users,
  User,
} from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { StatCard } from "@/components/shared/stat-card"
import { EmptyState } from "@/components/shared/empty-state"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  fetchFeePayments,
  fetchPendingDues,
  fetchFeeStructures,
  fetchFeeWaivers,
  deleteFeeWaiver,
} from "@/services/fees"
import { RecordPaymentModal } from "@/pages/admin/fees/record-payment-modal"
import { WaiveMonthModal } from "@/pages/admin/fees/waive-month-modal"
import { PrintableReceiptModal } from "@/components/shared/printable-receipt"
import { formatCurrency, formatDate } from "@/lib/utils"
import { format, parseISO } from "date-fns"
import type { FeePaymentWithDetails, FeeWaiverWithDetails } from "@/types/database"
import { toast } from "sonner"

export function FeesManagementPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<string>("history")
  const [search, setSearch] = useState("")
  const [recordModalOpen, setRecordModalOpen] = useState(false)
  const [waiveModalOpen, setWaiveModalOpen] = useState(false)
  const [deleteWaiverTarget, setDeleteWaiverTarget] = useState<FeeWaiverWithDetails | null>(null)
  const [targetStudentId, setTargetStudentId] = useState<string | undefined>()
  const [targetBatchId, setTargetBatchId] = useState<string | undefined>()
  const [selectedReceipt, setSelectedReceipt] = useState<FeePaymentWithDetails | null>(null)
  const [receiptModalOpen, setReceiptModalOpen] = useState(false)

  const { data: payments, isLoading: paymentsLoading } = useQuery({
    queryKey: ["fee-payments"],
    queryFn: fetchFeePayments,
  })

  const { data: pendingDues, isLoading: duesLoading } = useQuery({
    queryKey: ["pending-dues"],
    queryFn: () => fetchPendingDues(),
  })

  const { data: structures } = useQuery({
    queryKey: ["fee-structures"],
    queryFn: fetchFeeStructures,
  })

  const { data: waivers, isLoading: waiversLoading } = useQuery({
    queryKey: ["fee-waivers"],
    queryFn: fetchFeeWaivers,
  })

  const deleteWaiverMutation = useMutation({
    mutationFn: (waiverId: string) => deleteFeeWaiver(waiverId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fee-waivers"] })
      queryClient.invalidateQueries({ queryKey: ["pending-dues"] })
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] })
      queryClient.invalidateQueries({ queryKey: ["student-fee-ledger"] })
      queryClient.invalidateQueries({ queryKey: ["student-dashboard"] })
      toast.success("Fee waiver removed successfully")
      setDeleteWaiverTarget(null)
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to remove fee waiver")
    },
  })

  // Filter payments
  const filteredPayments = (payments || []).filter((p) => {
    const q = search.toLowerCase()
    return (
      (p.students?.profiles?.full_name || "").toLowerCase().includes(q) ||
      (p.batches?.name || "").toLowerCase().includes(q) ||
      p.month_label.toLowerCase().includes(q) ||
      (p.transaction_ref || "").toLowerCase().includes(q)
    )
  })

  // Total collected
  const totalCollected = (payments || []).reduce(
    (sum, p) => sum + Number(p.amount || 0),
    0
  )

  // Total pending dues amount
  const totalPendingAmount = (pendingDues || []).reduce(
    (sum, d) => sum + Number(d.monthly_fee || 0),
    0
  )

  const handlePayDue = (studentId: string, batchId: string) => {
    setTargetStudentId(studentId)
    setTargetBatchId(batchId)
    setRecordModalOpen(true)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fee & Financial Management"
        description="Record student fees, manage waivers, print receipts, and monitor collection rosters."
        badge={
          <Badge variant="outline" className="border-indigo-400/40 text-indigo-600 dark:text-indigo-400">
            Accounts
          </Badge>
        }
      >
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setWaiveModalOpen(true)}
            className="gap-1.5 border-amber-400/50 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
          >
            <ShieldAlert className="h-4 w-4" />
            <span>Waive Month</span>
          </Button>
          <Button
            onClick={() => {
              setTargetStudentId(undefined)
              setTargetBatchId(undefined)
              setRecordModalOpen(true)
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            <span>Record Payment</span>
          </Button>
        </div>
      </PageHeader>

      {/* Financial Metrics */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Total Fees Collected"
          value={formatCurrency(totalCollected)}
          description={`${payments?.length || 0} transactions logged`}
          icon={IndianRupee}
          delay={0}
        />
        <StatCard
          title="Pending Monthly Dues"
          value={formatCurrency(totalPendingAmount)}
          description={`${pendingDues?.length || 0} overdue students`}
          trend="down"
          change={pendingDues?.length ? `${pendingDues.length} Unpaid` : "All Cleared"}
          icon={AlertCircle}
          gradient="from-rose-500/10 to-pink-500/10 text-rose-600 dark:text-rose-400"
          delay={0.05}
        />
        <StatCard
          title="Active Fee Plans"
          value={structures?.length || 0}
          description="Configured batch fee models"
          icon={Layers}
          gradient="from-amber-500/10 to-orange-500/10 text-amber-600 dark:text-amber-400"
          delay={0.1}
        />
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <TabsList className="bg-muted/60 p-1 rounded-xl">
            <TabsTrigger value="history" className="rounded-lg text-xs font-semibold">
              Payment History ({payments?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="dues" className="rounded-lg text-xs font-semibold relative">
              Pending Dues ({pendingDues?.length || 0})
              {(pendingDues?.length || 0) > 0 && (
                <span className="ml-1.5 flex h-2 w-2 rounded-full bg-rose-500" />
              )}
            </TabsTrigger>
            <TabsTrigger value="waivers" className="rounded-lg text-xs font-semibold">
              Fee Waivers ({waivers?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="structures" className="rounded-lg text-xs font-semibold">
              Fee Structures ({structures?.length || 0})
            </TabsTrigger>
          </TabsList>

          {activeTab === "history" && (
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search payments..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-9 text-xs"
              />
            </div>
          )}
        </div>

        {/* Tab 1: Payment History */}
        <TabsContent value="history" className="space-y-4">
          {paymentsLoading ? (
            <div className="h-64 rounded-2xl border border-border/60 bg-card p-6 animate-pulse" />
          ) : filteredPayments.length > 0 ? (
            <div className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm min-w-[660px]">
                  <thead className="bg-muted/40 border-b border-border/60 text-xs font-semibold text-muted-foreground uppercase">
                    <tr>
                      <th className="py-3.5 px-4">Receipt #</th>
                      <th className="py-3.5 px-4">Date</th>
                      <th className="py-3.5 px-4">Student</th>
                      <th className="py-3.5 px-4">Batch</th>
                      <th className="py-3.5 px-4">Billing Month</th>
                      <th className="py-3.5 px-4">Mode</th>
                      <th className="py-3.5 px-4">Amount</th>
                      <th className="py-3.5 px-4 text-right">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {filteredPayments.map((p) => {
                      const receiptNo =
                        p.transaction_ref ||
                        `ORB-${p.id.slice(0, 8).toUpperCase()}`

                      return (
                        <tr key={p.id} className="hover:bg-accent/40 transition-colors">
                          <td className="py-3 px-4 font-mono text-xs text-muted-foreground">
                            {receiptNo}
                          </td>
                          <td className="py-3 px-4 text-xs">
                            {formatDate(p.payment_date)}
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-semibold text-foreground">
                              {p.students?.profiles?.full_name || "Student"}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {p.students?.profiles?.email}
                            </p>
                          </td>
                          <td className="py-3 px-4 text-xs font-medium">
                            {p.batches?.name}
                          </td>
                          <td className="py-3 px-4 text-xs text-muted-foreground">
                            <Badge variant="secondary" className="text-[10px] py-0 font-medium">
                              {p.month_label}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-xs capitalize text-muted-foreground">
                            {p.payment_mode.replace("_", " ")}
                          </td>
                          <td className="py-3 px-4 font-bold text-emerald-600">
                            {formatCurrency(p.amount)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:border-indigo-400"
                              onClick={() => {
                                setSelectedReceipt(p)
                                setReceiptModalOpen(true)
                              }}
                            >
                              <Printer className="h-3.5 w-3.5" />
                              <span>Print</span>
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={Receipt}
              title={search ? "No matching payment records" : "No fee payments recorded yet"}
              description={
                search
                  ? "Try checking your search keywords."
                  : "Click 'Record Payment' to record tuition fees received from a student."
              }
              actionLabel="Record Fee Payment"
              onAction={() => setRecordModalOpen(true)}
            />
          )}
        </TabsContent>

        {/* Tab 2: Pending Dues */}
        <TabsContent value="dues" className="space-y-4">
          {duesLoading ? (
            <div className="h-64 rounded-2xl border border-border/60 bg-card p-6 animate-pulse" />
          ) : (pendingDues || []).length > 0 ? (
            <div className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm min-w-[580px]">
                  <thead className="bg-muted/40 border-b border-border/60 text-xs font-semibold text-muted-foreground uppercase">
                    <tr>
                      <th className="py-3.5 px-4">Student</th>
                      <th className="py-3.5 px-4">Phone</th>
                      <th className="py-3.5 px-4">Batch</th>
                      <th className="py-3.5 px-4">Due Month</th>
                      <th className="py-3.5 px-4">Fee Due</th>
                      <th className="py-3.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {(pendingDues || []).map((due, idx) => (
                      <tr key={idx} className="hover:bg-accent/40 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-foreground">
                          {due.student_name}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-muted-foreground">
                          {due.student_phone || "—"}
                        </td>
                        <td className="py-3.5 px-4 text-xs font-medium">
                          {due.batch_name}
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge variant="destructive" className="text-[10px] py-0 font-semibold">
                            {due.month_label}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-rose-600">
                          {formatCurrency(due.monthly_fee)}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <Button
                            size="sm"
                            className="h-8 gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700"
                            onClick={() => handlePayDue(due.student_id, due.batch_id)}
                          >
                            <span>Collect Now</span>
                            <ArrowRight className="h-3 w-3" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-border/60 bg-card p-12 text-center space-y-2">
              <div className="h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
                <TrendingUp className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-base text-foreground">All Accounts Clear!</h3>
              <p className="text-xs text-muted-foreground">
                No outstanding fee dues detected for active enrollments this month.
              </p>
            </div>
          )}
        </TabsContent>

        {/* Tab 3: Fee Waivers */}
        <TabsContent value="waivers" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">Active Fee Waivers</h3>
              <p className="text-xs text-muted-foreground">
                Exemptions granted to individual students or all students for specific months.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setWaiveModalOpen(true)}
              className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New Waiver</span>
            </Button>
          </div>

          {waiversLoading ? (
            <div className="h-64 rounded-2xl border border-border/60 bg-card p-6 animate-pulse" />
          ) : (waivers || []).length > 0 ? (
            <div className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm min-w-[620px]">
                  <thead className="bg-muted/40 border-b border-border/60 text-xs font-semibold text-muted-foreground uppercase">
                    <tr>
                      <th className="py-3.5 px-4">Scope</th>
                      <th className="py-3.5 px-4">Applicable Class</th>
                      <th className="py-3.5 px-4">Waiver Month</th>
                      <th className="py-3.5 px-4">Reason / Notes</th>
                      <th className="py-3.5 px-4">Date Granted</th>
                      <th className="py-3.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {(waivers || []).map((w) => {
                      const isAllStudents = !w.student_id
                      const isAllBatches = !w.batch_id
                      const formattedMonth = format(parseISO(w.month), "MMM yyyy")

                      return (
                        <tr key={w.id} className="hover:bg-accent/40 transition-colors">
                          <td className="py-3.5 px-4">
                            {isAllStudents ? (
                              <div className="flex items-center gap-1.5">
                                <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 gap-1 text-[11px]">
                                  <Users className="h-3 w-3" />
                                  <span>All Students</span>
                                </Badge>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-indigo-500 shrink-0" />
                                <div>
                                  <p className="font-semibold text-foreground text-xs">
                                    {w.students?.profiles?.full_name || "Student"}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground">
                                    {w.students?.profiles?.email}
                                  </p>
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-xs font-medium">
                            {isAllBatches ? (
                              <span className="text-muted-foreground italic">All Classes</span>
                            ) : (
                              w.batches?.name || "Batch"
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <Badge variant="outline" className="text-xs font-semibold border-amber-400/60 text-amber-600 dark:text-amber-400 bg-amber-500/10">
                              {formattedMonth}
                            </Badge>
                          </td>
                          <td className="py-3.5 px-4 text-xs text-muted-foreground max-w-xs truncate">
                            {w.reason || <span className="italic">No notes</span>}
                          </td>
                          <td className="py-3.5 px-4 text-xs text-muted-foreground">
                            {formatDate(w.created_at)}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 gap-1.5"
                              onClick={() => setDeleteWaiverTarget(w)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>Undo</span>
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-border/60 bg-card p-10 text-center space-y-2">
              <div className="h-10 w-10 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <h4 className="font-bold text-sm text-foreground">No Fee Waivers Active</h4>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Click "Waive Month" to grant a fee exemption for an individual student or all students.
              </p>
            </div>
          )}
        </TabsContent>

        {/* Tab 4: Fee Structures */}
        <TabsContent value="structures" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            {(structures || []).map((fs) => (
              <Card key={fs.id} className="p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <Badge variant="outline" className="capitalize text-xs font-semibold">
                    {fs.fee_type} Plan
                  </Badge>
                  <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                    {formatCurrency(fs.amount)}
                  </span>
                </div>
                <div>
                  <h4 className="font-bold text-sm text-foreground">
                    {(fs as any).batches?.name}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {fs.description || "Batch tuition fee plan"}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Record Payment Modal */}
      <RecordPaymentModal
        open={recordModalOpen}
        onOpenChange={setRecordModalOpen}
        initialStudentId={targetStudentId}
        initialBatchId={targetBatchId}
        onPaymentSuccess={(p) => {
          setSelectedReceipt(p)
          setReceiptModalOpen(true)
        }}
      />

      {/* Waive Month Modal */}
      <WaiveMonthModal
        open={waiveModalOpen}
        onOpenChange={setWaiveModalOpen}
        initialStudentId={targetStudentId}
        initialBatchId={targetBatchId}
      />

      {/* Printable Receipt Modal */}
      <PrintableReceiptModal
        payment={selectedReceipt}
        open={receiptModalOpen}
        onOpenChange={setReceiptModalOpen}
      />

      {/* Confirm Delete Waiver Dialog */}
      <ConfirmDialog
        open={!!deleteWaiverTarget}
        onOpenChange={(open) => !open && setDeleteWaiverTarget(null)}
        title="Undo Fee Waiver?"
        description={
          deleteWaiverTarget?.student_id
            ? `Are you sure you want to remove the waiver for ${deleteWaiverTarget.students?.profiles?.full_name || "this student"} for ${deleteWaiverTarget ? format(parseISO(deleteWaiverTarget.month), "MMM yyyy") : ""}? Tuition fees will once again be calculated as pending due.`
            : `Are you sure you want to remove the institute-wide fee waiver for ALL students for ${deleteWaiverTarget ? format(parseISO(deleteWaiverTarget.month), "MMM yyyy") : ""}? Tuition fees will once again be calculated as pending due for all enrolled students.`
        }
        confirmText="Remove Waiver"
        variant="destructive"
        onConfirm={() => {
          if (deleteWaiverTarget) {
            deleteWaiverMutation.mutate(deleteWaiverTarget.id)
          }
        }}
      />
    </div>
  )
}
