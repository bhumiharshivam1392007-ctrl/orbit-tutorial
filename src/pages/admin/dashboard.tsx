import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import {
  Users,
  GraduationCap,
  Layers,
  IndianRupee,
  AlertCircle,
  Plus,
  Receipt,
  Printer,
  ArrowRight,
  TrendingUp,
} from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { StatCard } from "@/components/shared/stat-card"
import { StatCardsSkeleton } from "@/components/shared/skeleton-loader"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { fetchAdminDashboardStats } from "@/services/dashboard"
import { MonthlyCollectionChart } from "@/components/charts/monthly-collection"
import { PrintableReceiptModal } from "@/components/shared/printable-receipt"
import { StudentModal } from "@/pages/admin/students/student-modal"
import { TeacherModal } from "@/pages/admin/teachers/teacher-modal"
import { BatchModal } from "@/pages/admin/batches/batch-modal"
import { RecordPaymentModal } from "@/pages/admin/fees/record-payment-modal"
import { useAuth } from "@/hooks/use-auth"
import { formatCurrency, formatDate } from "@/lib/utils"
import type { FeePaymentWithDetails } from "@/types/database"

export function AdminDashboardPage() {
  const navigate = useNavigate()
  const { profile } = useAuth()

  // Modals state
  const [studentModalOpen, setStudentModalOpen] = useState(false)
  const [teacherModalOpen, setTeacherModalOpen] = useState(false)
  const [batchModalOpen, setBatchModalOpen] = useState(false)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)

  // Receipt modal state
  const [selectedReceipt, setSelectedReceipt] = useState<FeePaymentWithDetails | null>(null)
  const [receiptModalOpen, setReceiptModalOpen] = useState(false)

  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: fetchAdminDashboardStats,
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${profile?.full_name?.split(" ")[0] || "Admin"}! 👋`}
        description="Real-time pulse of your coaching institute's student enrollment, batches, and finances."
        badge={
          <Badge variant="outline" className="border-indigo-400/50 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/50">
            Admin Workspace
          </Badge>
        }
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              <span>Quick Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => setStudentModalOpen(true)}>
              <GraduationCap className="mr-2 h-4 w-4" /> Add Student
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTeacherModalOpen(true)}>
              <Users className="mr-2 h-4 w-4" /> Add Teacher
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setBatchModalOpen(true)}>
              <Layers className="mr-2 h-4 w-4" /> Create Batch
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setPaymentModalOpen(true)}>
              <Receipt className="mr-2 h-4 w-4" /> Record Payment
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </PageHeader>

      {/* Metrics Row */}
      {isLoading ? (
        <StatCardsSkeleton count={4} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div onClick={() => navigate("/admin/students")} className="cursor-pointer">
            <StatCard
              title="Total Students"
              value={stats?.totalStudents || 0}
              description="Active enrollments"
              icon={GraduationCap}
              delay={0}
            />
          </div>

          <div onClick={() => navigate("/admin/teachers")} className="cursor-pointer">
            <StatCard
              title="Faculty Members"
              value={stats?.totalTeachers || 0}
              description="Instructors & teachers"
              icon={Users}
              gradient="from-violet-500/10 to-purple-500/10 text-violet-600 dark:text-violet-400"
              delay={0.05}
            />
          </div>

          <div onClick={() => navigate("/admin/batches")} className="cursor-pointer">
            <StatCard
              title="Active Batches"
              value={stats?.totalBatches || 0}
              description="Scheduled classes"
              icon={Layers}
              gradient="from-emerald-500/10 to-teal-500/10 text-emerald-600 dark:text-emerald-400"
              delay={0.1}
            />
          </div>

          <div onClick={() => navigate("/admin/fees")} className="cursor-pointer">
            <StatCard
              title="Fees This Month"
              value={formatCurrency(stats?.feesCollectedThisMonth || 0)}
              change={
                stats?.pendingDuesCount
                  ? `₹${(stats.pendingDuesAmount || 0).toLocaleString()} pending (${stats.pendingDuesCount})`
                  : "All dues clear"
              }
              trend={stats?.pendingDuesCount ? "down" : "up"}
              icon={IndianRupee}
              gradient="from-amber-500/10 to-orange-500/10 text-amber-600 dark:text-amber-400"
              delay={0.15}
            />
          </div>
        </div>
      )}

      {/* Analytics Chart + Recent Collections Grid */}
      <div className="grid gap-6 lg:grid-cols-7">
        {/* Monthly Collection Trend Chart */}
        <Card className="lg:col-span-4">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-bold">Monthly Fee Collection</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Revenue trends across the past 6 billing cycles
              </p>
            </div>
            <Badge variant="outline" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
              <TrendingUp className="h-3 w-3 mr-1" /> Revenue Trend
            </Badge>
          </CardHeader>
          <CardContent className="pt-0">
            <MonthlyCollectionChart data={stats?.monthlyCollectionChart || []} />
          </CardContent>
        </Card>

        {/* Pending Dues Alert / Quick Summary */}
        <Card className="lg:col-span-3 flex flex-col justify-between">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-rose-500" /> Outstanding Fee Dues
              </CardTitle>
              <Badge variant="destructive" className="text-xs py-0">
                {stats?.pendingDuesCount || 0} Pending
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Active students with unpaid tuition dues for current month
            </p>
          </CardHeader>

          <CardContent className="space-y-4 pt-0">
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 space-y-2">
              <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">
                Total Overdue Amount
              </span>
              <div className="text-3xl font-extrabold text-foreground">
                {formatCurrency(stats?.pendingDuesAmount || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats?.pendingDuesCount || 0} students have outstanding fees. Send reminders or collect at office.
              </p>
            </div>

            <Button
              variant="outline"
              onClick={() => navigate("/admin/fees")}
              className="w-full justify-between text-xs h-9"
            >
              <span>View Full Dues Roster</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Payments Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base font-bold">Recent Fee Payments</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Latest transactions recorded across all batches
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/admin/fees")}
            className="text-xs gap-1 text-indigo-600 dark:text-indigo-400"
          >
            <span>View All</span>
            <ArrowRight className="h-3 w-3" />
          </Button>
        </CardHeader>

        <CardContent className="p-0">
          {(stats?.recentPayments || []).length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/40 border-y border-border/60 text-xs font-semibold text-muted-foreground uppercase">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Batch</th>
                    <th className="py-3 px-4">Month</th>
                    <th className="py-3 px-4">Mode</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4 text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {stats?.recentPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-accent/40 transition-colors">
                      <td className="py-3 px-4 text-xs font-mono text-muted-foreground">
                        {formatDate(p.payment_date)}
                      </td>
                      <td className="py-3 px-4 font-semibold text-foreground">
                        {p.students?.profiles?.full_name || "Student"}
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
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1 text-xs text-indigo-600 dark:text-indigo-400"
                          onClick={() => {
                            setSelectedReceipt(p)
                            setReceiptModalOpen(true)
                          }}
                        >
                          <Printer className="h-3.5 w-3.5" />
                          <span>Slip</span>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No recent payments recorded yet. Click "Quick Actions" → "Record Payment" to log tuition fees.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Printable Receipt Modal */}
      <PrintableReceiptModal
        payment={selectedReceipt}
        open={receiptModalOpen}
        onOpenChange={setReceiptModalOpen}
      />

      {/* Quick Action Modals */}
      <StudentModal open={studentModalOpen} onOpenChange={setStudentModalOpen} />
      <TeacherModal open={teacherModalOpen} onOpenChange={setTeacherModalOpen} />
      <BatchModal open={batchModalOpen} onOpenChange={setBatchModalOpen} />
      <RecordPaymentModal
        open={paymentModalOpen}
        onOpenChange={setPaymentModalOpen}
        onPaymentSuccess={(p) => {
          setSelectedReceipt(p)
          setReceiptModalOpen(true)
        }}
      />
    </div>
  )
}
