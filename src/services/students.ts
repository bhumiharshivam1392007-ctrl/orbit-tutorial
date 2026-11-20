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

  // 1. Create Auth User via Edge Function or fallback to existing profile
  try {
    const { data: funcData, error: funcError } = await supabase.functions.invoke("create-user", {
      body: {
        email: data.email.trim(),
        password: data.password || "Student@123",
        full_name: data.full_name.trim(),
        role: "student",
        phone: data.phone?.trim() || null,
      },
    })

    if (funcError) {
      throw new Error(funcError.message || "Failed to create student user via Edge Function")
    }

    profileId = funcData?.user?.id
  } catch (err: any) {
    console.warn("Edge function invocation failed, checking profiles:", err)
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", data.email.trim())
      .maybeSingle()

    if (existingProfile) {
      profileId = (existingProfile as any).id
    } else {
      throw new Error(
        err.message ||
        "Could not create student account. Make sure the 'create-user' Supabase Edge Function is deployed or create the user in the Supabase Auth dashboard."
      )
    }
  }

  if (!profileId) {
    throw new Error("Unable to obtain profile ID for the new student.")
  }

  // 2. Insert into students table
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
    } as any)
    .select()
    .single()

  if (studentError) throw studentError

  const studentRec = newStudent as any

  // 3. Insert Batch Enrollments if selected
  if (data.batch_ids && data.batch_ids.length > 0 && studentRec) {
    const enrollmentRows = data.batch_ids.map((bId) => ({
      student_id: studentRec.id,
      batch_id: bId,
      status: "active",
    }))

    await supabase.from("enrollments").insert(enrollmentRows as any)
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
    await supabase
      .from("profiles")
      .update({
        full_name: data.full_name,
        phone: data.phone || null,
      } as any)
      .eq("id", profileId)
  }

  // Update student table
  const { data: updated, error } = await supabase
    .from("students")
    .update({
      date_of_birth: data.date_of_birth || null,
      gender: data.gender || null,
      guardian_name: data.guardian_name || null,
      guardian_phone: data.guardian_phone || null,
      address: data.address || null,
      status: data.status,
    } as any)
    .eq("id", id)
    .select()
    .single()

  if (error) throw error

  // If batch_ids is provided, synchronize enrollments
  if (data.batch_ids) {
    await supabase.from("enrollments").delete().eq("student_id", id)

    if (data.batch_ids.length > 0) {
      const rows = data.batch_ids.map((bId) => ({
        student_id: id,
        batch_id: bId,
        status: "active",
      }))
      await supabase.from("enrollments").insert(rows as any)
    }
  }

  return updated
}

export async function deleteStudent(id: string, profileId: string) {
  const { error } = await supabase.from("students").delete().eq("id", id)
  if (error) throw error
  await supabase.from("profiles").delete().eq("id", profileId)
}
