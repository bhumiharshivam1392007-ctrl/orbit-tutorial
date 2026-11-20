import { supabase } from "@/lib/supabase"
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns"
import type { FeePaymentWithDetails } from "@/types/database"

export interface DashboardStats {
  totalStudents: number
  totalTeachers: number
  totalBatches: number
  feesCollectedThisMonth: number
  pendingDuesCount: number
  pendingDuesAmount: number
  recentPayments: FeePaymentWithDetails[]
  monthlyCollectionChart: Array<{
    month: string
    amount: number
  }>
}

export async function fetchAdminDashboardStats(): Promise<DashboardStats> {
  const currentMonthLabel = format(new Date(), "MMM yyyy")
  const startOfCurMonth = format(startOfMonth(new Date()), "yyyy-MM-dd")
  const endOfCurMonth = format(endOfMonth(new Date()), "yyyy-MM-dd")

  // 1. Fetch counts in parallel
  const [
    studentsRes,
    teachersRes,
    batchesRes,
    curMonthPaymentsRes,
    recentPaymentsRes,
    allPaymentsRes,
    enrollmentsRes,
  ] = await Promise.all([
    supabase.from("students").select("id", { count: "exact" }).eq("status", "active"),
    supabase.from("teachers").select("id", { count: "exact" }).eq("status", "active"),
    supabase.from("batches").select("id", { count: "exact" }).eq("status", "active"),
    supabase
      .from("fee_payments")
      .select("amount")
      .eq("status", "paid")
      .gte("payment_date", startOfCurMonth)
      .lte("payment_date", endOfCurMonth),
    supabase
      .from("fee_payments")
      .select(`
        *,
        students (
          id,
          profile_id,
          status,
          profiles (*)
        ),
        batches (*)
      `)
      .order("payment_date", { ascending: false })
      .limit(6),
    supabase
      .from("fee_payments")
      .select("amount, payment_date")
      .eq("status", "paid")
      .order("payment_date", { ascending: true }),
    supabase
      .from("enrollments")
      .select(`
        student_id,
        batch_id,
        batches (
          monthly_fee
        )
      `)
      .eq("status", "active"),
  ])

  // Check for any parallel query errors
  const errors = [
    studentsRes.error,
    teachersRes.error,
    batchesRes.error,
    curMonthPaymentsRes.error,
    recentPaymentsRes.error,
    allPaymentsRes.error,
    enrollmentsRes.error,
  ].filter(Boolean)

  if (errors.length > 0) {
    const primaryError = errors[0]
    console.error("Dashboard query error:", primaryError)
    throw new Error(primaryError?.message || "Failed to load dashboard statistics from Supabase")
  }

  // Fees collected this month
  const feesCollectedThisMonth = (curMonthPaymentsRes.data || []).reduce(
    (acc: number, curr: any) => acc + Number(curr.amount || 0),
    0
  )

  // Calculate pending dues for current month
  const paidPaymentsCurMonthRes = await supabase
    .from("fee_payments")
    .select("student_id, batch_id")
    .eq("month_label", currentMonthLabel)
    .eq("status", "paid")

  const paidSet = new Set(
    (paidPaymentsCurMonthRes.data || []).map((p: any) => `${p.student_id}_${p.batch_id}`)
  )

  let pendingDuesCount = 0
  let pendingDuesAmount = 0

  for (const enr of (enrollmentsRes.data || []) as any[]) {
    const key = `${enr.student_id}_${enr.batch_id}`
    const fee = Number(enr.batches?.monthly_fee || 0)
    if (!paidSet.has(key) && fee > 0) {
      pendingDuesCount++
      pendingDuesAmount += fee
    }
  }

  // Monthly collection chart data (last 6 months)
  const last6Months: Array<{ month: string; amount: number }> = []
  for (let i = 5; i >= 0; i--) {
    const d = subMonths(new Date(), i)
    const mLabel = format(d, "MMM yyyy")
    const mShort = format(d, "MMM")

    // Sum payments for this month
    const total = (allPaymentsRes.data || [])
      .filter((p: any) => {
        if (!p.payment_date) return false
        const pDate = new Date(p.payment_date)
        return format(pDate, "MMM yyyy") === mLabel
      })
      .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0)

    last6Months.push({
      month: mShort,
      amount: total,
    })
  }

  return {
    totalStudents: studentsRes.count || 0,
    totalTeachers: teachersRes.count || 0,
    totalBatches: batchesRes.count || 0,
    feesCollectedThisMonth,
    pendingDuesCount,
    pendingDuesAmount,
    recentPayments: (recentPaymentsRes.data || []) as unknown as FeePaymentWithDetails[],
    monthlyCollectionChart: last6Months,
  }
}

