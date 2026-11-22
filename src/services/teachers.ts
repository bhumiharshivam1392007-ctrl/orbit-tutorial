import { createClient } from "@supabase/supabase-js"
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
  batch_subjects?: Array<{
    id: string
    subject: string
    days?: string
    start_time?: string
    end_time?: string
    batches?: Batch
  }>
}

export async function fetchTeachers(): Promise<TeacherListItem[]> {
  const { data, error } = await supabase
    .from("teachers")
    .select(`
      *,
      profiles (*),
      batch_subjects (
        id,
        subject,
        days,
        start_time,
        end_time,
        batches (*)
      ),
      batches (*)
    `)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching teachers:", error)
    throw error
  }

  return (data || []).map((t: any) => {
    // Combine batches from batch_subjects and legacy batches
    const batchMap = new Map<string, Batch>()
    for (const bs of t.batch_subjects || []) {
      if (bs.batches) batchMap.set(bs.batches.id, bs.batches)
    }
    for (const b of t.batches || []) {
      if (b) batchMap.set(b.id, b)
    }

    return {
      ...t,
      batches: Array.from(batchMap.values()),
      batch_subjects: t.batch_subjects || [],
    }
  }) as unknown as TeacherListItem[]
}

export async function createTeacher(data: TeacherFormData) {
  let profileId: string | null = null

  // 1. Create Auth user directly with ephemeral client (persistSession: false keeps Admin logged in)
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
    password: data.password || "Teacher@123",
    options: {
      data: {
        full_name: data.full_name.trim(),
        role: "teacher",
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
      throw new Error(authError.message || "Failed to create teacher account")
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
  if (profileId && (data.full_name !== undefined || data.phone !== undefined)) {
    const profileUpdates: Record<string, any> = {}
    if (data.full_name !== undefined) profileUpdates.full_name = data.full_name
    if (data.phone !== undefined) profileUpdates.phone = data.phone || null

    const { error: profileError } = await supabase
      .from("profiles")
      .update(profileUpdates as any)
      .eq("id", profileId)

    if (profileError) {
      console.error("Error updating teacher profile:", profileError)
      throw new Error(`Profile update failed: ${profileError.message}`)
    }
  }

  const teacherUpdates: Record<string, any> = {}
  if (data.subject !== undefined) teacherUpdates.subject = data.subject
  if (data.qualification !== undefined) teacherUpdates.qualification = data.qualification || null
  if (data.salary !== undefined) teacherUpdates.salary = Number(data.salary)
  if (data.status !== undefined) teacherUpdates.status = data.status

  const { data: updated, error } = await supabase
    .from("teachers")
    .update(teacherUpdates as any)
    .eq("id", id)
    .select(`
      *,
      profiles (*)
    `)
    .single()

  if (error) {
    console.error("Error updating teacher record:", error)
    throw error
  }
  return updated
}

export async function deleteTeacher(id: string, profileId: string) {
  // 1. Delete from teachers table first
  const { error: teacherError } = await supabase
    .from("teachers")
    .delete()
    .eq("id", id)

  if (teacherError) {
    console.error("Error deleting teacher:", teacherError)
    throw teacherError
  }

  // 2. If profileId exists, safely attempt to remove profile as well
  if (profileId) {
    const { error: profileError } = await supabase
      .from("profiles")
      .delete()
      .eq("id", profileId)

    if (profileError) {
      console.warn("Notice: Teacher record was deleted, but profile could not be removed:", profileError.message)
    }
  }
}
