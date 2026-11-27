import { supabase } from "@/lib/supabase"
import { format } from "date-fns"
import type { Batch, AttendanceStatus, AnnouncementWithAuthor } from "@/types/database"
import { parseDaysToTokens, parseDaysToFullNames, formatSlotTiming } from "@/services/batches"

export interface TeacherSubjectSchedule {
  id: string
  subject: string
  days: string
  start_time: string | null
  end_time: string | null
}

export interface TeacherTodayLecture {
  id: string
  batch_id: string
  batch_name: string
  subject: string
  days: string
  start_time: string | null
  end_time: string | null
  timeFormatted: string
  student_count: number
}

export interface TeacherBatchItem extends Batch {
  student_count: number
  teacher_subjects?: TeacherSubjectSchedule[]
  schedule_summary?: string
  enrollments?: Array<{ id: string; student_id: string; status: string }>
}

export interface StudentRosterItem {
  id: string
  profile_id: string
  full_name: string
  email: string
  phone: string | null
  guardian_name: string | null
  guardian_phone: string | null
  enrolled_on: string
  attendanceRate: number
  totalDays: number
  presentDays: number
}

export interface DailyAttendanceRecord {
  student_id: string
  status: AttendanceStatus
}

export interface TeacherDashboardData {
  teacher: {
    id: string
    subject: string | null
    qualification: string | null
    salary: number | null
  } | null
  batches: TeacherBatchItem[]
  totalStudents: number
  todayAttendanceStats: {
    markedBatches: number
    totalBatches: number
  }
  recentAnnouncements: AnnouncementWithAuthor[]
  todayLectures: TeacherTodayLecture[]
}

// 1. Get Teacher record by Profile ID
export async function getTeacherByProfileId(profileId: string) {
  const { data, error } = await supabase
    .from("teachers")
    .select("*, profiles (*)")
    .eq("profile_id", profileId)
    .maybeSingle()

  if (error) {
    console.error("Error fetching teacher record:", error)
    throw error
  }
  return data
}

// 2. Fetch Teacher Dashboard Data
export async function fetchTeacherDashboard(profileId: string): Promise<TeacherDashboardData> {
  // Find teacher record
  const teacher = await getTeacherByProfileId(profileId)

  if (!teacher) {
    return {
      teacher: null,
      batches: [],
      totalStudents: 0,
      todayAttendanceStats: { markedBatches: 0, totalBatches: 0 },
      recentAnnouncements: [],
      todayLectures: [],
    }
  }

  // 1. Fetch from batch_subjects where this teacher teaches
  const { data: subData } = await supabase
    .from("batch_subjects")
    .select(`
      id,
      batch_id,
      subject,
      days,
      start_time,
      end_time,
      batches (
        *,
        enrollments (
          id,
          student_id,
          status
        )
      )
    `)
    .eq("teacher_id", teacher.id)

  // 2. Also fetch legacy batches where batches.teacher_id = teacher.id for safety
  const { data: legacyBatches } = await supabase
    .from("batches")
    .select(`
      *,
      enrollments (
        id,
        student_id,
        status
      )
    `)
    .eq("teacher_id", teacher.id)

  // 3. Aggregate batches and their subjects
  const batchMap = new Map<string, { batch: any; subjects: TeacherSubjectSchedule[] }>()

  // Process batch_subjects
  for (const item of (subData || []) as any[]) {
    if (!item.batches) continue
    const bId = item.batch_id
    if (!batchMap.has(bId)) {
      batchMap.set(bId, {
        batch: item.batches,
        subjects: [],
      })
    }
    batchMap.get(bId)!.subjects.push({
      id: item.id,
      subject: item.subject,
      days: item.days || "Mon-Fri",
      start_time: item.start_time,
      end_time: item.end_time,
    })
  }

  // Process legacy batches if not already in batchMap
  for (const b of (legacyBatches || []) as any[]) {
    if (!batchMap.has(b.id)) {
      batchMap.set(b.id, {
        batch: b,
        subjects: [
          {
            id: `legacy-${b.id}`,
            subject: b.subject || "General",
            days: b.timing ? b.timing.split(" ")[0] : "Mon-Fri",
            start_time: "09:00",
            end_time: "10:30",
          },
        ],
      })
    }
  }

  const batches: TeacherBatchItem[] = Array.from(batchMap.values()).map(({ batch, subjects }) => {
    const subjectsList = subjects.map((s) => s.subject).join(", ")
    const timingList = subjects
      .map((s) => {
        return `${s.subject}: ${formatSlotTiming(s.days, s.start_time, s.end_time)}`
      })
      .join(" | ")

    const activeEnrollments = (batch.enrollments || []).filter((e: any) => e.status === "active")

    return {
      ...batch,
      subject: subjectsList || batch.subject || "Class Faculty",
      timing: timingList || batch.timing || "Scheduled",
      student_count: activeEnrollments.length,
      teacher_subjects: subjects,
      schedule_summary: timingList,
      enrollments: batch.enrollments,
    }
  })

  // Calculate today's specific scheduled lectures for this teacher
  const todayToken = format(new Date(), "EEE") // e.g. "Mon", "Tue", "Fri"
  const todayLectures: TeacherTodayLecture[] = []

  for (const { batch, subjects } of batchMap.values()) {
    const activeEnrollments = (batch.enrollments || []).filter((e: any) => e.status === "active")
    for (const s of subjects) {
      const tokens = parseDaysToTokens(s.days)
      if (tokens.includes(todayToken)) {
        todayLectures.push({
          id: s.id,
          batch_id: batch.id,
          batch_name: batch.name,
          subject: s.subject,
          days: s.days,
          start_time: s.start_time,
          end_time: s.end_time,
          timeFormatted: formatSlotTiming(s.days, s.start_time, s.end_time),
          student_count: activeEnrollments.length,
        })
      }
    }
  }

  // Sort today's lectures by start time
  todayLectures.sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""))

  // Unique students count across all assigned batches
  const studentIdSet = new Set<string>()
  for (const b of batches) {
    for (const e of b.enrollments || []) {
      if (e.status === "active") studentIdSet.add(e.student_id)
    }
  }

  // Check today's attendance marking
  const todayStr = format(new Date(), "yyyy-MM-dd")
  const batchIds = batches.map((b) => b.id)

  let markedBatchesCount = 0
  if (batchIds.length > 0) {
    const { data: attData, error: attErr } = await supabase
      .from("attendance")
      .select("batch_id")
      .in("batch_id", batchIds)
      .eq("date", todayStr)

    if (attErr) throw attErr
    const markedBatchIds = new Set((attData || []).map((a: any) => a.batch_id))
    markedBatchesCount = markedBatchIds.size
  }

  // Fetch announcements for teachers or batches
  const { data: annData, error: annErr } = await supabase
    .from("announcements")
    .select(`
      *,
      profiles (
        full_name,
        email,
        role
      )
    `)
    .or(`target_audience.in.(all,teachers)${batchIds.length ? `,target_batch_id.in.(${batchIds.join(",")})` : ""}`)
    .order("created_at", { ascending: false })
    .limit(5)

  if (annErr) throw annErr

  return {
    teacher,
    batches,
    totalStudents: studentIdSet.size,
    todayAttendanceStats: {
      markedBatches: markedBatchesCount,
      totalBatches: batches.length,
    },
    recentAnnouncements: (annData || []) as unknown as AnnouncementWithAuthor[],
    todayLectures,
  }
}

// 3. Fetch Roster of students in a specific batch
export async function fetchBatchRoster(batchId: string): Promise<StudentRosterItem[]> {
  const { data: enrollments, error } = await supabase
    .from("enrollments")
    .select(`
      student_id,
      enrolled_on,
      status,
      students (
        id,
        profile_id,
        guardian_name,
        guardian_phone,
        profiles (
          full_name,
          email,
          phone
        ),
        attendance (
          id,
          batch_id,
          status
        )
      )
    `)
    .eq("batch_id", batchId)
    .eq("status", "active")

  if (error) throw error

  return (enrollments || []).map((e: any) => {
    const s = e.students
    const attList = (s.attendance || []).filter((a: any) => a.batch_id === batchId)
    const totalDays = attList.length
    const presentDays = attList.filter((a: any) => a.status === "present").length
    const rate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 100

    return {
      id: s.id,
      profile_id: s.profile_id,
      full_name: s.profiles?.full_name || "Student",
      email: s.profiles?.email || "",
      phone: s.profiles?.phone || null,
      guardian_name: s.guardian_name || null,
      guardian_phone: s.guardian_phone || null,
      enrolled_on: e.enrolled_on,
      attendanceRate: rate,
      totalDays,
      presentDays,
    }
  })
}

// 4. Fetch Attendance for a specific batch and date
export async function fetchAttendanceForDate(batchId: string, dateStr: string) {
  const { data, error } = await supabase
    .from("attendance")
    .select("student_id, status")
    .eq("batch_id", batchId)
    .eq("date", dateStr)

  if (error) throw error

  const map: Record<string, AttendanceStatus> = {}
  for (const row of (data || []) as any[]) {
    map[row.student_id] = row.status
  }
  return map
}

// 5. Save Batch Attendance (Upsert for each student)
export async function saveBatchAttendance(
  batchId: string,
  dateStr: string,
  records: DailyAttendanceRecord[],
  markedByProfileId?: string
) {
  if (records.length === 0) return

  const rows = records.map((r) => ({
    student_id: r.student_id,
    batch_id: batchId,
    date: dateStr,
    status: r.status,
    marked_by: markedByProfileId || null,
  }))

  const { error } = await supabase
    .from("attendance")
    .upsert(rows as any, { onConflict: "student_id,batch_id,date" })

  if (error) throw error
}

// 6. Post Announcement to a specific batch
export async function postTeacherAnnouncement(
  authorProfileId: string,
  title: string,
  content: string,
  targetBatchId: string
) {
  const { data, error } = await supabase
    .from("announcements")
    .insert({
      author_id: authorProfileId,
      title: title.trim(),
      content: content.trim(),
      target_audience: "students",
      target_batch_id: targetBatchId,
    } as any)
    .select()
    .single()

  if (error) throw error
  return data
}

// 7. Types and function for All Students across Teacher's Batches
export interface TeacherStudentItem {
  id: string
  profile_id: string
  full_name: string
  email: string
  phone: string | null
  guardian_name: string | null
  guardian_phone: string | null
  batch_id: string
  batch_name: string
  enrolled_on: string
  attendanceRate: number
  totalDays: number
  presentDays: number
}

export async function fetchTeacherAllStudents(profileId: string): Promise<{
  students: TeacherStudentItem[]
  batches: Array<{ id: string; name: string }>
}> {
  const teacher = await getTeacherByProfileId(profileId)
  if (!teacher) return { students: [], batches: [] }

  // 1. Get batch IDs where teacher teaches
  const { data: subData } = await supabase
    .from("batch_subjects")
    .select("batch_id, batches(id, name)")
    .eq("teacher_id", teacher.id)

  const { data: legacyBatches } = await supabase
    .from("batches")
    .select("id, name")
    .eq("teacher_id", teacher.id)

  const batchMap = new Map<string, string>()
  for (const item of (subData || []) as any[]) {
    if (item.batches?.id) {
      batchMap.set(item.batches.id, item.batches.name)
    }
  }
  for (const b of (legacyBatches || []) as any[]) {
    if (b.id) {
      batchMap.set(b.id, b.name)
    }
  }

  const batchIds = Array.from(batchMap.keys())
  if (batchIds.length === 0) {
    return { students: [], batches: [] }
  }

  // 2. Fetch all enrollments for these batches
  const { data: enrollments, error } = await supabase
    .from("enrollments")
    .select(`
      batch_id,
      enrolled_on,
      status,
      students (
        id,
        profile_id,
        guardian_name,
        guardian_phone,
        profiles (
          full_name,
          email,
          phone
        ),
        attendance (
          id,
          batch_id,
          status
        )
      )
    `)
    .in("batch_id", batchIds)
    .eq("status", "active")

  if (error) throw error

  const studentsList: TeacherStudentItem[] = (enrollments || []).map((e: any) => {
    const s = e.students
    const bName = batchMap.get(e.batch_id) || "Assigned Batch"
    const attList = (s?.attendance || []).filter((a: any) => a.batch_id === e.batch_id)
    const totalDays = attList.length
    const presentDays = attList.filter((a: any) => a.status === "present").length
    const rate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 100

    return {
      id: s?.id || "",
      profile_id: s?.profile_id || "",
      full_name: s?.profiles?.full_name || "Student",
      email: s?.profiles?.email || "",
      phone: s?.profiles?.phone || null,
      guardian_name: s?.guardian_name || null,
      guardian_phone: s?.guardian_phone || null,
      batch_id: e.batch_id,
      batch_name: bName,
      enrolled_on: e.enrolled_on,
      attendanceRate: rate,
      totalDays,
      presentDays,
    }
  })

  return {
    students: studentsList,
    batches: Array.from(batchMap.entries()).map(([id, name]) => ({ id, name })),
  }
}

// 8. Weekly Lecture Schedule for Teacher
export interface TeacherScheduleSlot {
  id: string
  batch_id: string
  batch_name: string
  subject: string
  days: string
  start_time: string | null
  end_time: string | null
  student_count: number
  timeFormatted: string
  dayList: string[]
}

export async function fetchTeacherWeeklySchedule(profileId: string): Promise<TeacherScheduleSlot[]> {
  const teacher = await getTeacherByProfileId(profileId)
  if (!teacher) return []

  const { data: subData } = await supabase
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
        name,
        enrollments ( id, status )
      )
    `)
    .eq("teacher_id", teacher.id)

  const slots: TeacherScheduleSlot[] = []

  for (const item of (subData || []) as any[]) {
    if (!item.batches) continue
    const activeEnr = (item.batches.enrollments || []).filter((e: any) => e.status === "active")
    const timeFormatted = formatSlotTiming(item.days, item.start_time, item.end_time)

    slots.push({
      id: item.id,
      batch_id: item.batch_id,
      batch_name: item.batches.name,
      subject: item.subject,
      days: item.days || "Mon-Fri",
      start_time: item.start_time,
      end_time: item.end_time,
      student_count: activeEnr.length,
      timeFormatted,
      dayList: parseDaysToFullNames(item.days || "Mon-Fri"),
    })
  }

  return slots
}

// 9. Fetch Teacher Full Profile
export interface TeacherFullProfile {
  id: string
  profile_id: string
  full_name: string
  email: string
  phone: string | null
  subject: string | null
  qualification: string | null
  salary: number | null
  assigned_batch_count: number
  created_at?: string
}

export async function fetchTeacherProfile(profileId: string): Promise<TeacherFullProfile | null> {
  const { data: teacher, error } = await supabase
    .from("teachers")
    .select("*, profiles (*)")
    .eq("profile_id", profileId)
    .maybeSingle()

  if (error || !teacher) return null

  // Count assigned batches
  const { data: subData } = await supabase
    .from("batch_subjects")
    .select("batch_id")
    .eq("teacher_id", teacher.id)

  const { data: legacyBatches } = await supabase
    .from("batches")
    .select("id")
    .eq("teacher_id", teacher.id)

  const uniqueBatches = new Set<string>()
  for (const item of subData || []) {
    if (item.batch_id) uniqueBatches.add(item.batch_id)
  }
  for (const b of legacyBatches || []) {
    if (b.id) uniqueBatches.add(b.id)
  }

  return {
    id: teacher.id,
    profile_id: teacher.profile_id,
    full_name: teacher.profiles?.full_name || "Faculty Member",
    email: teacher.profiles?.email || "",
    phone: teacher.profiles?.phone || null,
    subject: teacher.subject,
    qualification: teacher.qualification,
    salary: teacher.salary,
    assigned_batch_count: uniqueBatches.size,
    created_at: teacher.created_at,
  }
}

// 10. Update Teacher Profile
export async function updateTeacherProfile(
  profileId: string,
  updates: { full_name: string; phone: string }
) {
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: updates.full_name.trim(),
      phone: updates.phone.trim() || null,
    })
    .eq("id", profileId)

  if (error) throw error
}
