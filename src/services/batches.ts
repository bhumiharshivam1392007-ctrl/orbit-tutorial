import { supabase } from "@/lib/supabase"
import type { BatchWithSubjects, BatchSubject } from "@/types/database"

export const DAY_OPTIONS = [
  { key: "Mon", label: "Mon", full: "Monday" },
  { key: "Tue", label: "Tue", full: "Tuesday" },
  { key: "Wed", label: "Wed", full: "Wednesday" },
  { key: "Thu", label: "Thu", full: "Thursday" },
  { key: "Fri", label: "Fri", full: "Friday" },
  { key: "Sat", label: "Sat", full: "Saturday" },
  { key: "Sun", label: "Sun", full: "Sunday" },
] as const

export type DayKey = (typeof DAY_OPTIONS)[number]["key"]

export const DAY_PRESETS = [
  { label: "Mon-Fri", days: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
  { label: "Mon-Sat", days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] },
  { label: "Mon/Wed/Fri", days: ["Mon", "Wed", "Fri"] },
  { label: "Tue/Thu/Sat", days: ["Tue", "Thu", "Sat"] },
  { label: "Sat & Sun", days: ["Sat", "Sun"] },
  { label: "Daily", days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] },
]

export interface SubjectTimeSlot {
  id?: string
  days: string[] // e.g. ["Mon", "Tue"]
  start_time: string // "08:00"
  end_time: string // "09:00"
}

export interface BatchSubjectFormItem {
  id?: string
  subject: string
  teacher_id: string | null
  slots: SubjectTimeSlot[]
}

export interface BatchSubjectInput {
  id?: string
  subject: string
  teacher_id: string | null
  days: string
  start_time: string
  end_time: string
}

export interface BatchFormData {
  name: string
  monthly_fee: number
  status: "active" | "inactive"
  subjects?: BatchSubjectInput[]
  subjectItems?: BatchSubjectFormItem[]
  // Legacy optional fields for backward compatibility
  subject?: string
  timing?: string
  teacher_id?: string | null
}

export interface TeacherConflictResult {
  hasConflict: boolean
  message?: string
}

/**
 * Normalizes any day representation (preset string, comma string, or array)
 * into standard 3-letter day tokens: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
 */
export function parseDaysToTokens(input?: string | string[] | null): string[] {
  if (!input) return ["Mon", "Tue", "Wed", "Thu", "Fri"]
  if (Array.isArray(input)) {
    const res: string[] = []
    for (const item of input) {
      const parsed = parseDaysToTokens(item)
      for (const p of parsed) {
        if (!res.includes(p)) res.push(p)
      }
    }
    const order = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    res.sort((a, b) => order.indexOf(a) - order.indexOf(b))
    return res.length > 0 ? res : ["Mon", "Tue", "Wed", "Thu", "Fri"]
  }

  const str = input.toLowerCase().trim()
  if (!str) return ["Mon", "Tue", "Wed", "Thu", "Fri"]

  if (str === "mon-fri" || str === "mon to fri" || str === "monday to friday") {
    return ["Mon", "Tue", "Wed", "Thu", "Fri"]
  }
  if (str === "mon-sat" || str === "mon to sat" || str === "monday to saturday") {
    return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  }
  if (str === "daily" || str === "all" || str === "everyday" || str === "all days") {
    return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
  }
  if (str === "sat & sun" || str === "sat and sun" || str === "saturday & sunday" || str === "weekend") {
    return ["Sat", "Sun"]
  }

  // Token matching for arbitrary strings like "Mon, Tue", "Mon/Wed/Fri", "Tue, Thu, Sat"
  const parts = str.split(/[,/&+\s]+/).map((p) => p.trim()).filter(Boolean)
  const result: string[] = []

  const tokenMap: Record<string, string> = {
    mon: "Mon", monday: "Mon",
    tue: "Tue", tues: "Tue", tuesday: "Tue",
    wed: "Wed", wednesday: "Wed",
    thu: "Thu", thur: "Thu", thurs: "Thu", thursday: "Thu",
    fri: "Fri", friday: "Fri",
    sat: "Sat", saturday: "Sat",
    sun: "Sun", sunday: "Sun",
  }

  for (const part of parts) {
    const mapped = tokenMap[part]
    if (mapped && !result.includes(mapped)) {
      result.push(mapped)
    }
  }

  const order = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
  result.sort((a, b) => order.indexOf(a) - order.indexOf(b))

  return result.length > 0 ? result : ["Mon", "Tue", "Wed", "Thu", "Fri"]
}

/**
 * Returns full day names (e.g. ["Monday", "Tuesday"]) from any day representation.
 */
export function parseDaysToFullNames(input?: string | string[] | null): string[] {
  const tokens = parseDaysToTokens(input)
  const map: Record<string, string> = {
    Mon: "Monday",
    Tue: "Tuesday",
    Wed: "Wednesday",
    Thu: "Thursday",
    Fri: "Friday",
    Sat: "Saturday",
    Sun: "Sunday",
  }
  return tokens.map((t) => map[t] || t)
}

/**
 * Formats day tokens into a human-readable string.
 * Example: ["Mon", "Tue", "Wed", "Thu", "Fri"] -> "Mon-Fri"
 * Example: ["Mon", "Tue"] -> "Mon, Tue"
 */
export function formatDaysDisplay(days?: string | string[] | null): string {
  const tokens = parseDaysToTokens(days)
  const joined = tokens.join(",")
  if (tokens.length === 5 && joined === "Mon,Tue,Wed,Thu,Fri") return "Mon-Fri"
  if (tokens.length === 6 && joined === "Mon,Tue,Wed,Thu,Fri,Sat") return "Mon-Sat"
  if (tokens.length === 7) return "Daily"
  if (tokens.length === 2 && joined === "Sat,Sun") return "Sat & Sun"
  return tokens.join(", ")
}

/**
 * Formats a "HH:mm" or "HH:mm:ss" string to 12-hour AM/PM format (e.g., "8:00 AM", "1:30 PM").
 */
export function formatTime12Hour(timeStr?: string | null): string {
  if (!timeStr) return ""
  const [hStr, mStr] = timeStr.split(":")
  const h = parseInt(hStr || "0", 10)
  const m = parseInt(mStr || "0", 10)
  const ampm = h >= 12 ? "PM" : "AM"
  const hour12 = h % 12 || 12
  const minute = m.toString().padStart(2, "0")
  return `${hour12}:${minute} ${ampm}`
}

/**
 * Compact schedule formatter (e.g. "Mon, Tue • 8:00 AM - 9:00 AM").
 */
export function formatSlotTiming(
  days?: string | string[] | null,
  startTime?: string | null,
  endTime?: string | null
): string {
  const daysText = formatDaysDisplay(days)
  if (!startTime || !endTime) return daysText
  const startFmt = formatTime12Hour(startTime)
  const endFmt = formatTime12Hour(endTime)
  return `${daysText} • ${startFmt} - ${endFmt}`
}

/**
 * Helper to convert "HH:mm" or "HH:mm:ss" to total minutes since midnight
 */
export function timeStringToMinutes(timeStr?: string | null): number {
  if (!timeStr) return 0
  const [h, m] = timeStr.split(":").map(Number)
  return (h || 0) * 60 + (m || 0)
}

/**
 * Checks whether two day-representations share at least one active day.
 */
export function areDaysOverlapping(daysA?: string | string[] | null, daysB?: string | string[] | null): boolean {
  const tokensA = new Set(parseDaysToTokens(daysA))
  const tokensB = new Set(parseDaysToTokens(daysB))
  for (const d of tokensA) {
    if (tokensB.has(d)) return true
  }
  return false
}

/**
 * Checks if two time intervals overlap (strictly: start1 < end2 && start2 < end1)
 */
export function areTimesOverlapping(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  const s1 = timeStringToMinutes(start1)
  const e1 = timeStringToMinutes(end1)
  const s2 = timeStringToMinutes(start2)
  const e2 = timeStringToMinutes(end2)
  return !(e1 <= s2 || s1 >= e2)
}

/**
 * Validates teacher timing overlap across existing batch_subjects.
 * Prevents scheduling the same teacher for two overlapping classes across batches.
 */
export async function validateTeacherSchedule(
  teacherId: string,
  days: string | string[],
  startTime: string,
  endTime: string,
  excludeSubjectId?: string,
  excludeBatchId?: string
): Promise<TeacherConflictResult> {
  if (!teacherId || teacherId === "none") {
    return { hasConflict: false }
  }

  const newStart = timeStringToMinutes(startTime)
  const newEnd = timeStringToMinutes(endTime)

  if (newStart >= newEnd) {
    return {
      hasConflict: true,
      message: `Start time (${startTime}) must be earlier than end time (${endTime}).`,
    }
  }

  // Fetch all existing subjects taught by this teacher
  let query = supabase
    .from("batch_subjects")
    .select(`
      id,
      batch_id,
      subject,
      days,
      start_time,
      end_time,
      batches (
        id,
        name
      ),
      teachers (
        profiles (
          full_name
        )
      )
    `)
    .eq("teacher_id", teacherId)

  if (excludeSubjectId) {
    query = query.neq("id", excludeSubjectId)
  }

  const { data, error } = await query
  if (error || !data) return { hasConflict: false }

  const targetTokens = parseDaysToTokens(days)

  for (const item of data as any[]) {
    // If excluding the whole batch (checked locally in modal state), skip it
    if (excludeBatchId && item.batch_id === excludeBatchId) {
      continue
    }

    const itemTokens = parseDaysToTokens(item.days || "Mon-Fri")
    const commonDays = targetTokens.filter((d) => itemTokens.includes(d))
    if (commonDays.length === 0) {
      continue
    }

    const existStart = timeStringToMinutes(item.start_time || "00:00")
    const existEnd = timeStringToMinutes(item.end_time || "23:59")

    const overlaps = !(newEnd <= existStart || newStart >= existEnd)
    if (overlaps) {
      const teacherName = item.teachers?.profiles?.full_name || "This teacher"
      const batchName = item.batches?.name || "another class"
      const timeRange = `${formatTime12Hour(item.start_time)} - ${formatTime12Hour(item.end_time)}`
      const daySummary = commonDays.join(", ")
      return {
        hasConflict: true,
        message: `Schedule conflict: ${teacherName} is already assigned to "${item.subject}" in batch "${batchName}" on ${daySummary} (${timeRange}).`,
      }
    }
  }

  return { hasConflict: false }
}

/**
 * Groups raw batch_subjects into structured BatchSubjectFormItem[] for multi-slot edit forms
 */
export function groupBatchSubjects(batchSubjects: BatchSubject[]): BatchSubjectFormItem[] {
  if (!batchSubjects || batchSubjects.length === 0) return []

  const subjectMap = new Map<string, BatchSubjectFormItem>()

  for (const bs of batchSubjects) {
    const key = `${(bs.subject || "").trim().toLowerCase()}__${bs.teacher_id || "none"}`
    const slot: SubjectTimeSlot = {
      id: bs.id,
      days: parseDaysToTokens(bs.days || "Mon-Fri"),
      start_time: bs.start_time ? bs.start_time.slice(0, 5) : "09:00",
      end_time: bs.end_time ? bs.end_time.slice(0, 5) : "10:30",
    }

    if (subjectMap.has(key)) {
      subjectMap.get(key)!.slots.push(slot)
    } else {
      subjectMap.set(key, {
        id: bs.id,
        subject: bs.subject || "",
        teacher_id: bs.teacher_id || "none",
        slots: [slot],
      })
    }
  }

  return Array.from(subjectMap.values())
}

/**
 * Fetch all batches with their multiple subjects, faculty teachers, and student counts
 */
export async function fetchBatches(): Promise<BatchWithSubjects[]> {
  const { data: batches, error } = await supabase
    .from("batches")
    .select(`
      *,
      batch_subjects (
        id,
        batch_id,
        subject,
        teacher_id,
        days,
        start_time,
        end_time,
        teachers (
          id,
          subject,
          qualification,
          salary,
          status,
          profiles (
            id,
            role,
            full_name,
            email,
            phone,
            avatar_url
          )
        )
      ),
      enrollments (
        id,
        status
      ),
      teachers (
        id,
        profiles (
          full_name,
          email
        )
      )
    `)
    .order("name", { ascending: true })

  if (error) {
    console.error("Error fetching batches:", error)
    throw error
  }

  return (batches || []).map((b: any) => {
    let subjects: BatchSubject[] = b.batch_subjects || []

    // If batch_subjects is empty but legacy columns exist, provide fallback row
    if (subjects.length === 0 && (b.subject || b.timing)) {
      subjects = [
        {
          id: `legacy-${b.id}`,
          batch_id: b.id,
          subject: b.subject || "General",
          teacher_id: b.teacher_id || null,
          days: b.timing ? b.timing.split(" ")[0] : "Mon-Fri",
          start_time: "09:00:00",
          end_time: "10:30:00",
          teachers: b.teachers || null,
        },
      ]
    }

    return {
      ...b,
      batch_subjects: subjects,
      student_count: (b.enrollments || []).filter((e: any) => e.status === "active").length,
    }
  })
}

/**
 * Flattens either `subjectItems` (multi-slot) or legacy `subjects` into flat DB rows
 */
function flattenSubjectRows(data: BatchFormData, batchId: string): any[] {
  if (data.subjectItems && data.subjectItems.length > 0) {
    const rows: any[] = []
    for (const item of data.subjectItems) {
      const subjectName = item.subject.trim()
      const teacherId = item.teacher_id === "none" || !item.teacher_id ? null : item.teacher_id
      for (const slot of item.slots) {
        rows.push({
          batch_id: batchId,
          subject: subjectName,
          teacher_id: teacherId,
          days: slot.days.join(", ") || "Mon-Fri",
          start_time: slot.start_time ? (slot.start_time.length === 5 ? `${slot.start_time}:00` : slot.start_time) : null,
          end_time: slot.end_time ? (slot.end_time.length === 5 ? `${slot.end_time}:00` : slot.end_time) : null,
        })
      }
    }
    return rows
  }

  if (data.subjects && data.subjects.length > 0) {
    return data.subjects.map((s) => ({
      batch_id: batchId,
      subject: s.subject.trim(),
      teacher_id: s.teacher_id === "none" || !s.teacher_id ? null : s.teacher_id,
      days: s.days || "Mon-Fri",
      start_time: s.start_time ? (s.start_time.length === 5 ? `${s.start_time}:00` : s.start_time) : null,
      end_time: s.end_time ? (s.end_time.length === 5 ? `${s.end_time}:00` : s.end_time) : null,
    }))
  }

  return []
}

/**
 * Create a new class batch with multiple subjects & slots atomically
 */
export async function createBatch(data: BatchFormData) {
  let primarySubject = "General"
  let primaryTiming = "Mon-Fri"
  let primaryTeacherId: string | null = null

  if (data.subjectItems && data.subjectItems.length > 0) {
    const firstSub = data.subjectItems[0]
    if (firstSub) {
      primarySubject = firstSub.subject || "General"
      primaryTeacherId = firstSub.teacher_id === "none" ? null : firstSub.teacher_id
      const s0 = firstSub.slots[0]
      if (s0) {
        primaryTiming = `${s0.days.join(", ")} ${s0.start_time}-${s0.end_time}`
      }
    }
  } else if (data.subjects && data.subjects.length > 0) {
    const s0 = data.subjects[0]
    if (s0) {
      primarySubject = s0.subject || "General"
      primaryTeacherId = s0.teacher_id === "none" ? null : s0.teacher_id
      primaryTiming = `${s0.days} ${s0.start_time}-${s0.end_time}`
    }
  }

  // 1. Insert Batch record
  const { data: newBatch, error: batchError } = await supabase
    .from("batches")
    .insert({
      name: data.name.trim(),
      monthly_fee: Number(data.monthly_fee),
      status: data.status,
      // Keep legacy fields populated for backward compatibility with existing views
      subject: primarySubject,
      timing: primaryTiming,
      teacher_id: primaryTeacherId,
    } as any)
    .select()
    .single()

  if (batchError) throw batchError
  const batchId = (newBatch as any).id

  // 2. Insert batch_subjects rows
  const subjectRows = flattenSubjectRows(data, batchId)
  if (subjectRows.length > 0) {
    const { error: subjectsError } = await supabase.from("batch_subjects").insert(subjectRows as any)
    if (subjectsError) {
      console.error("Error creating batch subjects:", subjectsError)
      // Rollback batch if subjects failed
      await supabase.from("batches").delete().eq("id", batchId)
      throw subjectsError
    }
  }

  // 3. Create default single monthly fee_structure for this batch (fees are strictly at batch level)
  try {
    await supabase.from("fee_structures").insert({
      batch_id: batchId,
      fee_type: "monthly",
      amount: Number(data.monthly_fee),
      description: `Monthly tuition fee for ${data.name.trim()}`,
    } as any)
  } catch (err) {
    console.warn("Notice creating default fee structure:", err)
  }

  return newBatch
}

/**
 * Update an existing batch and atomically synchronize its subjects and slots
 */
export async function updateBatch(id: string, data: Partial<BatchFormData>) {
  const payload: any = {}
  if (data.name !== undefined) payload.name = data.name.trim()
  if (data.status !== undefined) payload.status = data.status
  if (data.monthly_fee !== undefined) {
    payload.monthly_fee = Number(data.monthly_fee)
  }

  if (data.subjectItems && data.subjectItems.length > 0) {
    const firstSub = data.subjectItems[0]
    if (firstSub) {
      payload.subject = firstSub.subject
      payload.teacher_id = firstSub.teacher_id === "none" ? null : firstSub.teacher_id
      const s0 = firstSub.slots[0]
      if (s0) {
        payload.timing = `${s0.days.join(", ")} ${s0.start_time}-${s0.end_time}`
      }
    }
  } else if (data.subjects && data.subjects.length > 0) {
    const firstSub = data.subjects[0]
    if (firstSub) {
      payload.subject = firstSub.subject
      payload.timing = `${firstSub.days} ${firstSub.start_time}-${firstSub.end_time}`
      payload.teacher_id = firstSub.teacher_id === "none" ? null : firstSub.teacher_id
    }
  }

  // 1. Update batch main row
  const { data: updated, error: batchError } = await supabase
    .from("batches")
    .update(payload)
    .eq("id", id)
    .select()
    .single()

  if (batchError) throw batchError

  // 2. Synchronize batch_subjects
  if (data.subjectItems || data.subjects) {
    // Delete existing subjects for this batch
    const { error: delError } = await supabase.from("batch_subjects").delete().eq("batch_id", id)
    if (delError) console.warn("Notice deleting old subjects:", delError.message)

    const subjectRows = flattenSubjectRows(data as BatchFormData, id)
    if (subjectRows.length > 0) {
      const { error: insError } = await supabase.from("batch_subjects").insert(subjectRows as any)
      if (insError) throw insError
    }
  }

  // 3. Update fee_structure amount if monthly_fee changed
  if (data.monthly_fee !== undefined) {
    try {
      await supabase
        .from("fee_structures")
        .update({ amount: Number(data.monthly_fee) } as any)
        .eq("batch_id", id)
        .eq("fee_type", "monthly")
    } catch (err) {
      console.warn("Notice updating fee structure:", err)
    }
  }

  return updated
}

export async function deleteBatch(id: string) {
  // Cascades on delete in Postgres
  const { error } = await supabase.from("batches").delete().eq("id", id)
  if (error) throw error
}

export interface BatchStudentItem {
  enrollment_id: string
  student_id: string
  enrolled_on: string
  status: string
  full_name: string
  email: string
  phone: string
  guardian_name: string | null
  guardian_phone: string | null
  avatar_url: string | null
}

/**
 * Fetch list of enrolled students for a specific batch
 */
export async function fetchBatchStudents(batchId: string): Promise<BatchStudentItem[]> {
  const { data, error } = await supabase
    .from("enrollments")
    .select(`
      id,
      enrolled_on,
      status,
      students (
        id,
        guardian_name,
        guardian_phone,
        profiles (
          id,
          full_name,
          email,
          phone,
          avatar_url
        )
      )
    `)
    .eq("batch_id", batchId)
    .eq("status", "active")
    .order("enrolled_on", { ascending: false })

  if (error) {
    console.error("Error fetching batch students:", error)
    return []
  }

  return (data || []).map((row: any) => ({
    enrollment_id: row.id,
    student_id: row.students?.id || "",
    enrolled_on: row.enrolled_on || "",
    status: row.status || "active",
    full_name: row.students?.profiles?.full_name || "Enrolled Student",
    email: row.students?.profiles?.email || "",
    phone: row.students?.profiles?.phone || row.students?.guardian_phone || "",
    guardian_name: row.students?.guardian_name || null,
    guardian_phone: row.students?.guardian_phone || null,
    avatar_url: row.students?.profiles?.avatar_url || null,
  }))
}

/**
 * Toggle a batch between active and inactive
 */
export async function toggleBatchStatus(batchId: string, currentStatus: "active" | "inactive") {
  const newStatus = currentStatus === "active" ? "inactive" : "active"
  const { data, error } = await supabase
    .from("batches")
    .update({ status: newStatus })
    .eq("id", batchId)
    .select()
    .single()
  if (error) throw error
  return data
}
