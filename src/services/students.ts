import { createClient } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"
import type { StudentWithProfile, Batch, FeePayment, Attendance } from "@/types/database"

export interface StudentFormData {
  full_name: string
  email: string
  password?: string
  phone?: string
  date_of_birth?: string
  gender?: "male" | "female" | "other"
  guardian_name?: string
  guardian_phone?: string
  address?: string
  batch_ids?: string[]
  status?: "active" | "inactive"
  fee_start_month?: string | null
}

export interface StudentListItem extends StudentWithProfile {
  enrollments: Array<{
    id: string
    batch_id: string
    status: string
    batches: Batch
  }>
}

export async function fetchStudents(): Promise<StudentListItem[]> {
  const { data, error } = await supabase
    .from("students")
    .select(`
      *,
      profiles (*),
      enrollments (
        id,
        batch_id,
        status,
        batches (*)
      )
    `)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching students:", error)
    throw error
  }

  return (data || []) as unknown as StudentListItem[]
}

export async function fetchStudentById(id: string) {
  const { data: student, error } = await supabase
    .from("students")
    .select(`
      *,
      profiles (*),
      enrollments (
        id,
        batch_id,
        status,
        enrolled_on,
        batches (*)
      ),
      fee_payments (
        *,
        batches (*)
      ),
      attendance (
        *,
        batches (*)
      )
    `)
    .eq("id", id)
    .single()

  if (error) throw error

  const s = student as any
  const attendances = (s.attendance || []) as Attendance[]
  const totalDays = attendances.length
  const presentDays = attendances.filter((a) => a.status === "present").length
  const attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0

  return {
    ...s,
    attendanceRate,
    totalAttendanceRecords: totalDays,
    payments: (s.fee_payments || []) as (FeePayment & { batches: Batch })[],
  }
}

export async function createStudent(data: StudentFormData) {
  let profileId: string | null = null

  // 1. Create Auth user with ephemeral client (persistSession: false keeps Admin logged in)
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://rdpbiqmozkhjekjxroca.supabase.co"
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_DiRkJ1oJYVzVJXxh3e38Tw_yWFtc_Vp"

  const ephemeralClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })

  const { data: authData, error: authError } = await ephemeralClient.auth.signUp({
    email: data.email.trim(),
    password: data.password || "Student@123",
    options: {
      data: {
        full_name: data.full_name.trim(),
        role: "student",
        phone: data.phone?.trim() || null,
      },
    },
  })

  if (authError) {
    // Check if user profile already exists
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", data.email.trim())
      .maybeSingle()

    if (existingProfile) {
      profileId = (existingProfile as any).id
    } else {
      throw new Error(authError.message || "Failed to create student account")
    }
  } else if (authData?.user?.id) {
    profileId = authData.user.id

    // Update profile info if needed (trigger on_auth_user_created already created the row)
    try {
      await supabase
        .from("profiles")
        .update({
          full_name: data.full_name.trim(),
          phone: data.phone?.trim() || null,
        } as any)
        .eq("id", profileId)
    } catch (err) {
      // ignore
    }
  }

  if (!profileId) {
    throw new Error("Unable to obtain profile ID for the new student.")
  }

  // 2. Insert or update in students table
  let studentRec: any = null
  const { data: existingStudent } = await supabase
    .from("students")
    .select("*")
    .eq("profile_id", profileId)
    .maybeSingle()

  if (existingStudent) {
    const { data: updatedStudent, error: updateErr } = await supabase
      .from("students")
      .update({
        date_of_birth: data.date_of_birth || null,
        gender: data.gender || null,
        guardian_name: data.guardian_name || null,
        guardian_phone: data.guardian_phone || null,
        address: data.address || null,
        status: data.status || "active",
        fee_start_month: data.fee_start_month || null,
      } as any)
      .eq("id", (existingStudent as any).id)
      .select()
      .single()

    if (updateErr) throw updateErr
    studentRec = updatedStudent
  } else {
    const { data: newStudent, error: studentError } = await supabase
      .from("students")
      .insert({
        profile_id: profileId,
        date_of_birth: data.date_of_birth || null,
        gender: data.gender || null,
        guardian_name: data.guardian_name || null,
        guardian_phone: data.guardian_phone || null,
        address: data.address || null,
        status: data.status || "active",
        fee_start_month: data.fee_start_month || null,
      } as any)
      .select()
      .single()

    if (studentError) throw studentError
    studentRec = newStudent
  }

  // 3. Synchronize Batch Enrollments if batch_ids is provided
  if (data.batch_ids && studentRec) {
    const { error: delErr } = await supabase
      .from("enrollments")
      .delete()
      .eq("student_id", studentRec.id)
    if (delErr) {
      console.warn("Notice deleting old enrollments:", delErr)
    }

    if (data.batch_ids.length > 0) {
      const enrollmentRows = data.batch_ids.map((bId) => ({
        student_id: studentRec.id,
        batch_id: bId,
        status: "active",
      }))

      const { error: enrollErr } = await supabase
        .from("enrollments")
        .insert(enrollmentRows as any)
      if (enrollErr) {
        console.error("Error inserting enrollments:", enrollErr)
        throw enrollErr
      }
    }
  }

  return studentRec
}

export async function updateStudent(
  id: string,
  profileId: string,
  data: Partial<StudentFormData>
) {
  // Update profile info
  if (data.full_name || data.phone !== undefined) {
    const { error: pErr } = await supabase
      .from("profiles")
      .update({
        full_name: data.full_name,
        phone: data.phone || null,
      } as any)
      .eq("id", profileId)

    if (pErr) console.warn("Notice updating profile:", pErr.message)
  }

  // Update student table
  const studentUpdatePayload: any = {
    date_of_birth: data.date_of_birth || null,
    gender: data.gender || null,
    guardian_name: data.guardian_name || null,
    guardian_phone: data.guardian_phone || null,
    address: data.address || null,
  }
  if (data.status !== undefined) studentUpdatePayload.status = data.status
  if (data.fee_start_month !== undefined) studentUpdatePayload.fee_start_month = data.fee_start_month || null

  const { data: updated, error } = await supabase
    .from("students")
    .update(studentUpdatePayload)
    .eq("id", id)
    .select()
    .single()

  if (error) throw error

  // If batch_ids is provided, synchronize enrollments
  if (data.batch_ids) {
    const { error: delErr } = await supabase.from("enrollments").delete().eq("student_id", id)
    if (delErr) console.warn("Notice deleting enrollments:", delErr.message)

    if (data.batch_ids.length > 0) {
      const rows = data.batch_ids.map((bId) => ({
        student_id: id,
        batch_id: bId,
        status: "active",
      }))
      const { error: insErr } = await supabase.from("enrollments").insert(rows as any)
      if (insErr) {
        console.error("Error inserting new enrollments:", insErr)
        throw insErr
      }
    }
  }

  return updated
}

export async function deleteStudent(id: string, profileId: string) {
  const { error } = await supabase.from("students").delete().eq("id", id)
  if (error) throw error
  await supabase.from("profiles").delete().eq("id", profileId)
}

export { resetUserPassword } from "@/services/auth-admin"
