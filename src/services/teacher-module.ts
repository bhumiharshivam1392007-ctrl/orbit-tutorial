import { supabase } from "@/lib/supabase"
import { format } from "date-fns"
import type { Batch, AttendanceStatus, AnnouncementWithAuthor } from "@/types/database"

export interface TeacherBatchItem extends Batch {
  student_count: number
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
    }
  }

  // Fetch batches taught by this teacher
  const { data: batchesData, error: batchesError } = await supabase
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
    .order("name", { ascending: true })

  if (batchesError) throw batchesError

  const batches: TeacherBatchItem[] = (batchesData || []).map((b: any) => ({
    ...b,
    student_count: (b.enrollments || []).filter((e: any) => e.status === "active").length,
  }))

  // Unique students count across all batches
  const studentIdSet = new Set<string>()
  for (const b of (batchesData || []) as any[]) {
    for (const e of b.enrollments || []) {
      if (e.status === "active") studentIdSet.add(e.student_id)
    }
  }

  // Check today's attendance marking
  const todayStr = format(new Date(), "yyyy-MM-dd")
  const batchIds = batches.map((b) => b.id)

  let markedBatchesCount = 0
  if (batchIds.length > 0) {
    const { data: attData } = await supabase
      .from("attendance")
      .select("batch_id")
      .in("batch_id", batchIds)
      .eq("date", todayStr)

    const markedBatchIds = new Set((attData || []).map((a: any) => a.batch_id))
    markedBatchesCount = markedBatchIds.size
  }

  // Fetch announcements for teachers or batches
  const { data: annData } = await supabase
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

  return {
    teacher,
    batches,
    totalStudents: studentIdSet.size,
    todayAttendanceStats: {
      markedBatches: markedBatchesCount,
      totalBatches: batches.length,
    },
    recentAnnouncements: (annData || []) as unknown as AnnouncementWithAuthor[],
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
  records: Array<{ student_id: string; status: AttendanceStatus }>,
  markedByProfileId?: string
) {
  const rows = records.map((r) => ({
    batch_id: batchId,
    student_id: r.student_id,
    date: dateStr,
    status: r.status,
    marked_by: markedByProfileId || null,
  }))

  const { error } = await supabase
    .from("attendance")
    .upsert(rows as any, { onConflict: "student_id,batch_id,date" })

  if (error) throw error
  return true
}

// 6. Teacher creates announcement for their batch
export async function postTeacherAnnouncement(
  authorId: string,
  title: string,
  content: string,
  batchId: string
) {
  const { data, error } = await supabase
    .from("announcements")
    .insert({
      author_id: authorId,
      title: title.trim(),
      content: content.trim(),
      target_audience: "students",
      target_batch_id: batchId,
    } as any)
    .select()
    .single()

  if (error) throw error
  return data
}

