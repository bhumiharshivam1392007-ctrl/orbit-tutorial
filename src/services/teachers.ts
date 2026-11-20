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

  // 1. Try Edge function first
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

    if (!funcError && funcData?.user?.id) {
      profileId = funcData.user.id
    }
  } catch (err) {
    console.warn("Edge function not available, using client auth:", err)
  }

  // 2. Fallback: Use ephemeral Supabase client (persistSession: false keeps Admin logged in)
  if (!profileId) {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

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

      // Ensure profile row exists
      try {
        await supabase.from("profiles").upsert(
          {
            id: profileId,
            email: data.email.trim(),
            full_name: data.full_name.trim(),
            role: "teacher",
            phone: data.phone?.trim() || null,
          } as any,
          { onConflict: "id" }
        )
      } catch (err) {
        console.warn("Notice during profile upsert:", err)
      }
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
