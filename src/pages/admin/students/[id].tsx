import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Layers,
  Receipt,
  CheckCircle2,
  Printer,
  Clock,
} from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { StatCard } from "@/components/shared/stat-card"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { fetchStudentById } from "@/services/students"
import { PrintableReceiptModal } from "@/components/shared/printable-receipt"
import { formatCurrency, formatDate, getInitials } from "@/lib/utils"
import type { FeePaymentWithDetails } from "@/types/database"

export function StudentProfilePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [selectedReceipt, setSelectedReceipt] = useState<FeePaymentWithDetails | null>(null)
  const [receiptModalOpen, setReceiptModalOpen] = useState(false)

  const { data: student, isLoading } = useQuery({
    queryKey: ["student", id],
    queryFn: () => fetchStudentById(id!),
    enabled: !!id,
  })

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-muted/60 rounded" />
        <div className="h-32 bg-card rounded-2xl border" />
        <div className="grid grid-cols-3 gap-4">
          <div className="h-28 bg-card rounded-2xl border" />
          <div className="h-28 bg-card rounded-2xl border" />
          <div className="h-28 bg-card rounded-2xl border" />
        </div>
      </div>
    )
  }

  if (!student) {
    return (
      <div className="text-center py-16 space-y-3">
        <h2 className="text-xl font-bold">Student Not Found</h2>
        <Button onClick={() => navigate("/admin/students")}>Back to Directory</Button>
      </div>
    )
  }

  const enrollments = (student.enrollments || []).filter((e: any) => e.status === "active")
  const totalPaid = (student.payments || []).reduce(
    (sum: number, p: any) => sum + Number(p.amount || 0),
    0
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/admin/students")}
          className="h-9 w-9 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <PageHeader
          title={student.profiles?.full_name || "Student Profile"}
          description={`Enrolled student account • Registered on ${formatDate(student.created_at)}`}
          badge={
            <Badge
              variant={student.status === "active" ? "success" : "secondary"}
              className="text-xs capitalize"
            >
              {student.status}
            </Badge>
          }
          className="pb-0"
        />
      </div>

      {/* Header Profile Card */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 ring-4 ring-indigo-500/20">
              <AvatarFallback className="text-xl font-bold">
                {getInitials(student.profiles?.full_name || "S")}
              </AvatarFallback>
            </Avatar>

            <div className="space-y-1">
              <h3 className="text-xl font-bold text-foreground">
                {student.profiles?.full_name}
              </h3>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-indigo-500" />
                  {student.profiles?.email}
                </span>
                {student.profiles?.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-indigo-500" />
                    {student.profiles.phone}
                  </span>
                )}
                {student.date_of_birth && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                    DOB: {formatDate(student.date_of_birth)}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/admin/fees")}
              className="gap-2"
            >
              <Receipt className="h-4 w-4" />
              <span>Record Fee</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Active Batches"
          value={enrollments.length}
          description="Enrolled courses"
          icon={Layers}
          delay={0}
        />
        <StatCard
          title="Attendance Rate"
          value={`${student.attendanceRate}%`}
          change={`${student.totalAttendanceRecords} sessions`}
          trend="neutral"
          icon={CheckCircle2}
          gradient="from-emerald-500/10 to-teal-500/10 text-emerald-600 dark:text-emerald-400"
          delay={0.05}
        />
        <StatCard
          title="Total Fees Paid"
          value={formatCurrency(totalPaid)}
          description={`${student.payments?.length || 0} payments recorded`}
          icon={Receipt}
          gradient="from-amber-500/10 to-orange-500/10 text-amber-600 dark:text-amber-400"
          delay={0.1}
        />
      </div>

      {/* Profile Detail Tabs */}
      <Tabs defaultValue="batches" className="space-y-4">
        <TabsList className="bg-muted/60 p-1 rounded-xl">
          <TabsTrigger value="batches" className="rounded-lg text-xs font-semibold">
            Enrolled Batches ({enrollments.length})
          </TabsTrigger>
          <TabsTrigger value="payments" className="rounded-lg text-xs font-semibold">
            Fee History ({student.payments?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="info" className="rounded-lg text-xs font-semibold">
            Guardian & Personal Info
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Enrolled Batches */}
        <TabsContent value="batches" className="space-y-4">
          {enrollments.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {enrollments.map((e: any) => (
                <Card key={e.id} className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <Badge variant="secondary" className="text-[10px] mb-1.5 text-indigo-600 dark:text-indigo-400">
                        {e.batches?.subject}
                      </Badge>
                      <h4 className="font-bold text-base text-foreground">
                        {e.batches?.name}
                      </h4>
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                        <Clock className="h-3 w-3 text-indigo-500" />
                        {e.batches?.timing}
                      </p>
                    </div>

                    <span className="font-bold text-sm text-foreground">
                      {formatCurrency(e.batches?.monthly_fee || 0)} / mo
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center text-muted-foreground text-sm">
              Not currently enrolled in any batches.
            </Card>
          )}
        </TabsContent>

        {/* Tab 2: Payments History */}
        <TabsContent value="payments">
          {(student.payments || []).length > 0 ? (
            <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/40 border-b border-border/60 text-xs font-semibold text-muted-foreground uppercase">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Batch</th>
                    <th className="py-3 px-4">Month</th>
                    <th className="py-3 px-4">Mode</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4 text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {(student.payments || []).map((p: any) => (
                    <tr key={p.id} className="hover:bg-accent/40">
                      <td className="py-3 px-4 text-xs font-mono">
                        {formatDate(p.payment_date)}
                      </td>
                      <td className="py-3 px-4 font-medium text-foreground">
                        {p.batches?.name}
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">
                        {p.month_label}
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
                          className="h-8 gap-1.5 text-xs text-indigo-600"
                          onClick={() => {
                            setSelectedReceipt({
                              ...p,
                              students: student,
                            })
                            setReceiptModalOpen(true)
                          }}
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
          ) : (
            <Card className="p-8 text-center text-muted-foreground text-sm">
              No payment transactions recorded for this student yet.
            </Card>
          )}
        </TabsContent>

        {/* Tab 3: Personal & Guardian Info */}
        <TabsContent value="info">
          <Card className="p-6 space-y-6">
            <div>
              <h4 className="text-sm font-bold text-foreground uppercase tracking-wider mb-3">
                Guardian Details
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground block">Guardian Name</span>
                  <span className="font-medium text-foreground">
                    {student.guardian_name || "Not specified"}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Guardian Contact</span>
                  <span className="font-medium text-foreground">
                    {student.guardian_phone || "Not specified"}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-border/60">
              <h4 className="text-sm font-bold text-foreground uppercase tracking-wider mb-3">
                Residential Address
              </h4>
              <p className="text-sm text-foreground flex items-center gap-2">
                <MapPin className="h-4 w-4 text-indigo-500 shrink-0" />
                {student.address || "No address entered"}
              </p>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Printable Receipt Modal */}
      <PrintableReceiptModal
        payment={selectedReceipt}
        open={receiptModalOpen}
        onOpenChange={setReceiptModalOpen}
      />
    </div>
  )
}
