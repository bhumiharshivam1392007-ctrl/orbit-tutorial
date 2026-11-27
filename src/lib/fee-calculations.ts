import { format, parseISO, startOfMonth, isBefore, isAfter, addMonths } from "date-fns"
import type { FeeWaiver } from "@/types/database"

export interface MonthInfo {
  date: Date
  isoMonth: string // "2026-11-01"
  label: string // "Nov 2026"
  yearMonth: string // "2026-11"
}

export interface DueCalculationStudent {
  id: string
  fee_start_month?: string | null
  created_at?: string | null
}

export interface DueCalculationEnrollment {
  student_id: string
  batch_id: string
  enrolled_on?: string | null
  status?: string
  students?: {
    id: string
    fee_start_month?: string | null
    created_at?: string | null
    profiles?: {
      full_name: string
      email: string
      phone?: string | null
    }
  }
  batches?: {
    id: string
    name: string
    monthly_fee: number
  }
}

/**
 * Normalizes any date string or Date object to the first day of that month.
 */
export function normalizeMonth(input: Date | string): Date {
  if (typeof input === "string") {
    // If input is like "Nov 2026", parse it or if "2026-11-01" / ISO
    if (/^\d{4}-\d{2}/.test(input)) {
      return startOfMonth(parseISO(input))
    }
    // Try native date parse (e.g. "Nov 2026")
    const parsed = new Date(input)
    if (!isNaN(parsed.getTime())) {
      return startOfMonth(parsed)
    }
    return startOfMonth(new Date())
  }
  return startOfMonth(input)
}

/**
 * Formats a month input into standard formats.
 */
export function getMonthInfo(input: Date | string): MonthInfo {
  const d = normalizeMonth(input)
  return {
    date: d,
    isoMonth: format(d, "yyyy-MM-01"),
    label: format(d, "MMM yyyy"),
    yearMonth: format(d, "yyyy-MM"),
  }
}

/**
 * Computes the effective start month for a student.
 * If fee_start_month is set, use it. Otherwise, use enrolled_on or registration created_at.
 */
export function getEffectiveFeeStartMonth(
  feeStartMonth?: string | null,
  enrolledOn?: string | null,
  studentCreatedAt?: string | null
): Date {
  if (feeStartMonth && feeStartMonth.trim()) {
    return normalizeMonth(feeStartMonth)
  }
  if (enrolledOn && enrolledOn.trim()) {
    return normalizeMonth(enrolledOn)
  }
  if (studentCreatedAt && studentCreatedAt.trim()) {
    return normalizeMonth(studentCreatedAt)
  }
  return startOfMonth(new Date())
}

/**
 * Checks if a specific month is waived for a student and batch.
 * A waiver matches if:
 * 1. The waiver month is the same month (year-month).
 * 2. waiver.student_id is NULL (all students) OR equals studentId.
 * 3. waiver.batch_id is NULL (all batches) OR equals batchId.
 */
export function findMatchingWaiver(
  waivers: FeeWaiver[] | undefined | null,
  studentId: string,
  batchId: string,
  targetMonth: Date | string
): FeeWaiver | undefined {
  if (!waivers || waivers.length === 0) return undefined

  const targetYM = getMonthInfo(targetMonth).yearMonth

  return waivers.find((w) => {
    const waiverYM = getMonthInfo(w.month).yearMonth
    if (waiverYM !== targetYM) return false

    const matchesStudent = w.student_id === null || w.student_id === studentId
    const matchesBatch = w.batch_id === null || w.batch_id === batchId

    return matchesStudent && matchesBatch
  })
}

/**
 * Returns true if a month is waived for the given student and batch.
 */
export function isMonthWaived(
  waivers: FeeWaiver[] | undefined | null,
  studentId: string,
  batchId: string,
  targetMonth: Date | string
): boolean {
  return !!findMatchingWaiver(waivers, studentId, batchId, targetMonth)
}

/**
 * Generates an array of all months between startDate and endDate (inclusive).
 */
export function getMonthsBetween(startDate: Date, endDate: Date): MonthInfo[] {
  const start = startOfMonth(startDate)
  const end = startOfMonth(endDate)

  if (isAfter(start, end)) {
    return []
  }

  const months: MonthInfo[] = []
  let curr = start
  while (!isAfter(curr, end)) {
    months.push(getMonthInfo(curr))
    curr = addMonths(curr, 1)
  }
  return months
}

export type MonthlyFeeStatusType = "paid" | "waived" | "due"

export interface StudentMonthLedgerItem {
  month: MonthInfo
  batch_id: string
  batch_name: string
  monthly_fee: number
  status: MonthlyFeeStatusType
  waiver_reason?: string | null
  payment_id?: string
  payment_date?: string
  payment_mode?: string
  transaction_ref?: string | null
  receipt_ref?: string
}

/**
 * Single shared helper function to evaluate if a target month is owed, waived, or paid.
 */
export function evaluateMonthFeeStatus(params: {
  studentId: string
  batchId: string
  monthlyFee: number
  targetMonth: Date | string
  feeStartMonth?: string | null
  enrolledOn?: string | null
  studentCreatedAt?: string | null
  waivers: FeeWaiver[]
  isPaid: boolean
}): {
  status: "not_started" | "waived" | "paid" | "due"
  isDue: boolean
  waiver?: FeeWaiver
} {
  const {
    studentId,
    batchId,
    monthlyFee,
    targetMonth,
    feeStartMonth,
    enrolledOn,
    studentCreatedAt,
    waivers,
    isPaid,
  } = params

  const targetDate = normalizeMonth(targetMonth)
  const effectiveStart = getEffectiveFeeStartMonth(feeStartMonth, enrolledOn, studentCreatedAt)

  // 1. If target month is prior to effective fee start month, no fee applies
  if (isBefore(targetDate, effectiveStart)) {
    return { status: "not_started", isDue: false }
  }

  // 2. Check if month is waived
  const waiver = findMatchingWaiver(waivers, studentId, batchId, targetDate)
  if (waiver) {
    return { status: "waived", isDue: false, waiver }
  }

  // 3. Check if already paid
  if (isPaid) {
    return { status: "paid", isDue: false }
  }

  // 4. Otherwise, if fee > 0, it is DUE
  if (monthlyFee > 0) {
    return { status: "due", isDue: true }
  }

  return { status: "not_started", isDue: false }
}
