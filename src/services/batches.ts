import { supabase } from "@/lib/supabase"
import type { BatchWithSubjects, BatchSubject } from "@/types/database"

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
  subjects: BatchSubjectInput[]
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
 * Checks whether two day-strings overlap.
 * Handles common values like "Mon-Fri", "Mon-Sat", "Daily", "Mon, Wed, Fri", "Tue, Thu, Sat", etc.
 */
export function areDaysOverlapping(daysA: string, daysB: string): boolean {
  if (!daysA || !daysB) return true
  const normA = daysA.toLowerCase().trim()
  const normB = daysB.toLowerCase().trim()

  if (normA === normB) return true
  if (normA.includes("daily") || normA.includes("all") || normB.includes("daily") || normB.includes("all")) return true

  const dayTokens = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
  const expandDays = (str: string): Set<string> => {
    const s = new Set<string>()
    if (str.includes("mon-fri")) ["mon", "tue", "wed", "thu", "fri"].forEach((d) => s.add(d))
    if (str.includes("mon-sat")) ["mon", "tue", "wed", "thu", "fri", "sat"].forEach((d) => s.add(d))
    dayTokens.forEach((d) => {
      if (str.includes(d)) s.add(d)
    })
    return s
  }

  const setA = expandDays(normA)
  const setB = expandDays(normB)

  for (const d of setA) {
    if (setB.has(d)) return true
  }
  return false
}

/**
 * Validates teacher timing overlap across existing batch_subjects.
 * Prevents scheduling the same teacher for two overlapping classes.
 */
export async function validateTeacherSchedule(
  teacherId: string,
  days: string,
  startTime: string,
  endTime: string,
  excludeSubjectId?: string,
  excludeBatchId?: string
): Promise<TeacherConflictResult> {
  if (!teacherId || teacherId === "none") {
    return { hasConflict: false }
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

  const toMinutes = (timeStr: string): number => {
    if (!timeStr) return 0
    const [h, m] = timeStr.split(":").map(Number)
    return (h || 0) * 60 + (m || 0)
  }

  const newStart = toMinutes(startTime)
  const newEnd = toMinutes(endTime)

  if (newStart >= newEnd) {
    return {
      hasConflict: true,
      message: `Start time (${startTime}) must be earlier than end time (${endTime}).`,
    }
  }

  for (const item of data as any[]) {
    // If updating within the same batch, skip check if requested
    if (excludeBatchId && item.batch_id === excludeBatchId && !excludeSubjectId) {
      continue
    }

    const itemDays = item.days || "Mon-Fri"
    if (!areDaysOverlapping(days, itemDays)) {
      continue
    }

    const existStart = toMinutes(item.start_time || "00:00")
    const existEnd = toMinutes(item.end_time || "23:59")

    // Overlap condition: !(newEnd <= existStart || newStart >= existEnd)
    const overlaps = !(newEnd <= existStart || newStart >= existEnd)
    if (overlaps) {
      const teacherName = item.teachers?.profiles?.full_name || "This teacher"
      const batchName = item.batches?.name || "another class"
      const timeRange = `${item.start_time?.slice(0, 5)} - ${item.end_time?.slice(0, 5)}`
      return {
        hasConflict: true,
        message: `Schedule conflict: ${teacherName} is already assigned to ${item.subject} in "${batchName}" on ${itemDays} (${timeRange}).`,
      }
    }
  }

  return { hasConflict: false }
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
 * Create a new class batch with multiple subjects & teachers atomically
 */
export async function createBatch(data: BatchFormData) {
  const primarySubject = data.subjects[0]?.subject || "General"
  const primaryDays = data.subjects[0]?.days || "Mon-Fri"
  const primaryTiming = data.subjects[0] ? `${primaryDays} ${data.subjects[0].start_time}-${data.subjects[0].end_time}` : "Mon-Fri"
  const primaryTeacherId = data.subjects[0]?.teacher_id || null

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
  if (data.subjects && data.subjects.length > 0) {
    const subjectRows = data.subjects.map((s) => ({
      batch_id: batchId,
      subject: s.subject.trim(),
      teacher_id: s.teacher_id === "none" || !s.teacher_id ? null : s.teacher_id,
      days: s.days || "Mon-Fri",
      start_time: s.start_time ? `${s.start_time}:00` : null,
      end_time: s.end_time ? `${s.end_time}:00` : null,
    }))

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
 * Update an existing batch and atomically synchronize its subjects
 */
export async function updateBatch(id: string, data: Partial<BatchFormData>) {
  const payload: any = {}
  if (data.name !== undefined) payload.name = data.name.trim()
  if (data.status !== undefined) payload.status = data.status
  if (data.monthly_fee !== undefined) {
    payload.monthly_fee = Number(data.monthly_fee)
  }

  if (data.subjects && data.subjects.length > 0) {
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

  // 2. Synchronize batch_subjects if provided
  if (data.subjects) {
    // Delete existing subjects for this batch
    const { error: delError } = await supabase.from("batch_subjects").delete().eq("batch_id", id)
    if (delError) console.warn("Notice deleting old subjects:", delError.message)

    if (data.subjects.length > 0) {
      const subjectRows = data.subjects.map((s) => ({
        batch_id: id,
        subject: s.subject.trim(),
        teacher_id: s.teacher_id === "none" || !s.teacher_id ? null : s.teacher_id,
        days: s.days || "Mon-Fri",
        start_time: s.start_time ? (s.start_time.length === 5 ? `${s.start_time}:00` : s.start_time) : null,
        end_time: s.end_time ? (s.end_time.length === 5 ? `${s.end_time}:00` : s.end_time) : null,
      }))

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
