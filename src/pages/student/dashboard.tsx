import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import {
  BookOpen,
  CheckCircle2,
  CreditCard,
  Bell,
  Clock,
  ArrowRight,
  Printer,
  Calendar,
} from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { StatCard } from "@/components/shared/stat-card"
import { PrintableReceiptModal } from "@/components/shared/printable-receipt"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/hooks/use-auth"
import { fetchStudentDashboard, type StudentFeePaymentItem } from "@/services/student-module"
import { formatCurrency, formatDate } from "@/lib/utils"

export function StudentDashboardPage() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [selectedReceiptPayment, setSelectedReceiptPayment] = useState<StudentFeePaymentItem | null>(null)

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ["student-dashboard", profile?.id],
    queryFn: () => fetchStudentDashboard(profile?.id || ""),
    enabled: !!profile?.id,
  })

  const batches = dashboard?.batches || []
  const attendance = dashboard?.attendance || { total: 0, present: 0, absent: 0, late: 0, percentage: 0 }
  const payments = dashboard?.payments || []
  const notices = dashboard?.recentAnnouncements || []

  // Calculate fee status
  const monthlyFeeTotal = batches.reduce((sum, b) => sum + b.monthly_fee, 0)
  const isUpToDate = payments.length > 0

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${profile?.full_name?.split(" ")[0] || "Student"}! 🎓`}
        description="Here is your personal academic overview, class timings, attendance, and fee history."
        badge={
          <Badge variant="outline" className="border-indigo-400/50 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/40">
            {dashboard?.rollNumber ? `Roll: ${dashboard.rollNumber}` : "Student Portal"}
          </Badge>
        }
      >
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/student/attendance")}
            className="text-xs gap-1.5"
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>Attendance Log</span>
          </Button>
          <Button
            size="sm"
            onClick={() => navigate("/student/fees")}
            className="text-xs gap-1.5 bg-gradient-to-r from-indigo-600 to-violet-600"
          >
            <CreditCard className="h-3.5 w-3.5" />
            <span>My Fee Ledger</span>
          </Button>
        </div>
      </PageHeader>

      {/* 4 Stat Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Enrolled Classes"
          value={isLoading ? "—" : batches.length}
          description="Active learning batches"
          icon={BookOpen}
          delay={0}
        />
        <StatCard
          title="Attendance Rate"
          value={isLoading ? "—" : `${attendance.percentage}%`}
          description={`${attendance.present} of ${attendance.total} sessions`}
          icon={CheckCircle2}
          gradient="from-emerald-500/10 to-teal-500/10 text-emerald-600 dark:text-emerald-400"
          delay={0.05}
        />
        <StatCard
          title="Monthly Tuition"
          value={isLoading ? "—" : formatCurrency(monthlyFeeTotal)}
          description={
            dashboard?.feeStatus
              ? dashboard.feeStatus.statusLabel
              : isUpToDate
              ? "Recent payment recorded"
              : "Pending monthly fee"
          }
          icon={CreditCard}
          gradient={
            dashboard?.feeStatus?.isWaived
              ? "from-amber-500/10 to-orange-500/10 text-amber-600 dark:text-amber-400"
              : dashboard?.feeStatus?.isDue
              ? "from-rose-500/10 to-pink-500/10 text-rose-600 dark:text-rose-400"
              : "from-emerald-500/10 to-teal-500/10 text-emerald-600 dark:text-emerald-400"
          }
          delay={0.1}
        />
        <StatCard
          title="Notice Board"
          value={isLoading ? "—" : notices.length}
          description="Updates & homework"
          icon={Bell}
          gradient="from-violet-500/10 to-purple-500/10 text-violet-600 dark:text-violet-400"
          delay={0.15}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Enrolled Batches (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-indigo-600" />
              <span>My Enrolled Classes</span>
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/student/batches")}
              className="text-xs text-indigo-600 dark:text-indigo-400 gap-1"
            >
              <span>View All</span>
              <ArrowRight className="h-3 w-3" />
            </Button>
          </div>

          {isLoading ? (
            <div className="h-40 rounded-2xl border border-border/60 bg-card p-6 animate-pulse" />
          ) : batches.length > 0 ? (
            <div className="space-y-3">
              {batches.map((batch) => (
                <Card
                  key={batch.batch_id}
                  className="p-4 transition-all hover:border-indigo-500/30 hover:shadow-sm"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[10px] font-semibold">
                          {batch.subject}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3 text-indigo-500" />
                          {batch.timing}
                        </span>
                      </div>
                      <h4 className="font-bold text-base text-foreground">
                        {batch.batch_name}
                      </h4>
                      {batch.teacher_name && (
                        <p className="text-xs text-muted-foreground">
                          Instructor: <strong className="text-foreground">{batch.teacher_name}</strong>
                          {batch.teacher_subject ? ` (${batch.teacher_subject})` : ""}
                        </p>
                      )}
                    </div>

                    <div className="sm:text-right flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-2 sm:pt-0">
                      <span className="text-xs text-muted-foreground">Monthly Fee</span>
                      <span className="text-sm font-bold text-foreground">
                        {formatCurrency(batch.monthly_fee)}
                      </span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center text-muted-foreground">
              <p className="text-sm font-medium">You are not currently enrolled in any active batch.</p>
              <p className="text-xs text-muted-foreground mt-1">Please contact your institute admin to assign you to your class.</p>
            </Card>
          )}

          {/* Attendance Breakdown Card */}
          <Card className="p-5">
            <h4 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>Attendance Record Breakdown</span>
            </h4>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                <span className="text-xs text-emerald-600 font-semibold block">Present</span>
                <span className="text-xl font-bold text-emerald-600">{attendance.present}</span>
              </div>
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                <span className="text-xs text-amber-600 font-semibold block">Late</span>
                <span className="text-xl font-bold text-amber-600">{attendance.late}</span>
              </div>
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3">
                <span className="text-xs text-rose-600 font-semibold block">Absent</span>
                <span className="text-xl font-bold text-rose-600">{attendance.absent}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Notices & Payment History (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Recent Notices */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Bell className="h-4 w-4 text-indigo-600" />
                <span>Notice Board</span>
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/student/announcements")}
                className="text-xs text-indigo-600 dark:text-indigo-400 gap-1"
              >
                <span>All Notices</span>
                <ArrowRight className="h-3 w-3" />
              </Button>
            </div>

            {isLoading ? (
              <div className="h-32 rounded-2xl border border-border/60 bg-card p-4 animate-pulse" />
            ) : notices.length > 0 ? (
              <div className="space-y-3">
                {notices.slice(0, 3).map((notice) => (
                  <Card key={notice.id} className="p-4 hover:border-indigo-500/30 transition-all">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Badge variant="outline" className="text-[10px]">
                        {notice.batch_name || "Institute Notice"}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground">
                        {formatDate(notice.created_at)}
                      </span>
                    </div>
                    <h5 className="font-bold text-sm text-foreground line-clamp-1">
                      {notice.title}
                    </h5>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {notice.content}
                    </p>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-6 text-center text-xs text-muted-foreground">
                No recent announcements posted yet.
              </Card>
            )}
          </div>

          {/* Recent Payment Receipts */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-emerald-600" />
                <span>Payment Receipts</span>
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/student/fees")}
                className="text-xs text-emerald-600 dark:text-emerald-400 gap-1"
              >
                <span>Full Ledger</span>
                <ArrowRight className="h-3 w-3" />
              </Button>
            </div>

            {isLoading ? (
              <div className="h-32 rounded-2xl border border-border/60 bg-card p-4 animate-pulse" />
            ) : payments.length > 0 ? (
              <div className="space-y-2">
                {payments.slice(0, 3).map((pay) => (
                  <div
                    key={pay.id}
                    className="p-3 rounded-xl border border-border/60 bg-card flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground">
                          {pay.month_label}
                        </span>
                        <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30">
                          {pay.payment_mode.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {formatDate(pay.payment_date)} • {pay.batch_name}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground">
                        {formatCurrency(pay.amount)}
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-indigo-600"
                        title="Print Receipt"
                        onClick={() => setSelectedReceiptPayment(pay)}
                      >
                        <Printer className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Card className="p-6 text-center text-xs text-muted-foreground">
                No payment history on record.
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Printable Receipt Dialog */}
      {selectedReceiptPayment && (
        <PrintableReceiptModal
          open={!!selectedReceiptPayment}
          onOpenChange={(isOpen: boolean) => {
            if (!isOpen) setSelectedReceiptPayment(null)
          }}
          payment={{
            id: selectedReceiptPayment.id,
            student_id: dashboard?.studentId || "",
            batch_id: selectedReceiptPayment.batch_id,
            amount: selectedReceiptPayment.amount,
            payment_mode: selectedReceiptPayment.payment_mode,
            transaction_ref: selectedReceiptPayment.transaction_ref,
            payment_date: selectedReceiptPayment.payment_date,
            month_label: selectedReceiptPayment.month_label,
            status: selectedReceiptPayment.status,
            notes: null,
            recorded_by: null,
            created_at: selectedReceiptPayment.created_at,
            students: {
              profiles: {
                full_name: profile?.full_name || "Student",
                email: profile?.email || "",
                phone: profile?.phone || "",
              },
            },
            batches: {
              name: selectedReceiptPayment.batch_name,
              subject: "",
              timing: "",
            },
          } as any}
        />
      )}
    </div>
  )
}
