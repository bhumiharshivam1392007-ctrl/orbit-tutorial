import { supabase } from "@/lib/supabase"
import type { AttendanceStatus, PaymentMode } from "@/types/database"
import {
  getEffectiveFeeStartMonth,
  getMonthInfo,
  getMonthsBetween,
  findMatchingWaiver,
  evaluateMonthFeeStatus,
} from "@/lib/fee-calculations"
import { startOfMonth, isAfter } from "date-fns"

export interface StudentSubjectItem {
  id: string
  subject: string
  teacher_name?: string
  teacher_email?: string
  days: string
  timing: string
}

export interface StudentBatchInfo {
  enrollment_id: string
  batch_id: string
  batch_name: string
  subject: string
  timing: string
  monthly_fee: number
  enrolled_at: string
  teacher_name?: string
  teacher_email?: string
  teacher_subject?: string
  subjects?: StudentSubjectItem[]
}

export interface StudentFeePaymentItem {
  id: string
  batch_id: string
  batch_name: string
  amount: number
  payment_mode: PaymentMode
  transaction_ref: string | null
  payment_date: string
  month_label: string
  status: "paid" | "partial" | "refunded"
  created_at: string
}

export interface StudentMonthLedgerItem {
  id: string
  batch_id: string
  batch_name: string
  month_label: string
  month_iso: string
  monthly_fee: number
  status: "paid" | "waived" | "due"
  waiver_reason?: string | null
  payment_id?: string
  payment_date?: string
  payment_mode?: string
  transaction_ref?: string | null
  payment_item?: StudentFeePaymentItem
}

export interface StudentAttendanceRecord {
  id: string
  batch_id: string
  batch_name: string
  date: string
  status: AttendanceStatus
  created_at: string
}

export interface StudentAnnouncementItem {
  id: string
  title: string
  content: string
  target_audience: "all" | "teachers" | "students"
  target_batch_id: string | null
  batch_name?: string
  created_at: string
}

export interface StudentDashboardData {
  studentId: string | null
  rollNumber: string | null
  guardianName: string | null
  batches: StudentBatchInfo[]
  attendance: {
    total: number
    present: number
    absent: number
    late: number
    percentage: number
  }
  payments: StudentFeePaymentItem[]
  recentAnnouncements: StudentAnnouncementItem[]
  feeStatus?: {
    isDue: boolean
    isWaived: boolean
    isPaid: boolean
    statusLabel: string
  }
}

/**
 * Fetch the student record linked to the logged-in profile ID
 */
export async function getStudentByProfileId(profileId: string): Promise<any> {
  if (!profileId) return null

  // 1. Fetch from students table using only actual existing schema columns
  const { data, error } = await supabase
    .from("students")
    .select("id, profile_id, guardian_name, guardian_phone, address, date_of_birth, gender, status, created_at, fee_start_month")
    .eq("profile_id", profileId)
    .maybeSingle()

  if (error) {
    console.warn("Could not query students table:", error.message)
    return null
  }

  // 2. If student record exists, return it
  if (data) return data

  // 3. Fallback: If student profile exists but row in students table is missing, auto-create it
  try {
    const { data: newStudent } = await supabase
      .from("students")
      .insert({
        profile_id: profileId,
        status: "active",
      } as any)
      .select("id, profile_id, guardian_name, guardian_phone, address, date_of_birth, gender, status, created_at, fee_start_month")
      .maybeSingle()

    if (newStudent) return newStudent
  } catch (err) {
    console.warn("Notice: could not auto-create student row:", err)
  }

  return null
}

/**
 * Fetch complete dashboard information for the student
 */
export async function fetchStudentDashboard(profileId: string): Promise<StudentDashboardData> {
  // 1. Fetch student record
  const student = await getStudentByProfileId(profileId)
  const studentId = student?.id || null

  let batches: StudentBatchInfo[] = []
  let attendanceStats = {
    total: 0,
    present: 0,
    absent: 0,
    late: 0,
    percentage: 0,
  }
  let payments: StudentFeePaymentItem[] = []
  let announcements: StudentAnnouncementItem[] = []

  // 2. Fetch enrolled batches
  if (studentId) {
    const { data: enrollmentsData, error: enrollError } = await supabase
      .from("enrollments")
      .select(`
        id,
        enrolled_on,
        batch_id,
        status,
        batches (
          id,
          name,
          subject,
          timing,
          monthly_fee,
          teacher_id,
          batch_subjects (
            id,
            subject,
            teacher_id,
            days,
            start_time,
            end_time,
            teachers (
              id,
              subject,
              profiles (
                full_name,
                email
              )
            )
          ),
          teachers (
            id,
            subject,
            profiles (
              full_name,
              email
            )
          )
        )
      `)
      .eq("student_id", studentId)

    if (enrollError) {
      console.error("Error fetching student enrollments:", enrollError)
    }

    if (enrollmentsData) {
      batches = enrollmentsData
        .filter((e: any) => e.batches && e.status !== "left")
        .map((e: any) => {
          const b = e.batches
          const teacherProfile = b.teachers?.profiles
          const subsList: StudentSubjectItem[] = (b.batch_subjects || []).map((bs: any) => {
            const time = bs.start_time && bs.end_time ? `${bs.start_time.slice(0, 5)} - ${bs.end_time.slice(0, 5)}` : (bs.days || "Scheduled")
            return {
              id: bs.id,
              subject: bs.subject,
              teacher_name: bs.teachers?.profiles?.full_name || undefined,
              teacher_email: bs.teachers?.profiles?.email || undefined,
              days: bs.days || "Mon-Fri",
              timing: time,
            }
          })

          const subjectsSummary = subsList.length > 0 ? subsList.map((s) => s.subject).join(", ") : b.subject
          const timingSummary = subsList.length > 0 ? subsList.map((s) => `${s.subject}: ${s.days} ${s.timing}`).join(" | ") : b.timing

          return {
            enrollment_id: e.id,
            batch_id: b.id,
            batch_name: b.name,
            subject: subjectsSummary || "All Core Subjects",
            timing: timingSummary || "Scheduled",
            monthly_fee: Number(b.monthly_fee) || 0,
            enrolled_at: e.enrolled_on || "",
            teacher_name: teacherProfile?.full_name || undefined,
            teacher_email: teacherProfile?.email || undefined,
            teacher_subject: b.teachers?.subject || undefined,
            subjects: subsList,
          }
        })
    }

    // 3. Fetch attendance stats
    const { data: attData, error: attError } = await supabase
      .from("attendance")
      .select("id, status")
      .eq("student_id", studentId)

    if (attError) {
      console.warn("Notice fetching student attendance:", attError.message)
    }

    if (attData && attData.length > 0) {
      const total = attData.length
      const present = attData.filter((a) => a.status === "present").length
      const absent = attData.filter((a) => a.status === "absent").length
      const late = attData.filter((a) => a.status === "late").length
      const percentage = Math.round(((present + late * 0.5) / total) * 100)

      attendanceStats = {
        total,
        present,
        absent,
        late,
        percentage,
      }
    }

    // 4. Fetch fee payments
    const { data: paymentData, error: payError } = await supabase
      .from("fee_payments")
      .select(`
        id,
        batch_id,
        amount,
        payment_mode,
        transaction_ref,
        payment_date,
        month_label,
        status,
        created_at,
        batches (
          name
        )
      `)
      .eq("student_id", studentId)
      .order("payment_date", { ascending: false })
      .limit(10)

    if (payError) {
      console.warn("Notice fetching student fee payments:", payError.message)
    }

    if (paymentData) {
      payments = paymentData.map((p: any) => ({
        id: p.id,
        batch_id: p.batch_id,
        batch_name: p.batches?.name || "Tuition Fee",
        amount: Number(p.amount) || 0,
        payment_mode: p.payment_mode,
        transaction_ref: p.transaction_ref,
        payment_date: p.payment_date,
        month_label: p.month_label,
        status: p.status,
        created_at: p.created_at,
      }))
    }
  }

  // 5. Fetch announcements visible to student
  const batchIds = batches.map((b) => b.batch_id)
  let annQuery = supabase
    .from("announcements")
    .select("id, title, content, target_audience, target_batch_id, created_at")
    .order("created_at", { ascending: false })
    .limit(8)

  if (batchIds.length > 0) {
    annQuery = annQuery.or(
      `target_audience.in.(all,students),target_batch_id.in.(${batchIds.join(",")})`
    )
  } else {
    annQuery = annQuery.in("target_audience", ["all", "students"])
  }

  const { data: annData, error: annError } = await annQuery
  if (annError) {
    console.warn("Notice fetching student announcements:", annError.message)
  }

  if (annData) {
    announcements = annData.map((a: any) => {
      const matchedBatch = batches.find((b) => b.batch_id === a.target_batch_id)
      return {
        id: a.id,
        title: a.title,
        content: a.content,
        target_audience: a.target_audience,
        target_batch_id: a.target_batch_id,
        batch_name: matchedBatch?.batch_name,
        created_at: a.created_at,
      }
    })
  }

  // 6. Compute current month fee status (taking fee_start_month and waivers into account)
  let feeStatus: { isDue: boolean; isWaived: boolean; isPaid: boolean; statusLabel: string } = {
    isDue: false,
    isWaived: false,
    isPaid: false,
    statusLabel: "Up to date",
  }

  if (student && batches.length > 0) {
    const curMonthInfo = getMonthInfo(new Date())
    let waivers: any[] = []
    try {
      const { data: wData } = await supabase
        .from("fee_waivers")
        .select("*")
        .or(`student_id.eq.${student.id},student_id.is.null`)
      waivers = wData || []
    } catch {
      waivers = []
    }

    let anyDue = false
    let allWaived = true

    for (const b of batches) {
      const isPaid = payments.some(
        (p) =>
          p.batch_id === b.batch_id &&
          (p.month_label === curMonthInfo.label || getMonthInfo(p.month_label).yearMonth === curMonthInfo.yearMonth) &&
          p.status === "paid"
      )

      const evalResult = evaluateMonthFeeStatus({
        studentId: student.id,
        batchId: b.batch_id,
        monthlyFee: b.monthly_fee,
        targetMonth: curMonthInfo.date,
        feeStartMonth: student.fee_start_month,
        enrolledOn: b.enrolled_at,
        studentCreatedAt: student.created_at,
        waivers,
        isPaid,
      })

      if (evalResult.isDue) {
        anyDue = true
        allWaived = false
      } else if (evalResult.status === "paid") {
        allWaived = false
      }
    }

    if (anyDue) {
      feeStatus = { isDue: true, isWaived: false, isPaid: false, statusLabel: "Pending monthly fee" }
    } else if (allWaived && batches.length > 0) {
      feeStatus = { isDue: false, isWaived: true, isPaid: false, statusLabel: "Fee waived this month" }
    } else {
      feeStatus = { isDue: false, isWaived: false, isPaid: true, statusLabel: "Up to date" }
    }
  }

  return {
    studentId,
    rollNumber: studentId ? studentId.slice(0, 8).toUpperCase() : null,
    guardianName: student?.guardian_name || null,
    batches,
    attendance: attendanceStats,
    payments,
    recentAnnouncements: announcements,
    feeStatus,
  }
}

/**
 * Fetch detailed daily attendance records for a student
 */
export async function fetchStudentAttendanceHistory(profileId: string): Promise<StudentAttendanceRecord[]> {
  const student = await getStudentByProfileId(profileId)
  if (!student) return []

  const { data, error } = await supabase
    .from("attendance")
    .select(`
      id,
      batch_id,
      date,
      status,
      created_at,
      batches (
        name
      )
    `)
    .eq("student_id", student.id)
    .order("date", { ascending: false })

  if (error || !data) return []

  return data.map((d: any) => ({
    id: d.id,
    batch_id: d.batch_id,
    batch_name: d.batches?.name || "Batch",
    date: d.date,
    status: d.status,
    created_at: d.created_at,
  }))
}

/**
 * Fetch full fee ledger for the student
 */
export async function fetchStudentFeeLedger(profileId: string): Promise<{
  batches: StudentBatchInfo[]
  payments: StudentFeePaymentItem[]
  totalPaid: number
  monthlyTotal: number
  ledgerItems: StudentMonthLedgerItem[]
}> {
  const student = await getStudentByProfileId(profileId)
  if (!student) {
    return { batches: [], payments: [], totalPaid: 0, monthlyTotal: 0, ledgerItems: [] }
  }

  // 1. Fetch batches
  const { data: enrollments, error: enrollError } = await supabase
    .from("enrollments")
    .select(`
      id,
      enrolled_on,
      batch_id,
      status,
      batches (
        id,
        name,
        subject,
        timing,
        monthly_fee
      )
    `)
    .eq("student_id", student.id)

  if (enrollError) {
    console.warn("Notice fetching student fee enrollments:", enrollError.message)
  }

  const batches: StudentBatchInfo[] = (enrollments || [])
    .filter((e: any) => e.batches && e.status !== "left")
    .map((e: any) => ({
      enrollment_id: e.id,
      batch_id: e.batches.id,
      batch_name: e.batches.name,
      subject: e.batches.subject || "All Core Subjects",
      timing: e.batches.timing || "Class Timetable",
      monthly_fee: Number(e.batches.monthly_fee) || 0,
      enrolled_at: e.enrolled_on || "",
    }))

  const monthlyTotal = batches.reduce((sum, b) => sum + b.monthly_fee, 0)

  // 2. Fetch payments
  const { data: paymentRows, error: payError } = await supabase
    .from("fee_payments")
    .select(`
      id,
      batch_id,
      amount,
      payment_mode,
      transaction_ref,
      payment_date,
      month_label,
      status,
      created_at,
      batches (
        name
      )
    `)
    .eq("student_id", student.id)
    .order("payment_date", { ascending: false })

  if (payError) {
    console.warn("Notice fetching student fee payments:", payError.message)
  }

  const payments: StudentFeePaymentItem[] = (paymentRows || []).map((p: any) => ({
    id: p.id,
    batch_id: p.batch_id,
    batch_name: p.batches?.name || "Tuition Fee",
    amount: Number(p.amount) || 0,
    payment_mode: p.payment_mode,
    transaction_ref: p.transaction_ref,
    payment_date: p.payment_date,
    month_label: p.month_label,
    status: p.status,
    created_at: p.created_at,
  }))

  const totalPaid = payments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + p.amount, 0)

  // 3. Fetch active waivers applicable to this student
  let waivers: any[] = []
  try {
    const { data: waiverData } = await supabase
      .from("fee_waivers")
      .select("*")
      .or(`student_id.eq.${student.id},student_id.is.null`)
    waivers = waiverData || []
  } catch {
    waivers = []
  }

  // 4. Build monthly ledger items
  const ledgerItems: StudentMonthLedgerItem[] = []
  const curMonth = startOfMonth(new Date())

  for (const b of batches) {
    const enrollment = (enrollments || []).find((e: any) => e.batch_id === b.batch_id)
    const effectiveStart = getEffectiveFeeStartMonth(
      student.fee_start_month,
      enrollment?.enrolled_on || b.enrolled_at,
      student.created_at
    )

    // If start month is in the future, student fee hasn't started yet
    if (isAfter(effectiveStart, curMonth)) {
      continue
    }

    const months = getMonthsBetween(effectiveStart, curMonth)

    for (const m of months) {
      // Find matching payment for this month & batch
      const pay = payments.find(
        (p) =>
          p.batch_id === b.batch_id &&
          (p.month_label === m.label || getMonthInfo(p.month_label).yearMonth === m.yearMonth) &&
          p.status === "paid"
      )

      if (pay) {
        ledgerItems.push({
          id: `${b.batch_id}_${m.isoMonth}`,
          batch_id: b.batch_id,
          batch_name: b.batch_name,
          month_label: m.label,
          month_iso: m.isoMonth,
          monthly_fee: b.monthly_fee,
          status: "paid",
          payment_id: pay.id,
          payment_date: pay.payment_date,
          payment_mode: pay.payment_mode,
          transaction_ref: pay.transaction_ref,
          payment_item: pay,
        })
        continue
      }

      // Check waiver
      const waiver = findMatchingWaiver(waivers, student.id, b.batch_id, m.date)
      if (waiver) {
        ledgerItems.push({
          id: `${b.batch_id}_${m.isoMonth}`,
          batch_id: b.batch_id,
          batch_name: b.batch_name,
          month_label: m.label,
          month_iso: m.isoMonth,
          monthly_fee: b.monthly_fee,
          status: "waived",
          waiver_reason: waiver.reason || "Fee waived by administration",
        })
        continue
      }

      // If fee > 0, it's due
      if (b.monthly_fee > 0) {
        ledgerItems.push({
          id: `${b.batch_id}_${m.isoMonth}`,
          batch_id: b.batch_id,
          batch_name: b.batch_name,
          month_label: m.label,
          month_iso: m.isoMonth,
          monthly_fee: b.monthly_fee,
          status: "due",
        })
      }
    }
  }

  // Sort newest months first
  ledgerItems.sort((a, b) => b.month_iso.localeCompare(a.month_iso))

  return {
    batches,
    payments,
    totalPaid,
    monthlyTotal,
    ledgerItems,
  }
}
