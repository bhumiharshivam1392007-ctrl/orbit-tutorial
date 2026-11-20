import { supabase } from "@/lib/supabase"
import type { AnnouncementWithAuthor, TargetAudience } from "@/types/database"

export interface AnnouncementFormData {
  title: string
  content: string
  target_audience: TargetAudience
  target_batch_id?: string | null
}

export async function fetchAnnouncements(): Promise<AnnouncementWithAuthor[]> {
  const { data, error } = await supabase
    .from("announcements")
    .select(`
      *,
      profiles (
        id,
        role,
        full_name,
        email,
        phone,
        avatar_url,
        created_at,
        updated_at
      )
    `)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching announcements:", error)
    throw error
  }

  return (data || []) as unknown as AnnouncementWithAuthor[]
}

export async function createAnnouncement(data: AnnouncementFormData, authorId: string) {
  const { data: newAnnouncement, error } = await supabase
    .from("announcements")
    .insert({
      author_id: authorId,
      title: data.title.trim(),
      content: data.content.trim(),
      target_audience: data.target_audience,
      target_batch_id: data.target_batch_id || null,
    } as any)
    .select(`
      *,
      profiles (*)
    `)
    .single()

  if (error) throw error
  return newAnnouncement
}

export async function deleteAnnouncement(id: string) {
  const { error } = await supabase.from("announcements").delete().eq("id", id)
  if (error) throw error
}

