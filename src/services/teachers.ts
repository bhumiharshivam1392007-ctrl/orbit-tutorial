import { supabase } from "@/lib/supabase"
import type { TeacherWithProfile, Batch } from "@/types/database"

export interface TeacherFormData {
  full_name: string
  email: string
  password?: string
  phone?: string
  subject: string
  qualification?: string
  salary?: number
  status?: "active" | "inactive"
}

export interface TeacherListItem extends TeacherWithProfile {
  batches: Batch[]
}

export async function fetchTeachers(): Promise<TeacherListItem[]> {
  const { data, error } = await supabase
    .from("teachers")
    .select(`
      *,
      profiles (*),
      batches (*)
    `)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching teachers:", error)
    throw error
  }

  return (data || []) as unknown as TeacherListItem[]
}

export async function createTeacher(data: TeacherFormData) {
  let profileId: string | null = null

  try {
    const { data: funcData, error: funcError } = await supabase.functions.invoke("create-user", {
      body: {
        email: data.email.trim(),
        password: data.password || "Teacher@123",
        full_name: data.full_name.trim(),
        role: "teacher",
        phone: data.phone?.trim() || null,
      },
    })

    if (funcError) {
      throw new Error(funcError.message || "Failed to create teacher account via Edge Function")
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
        "Could not create user account. Make sure the 'create-user' Supabase Edge Function is deployed or create the user in the Supabase Auth dashboard."
      )
    }
  }

  if (!profileId) {
    throw new Error("Unable to obtain profile ID for the new teacher.")
  }

  const { data: newTeacher, error: teacherError } = await supabase
    .from("teachers")
    .insert({
      profile_id: profileId,
      subject: data.subject,
      qualification: data.qualification || null,
      salary: data.salary ? Number(data.salary) : null,
      status: data.status || "active",
    } as any)
    .select()
    .single()

  if (teacherError) throw teacherError
  return newTeacher
}

export async function updateTeacher(id: string, profileId: string, data: Partial<TeacherFormData>) {
  if (data.full_name || data.phone) {
    await supabase
      .from("profiles")
      .update({
        full_name: data.full_name,
        phone: data.phone || null,
      } as any)
      .eq("id", profileId)
  }

  const { data: updated, error } = await supabase
    .from("teachers")
    .update({
      subject: data.subject,
      qualification: data.qualification || null,
      salary: data.salary !== undefined ? Number(data.salary) : undefined,
      status: data.status,
    } as any)
    .eq("id", id)
    .select()
    .single()

  if (error) throw error
  return updated
}

export async function deleteTeacher(id: string, profileId: string) {
  const { error } = await supabase.from("teachers").delete().eq("id", id)
  if (error) throw error
  await supabase.from("profiles").delete().eq("id", profileId)
}
