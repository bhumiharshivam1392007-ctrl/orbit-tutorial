import { supabase } from "@/lib/supabase"
import type { AttendanceStatus, PaymentMode } from "@/types/database"

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
}

/**
 * Fetch the student record linked to the logged-in profile ID
 */
export async function getStudentByProfileId(profileId: string) {
  const { data, error } = await supabase
    .from("students")
    .select("id, profile_id, roll_number, guardian_name, guardian_phone, admission_date")
    .eq("profile_id", profileId)
    .maybeSingle()

  if (error) {
    console.warn("Could not query students table:", error.message)
    return null
  }
  return data
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
    const { data: enrollmentsData } = await supabase
      .from("enrollments")
      .select(`
        id,
        enrolled_at,
        batch_id,
        batches (
          id,
          name,
          subject,
          timing,
          monthly_fee,
          teacher_id,
          teachers (
            id,
            subject_specialization,
            profiles (
              full_name,
              email
            )
          )
        )
      `)
      .eq("student_id", studentId)
      .eq("status", "active")

    if (enrollmentsData) {
      batches = enrollmentsData
        .filter((e: any) => e.batches)
        .map((e: any) => {
          const b = e.batches
          const teacherProfile = b.teachers?.profiles
          return {
            enrollment_id: e.id,
            batch_id: b.id,
            batch_name: b.name,
            subject: b.subject,
            timing: b.timing,
            monthly_fee: Number(b.monthly_fee) || 0,
            enrolled_at: e.enrolled_at,
            teacher_name: teacherProfile?.full_name || undefined,
            teacher_email: teacherProfile?.email || undefined,
            teacher_subject: b.teachers?.subject_specialization || undefined,
          }
        })
    }

    // 3. Fetch attendance stats
    const { data: attData } = await supabase
      .from("attendance")
      .select("id, status")
      .eq("student_id", studentId)

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
    const { data: paymentData } = await supabase
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

  const { data: annData } = await annQuery

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

  return {
    studentId,
    rollNumber: student?.roll_number || null,
    guardianName: student?.guardian_name || null,
    batches,
    attendance: attendanceStats,
    payments,
    recentAnnouncements: announcements,
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
}> {
  const student = await getStudentByProfileId(profileId)
  if (!student) {
    return { batches: [], payments: [], totalPaid: 0, monthlyTotal: 0 }
  }

  // 1. Fetch batches
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select(`
      id,
      enrolled_at,
      batch_id,
      batches (
        id,
        name,
        subject,
        timing,
        monthly_fee
      )
    `)
    .eq("student_id", student.id)
    .eq("status", "active")

  const batches: StudentBatchInfo[] = (enrollments || [])
    .filter((e: any) => e.batches)
    .map((e: any) => ({
      enrollment_id: e.id,
      batch_id: e.batches.id,
      batch_name: e.batches.name,
      subject: e.batches.subject,
      timing: e.batches.timing,
      monthly_fee: Number(e.batches.monthly_fee) || 0,
      enrolled_at: e.enrolled_at,
    }))

  const monthlyTotal = batches.reduce((sum, b) => sum + b.monthly_fee, 0)

  // 2. Fetch payments
  const { data: paymentRows } = await supabase
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

  return {
    batches,
    payments,
    totalPaid,
    monthlyTotal,
  }
}

