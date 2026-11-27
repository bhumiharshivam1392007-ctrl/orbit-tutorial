import { supabase } from "@/lib/supabase"
import type { FeePaymentWithDetails, FeeStructure, FeeWaiver, FeeWaiverWithDetails } from "@/types/database"
import { format } from "date-fns"
import { evaluateMonthFeeStatus, getMonthInfo } from "@/lib/fee-calculations"

export interface RecordPaymentFormData {
  student_id: string
  batch_id: string
  amount: number
  payment_mode: "cash" | "upi" | "bank_transfer"
  transaction_ref?: string
  payment_date?: string
  month_label: string
  status?: "paid" | "partial" | "refunded"
  notes?: string
}

export interface PendingDueItem {
  student_id: string
  student_name: string
  student_phone: string | null
  student_email: string
  batch_id: string
  batch_name: string
  monthly_fee: number
  month_label: string
}

export interface CreateFeeWaiverInput {
  student_id?: string | null
  batch_id?: string | null
  month: string // "yyyy-MM-01" or Date
  reason?: string | null
}

export async function fetchFeePayments(): Promise<FeePaymentWithDetails[]> {
  const { data, error } = await supabase
    .from("fee_payments")
    .select(`
      *,
      students (
        id,
        profile_id,
        status,
        fee_start_month,
        profiles (*)
      ),
      batches (*)
    `)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching fee payments:", error)
    throw error
  }

  return (data || []) as unknown as FeePaymentWithDetails[]
}

export async function recordFeePayment(data: RecordPaymentFormData, recordedByProfileId?: string) {
  const { data: newPayment, error } = await supabase
    .from("fee_payments")
    .insert({
      student_id: data.student_id,
      batch_id: data.batch_id,
      amount: Number(data.amount),
      payment_mode: data.payment_mode,
      transaction_ref: data.transaction_ref || null,
      payment_date: data.payment_date || format(new Date(), "yyyy-MM-dd"),
      month_label: data.month_label,
      status: data.status || "paid",
      notes: data.notes || null,
      recorded_by: recordedByProfileId || null,
    } as any)
    .select(`
      *,
      students (
        id,
        profiles (*)
      ),
      batches (*)
    `)
    .single()

  if (error) throw error
  return newPayment
}

export async function fetchFeeStructures(): Promise<FeeStructure[]> {
  const { data, error } = await supabase
    .from("fee_structures")
    .select(`
      *,
      batches (*)
    `)
    .order("amount", { ascending: false })

  if (error) throw error
  return (data || []) as unknown as FeeStructure[]
}

export async function fetchFeeWaivers(): Promise<FeeWaiverWithDetails[]> {
  const { data, error } = await supabase
    .from("fee_waivers")
    .select(`
      *,
      students (
        id,
        profiles (
          full_name,
          email
        )
      ),
      batches (
        id,
        name
      )
    `)
    .order("month", { ascending: false })

  if (error) {
    console.error("Error fetching fee waivers:", error)
    // If table doesn't exist yet in local/preview env, fail gracefully with empty array
    return []
  }

  return (data || []) as unknown as FeeWaiverWithDetails[]
}

export async function createFeeWaiver(input: CreateFeeWaiverInput): Promise<FeeWaiver> {
  const monthInfo = getMonthInfo(input.month)

  const { data, error } = await supabase
    .from("fee_waivers")
    .insert({
      student_id: input.student_id || null,
      batch_id: input.batch_id || null,
      month: monthInfo.isoMonth,
      reason: input.reason?.trim() || null,
    } as any)
    .select()
    .single()

  if (error) {
    console.error("Error creating fee waiver:", error)
    if (error.code === "23505") {
      throw new Error("A fee waiver for this student/batch and month already exists.")
    }
    throw error
  }

  return data as unknown as FeeWaiver
}

export async function deleteFeeWaiver(waiverId: string): Promise<void> {
  const { error } = await supabase
    .from("fee_waivers")
    .delete()
    .eq("id", waiverId)

  if (error) {
    console.error("Error deleting fee waiver:", error)
    throw error
  }
}

export async function fetchPendingDues(targetMonth = format(new Date(), "MMM yyyy")): Promise<PendingDueItem[]> {
  const targetMonthInfo = getMonthInfo(targetMonth)

  // 1. Fetch active enrollments with student profile and batch fee
  const { data: enrollments, error: enrollError } = await supabase
    .from("enrollments")
    .select(`
      student_id,
      batch_id,
      status,
      enrolled_on,
      students (
        id,
        fee_start_month,
        created_at,
        profiles (
          full_name,
          email,
          phone
        )
      ),
      batches (
        id,
        name,
        monthly_fee
      )
    `)
    .eq("status", "active")

  if (enrollError) throw enrollError

  // 2. Fetch payments recorded for this target month
  const { data: payments, error: payError } = await supabase
    .from("fee_payments")
    .select("student_id, batch_id, amount, status")
    .eq("month_label", targetMonthInfo.label)
    .eq("status", "paid")

  if (payError) throw payError

  const paidMap = new Set(
    ((payments || []) as any[]).map((p) => `${p.student_id}_${p.batch_id}`)
  )

  // 3. Fetch active waivers to exclude waived months
  let waivers: FeeWaiver[] = []
  try {
    waivers = (await fetchFeeWaivers()) as unknown as FeeWaiver[]
  } catch {
    waivers = []
  }

  const dues: PendingDueItem[] = []

  for (const item of (enrollments || []) as any[]) {
    const key = `${item.student_id}_${item.batch_id}`
    const isPaid = paidMap.has(key)
    const monthlyFee = Number(item.batches?.monthly_fee || 0)

    const evaluation = evaluateMonthFeeStatus({
      studentId: item.student_id,
      batchId: item.batch_id,
      monthlyFee,
      targetMonth: targetMonthInfo.date,
      feeStartMonth: item.students?.fee_start_month,
      enrolledOn: item.enrolled_on,
      studentCreatedAt: item.students?.created_at,
      waivers,
      isPaid,
    })

    if (evaluation.isDue) {
      dues.push({
        student_id: item.student_id,
        student_name: item.students?.profiles?.full_name || "Unknown",
        student_email: item.students?.profiles?.email || "",
        student_phone: item.students?.profiles?.phone || null,
        batch_id: item.batch_id,
        batch_name: item.batches?.name || "Batch",
        monthly_fee: monthlyFee,
        month_label: targetMonthInfo.label,
      })
    }
  }

  return dues
}
