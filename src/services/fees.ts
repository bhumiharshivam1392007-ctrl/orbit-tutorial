import { supabase } from "@/lib/supabase"
import type { FeePaymentWithDetails, FeeStructure } from "@/types/database"
import { format } from "date-fns"

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

export async function fetchFeePayments(): Promise<FeePaymentWithDetails[]> {
  const { data, error } = await supabase
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

export async function fetchPendingDues(targetMonth = format(new Date(), "MMM yyyy")): Promise<PendingDueItem[]> {
  // 1. Fetch active enrollments with student profile and batch fee
  const { data: enrollments, error: enrollError } = await supabase
    .from("enrollments")
    .select(`
      student_id,
      batch_id,
      status,
      students (
        id,
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
    .eq("month_label", targetMonth)
    .eq("status", "paid")

  if (payError) throw payError

  const paidMap = new Set(
    ((payments || []) as any[]).map((p) => `${p.student_id}_${p.batch_id}`)
  )

  const dues: PendingDueItem[] = []

  for (const item of (enrollments || []) as any[]) {
    const key = `${item.student_id}_${item.batch_id}`
    if (!paidMap.has(key) && item.batches?.monthly_fee > 0) {
      dues.push({
        student_id: item.student_id,
        student_name: item.students?.profiles?.full_name || "Unknown",
        student_email: item.students?.profiles?.email || "",
        student_phone: item.students?.profiles?.phone || null,
        batch_id: item.batch_id,
        batch_name: item.batches?.name || "Batch",
        monthly_fee: Number(item.batches?.monthly_fee || 0),
        month_label: targetMonth,
      })
    }
  }

  return dues
}
