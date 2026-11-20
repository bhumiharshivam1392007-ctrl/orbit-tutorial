import { supabase } from "@/lib/supabase"
import type { BatchWithTeacher } from "@/types/database"

export interface BatchFormData {
  name: string
  subject: string
  timing: string
  teacher_id?: string | null
  monthly_fee: number
  status: "active" | "inactive"
}

export async function fetchBatches(): Promise<(BatchWithTeacher & { student_count: number })[]> {
  const { data: batches, error } = await supabase
    .from("batches")
    .select(`
      *,
      teachers (
        id,
        profile_id,
        subject,
        qualification,
        salary,
        status,
        created_at,
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
      ),
      enrollments (
        id,
        status
      )
    `)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching batches:", error)
    throw error
  }

  return (batches || []).map((b: any) => ({
    ...b,
    student_count: (b.enrollments || []).filter((e: any) => e.status === "active").length,
  }))
}

export async function createBatch(data: BatchFormData) {
  const { data: newBatch, error } = await supabase
    .from("batches")
    .insert({
      name: data.name,
      subject: data.subject,
      timing: data.timing,
      teacher_id: data.teacher_id || null,
      monthly_fee: Number(data.monthly_fee),
      status: data.status,
    } as any)
    .select()
    .single()

  if (error) throw error

  // Also create a default monthly fee_structure for this batch
  if (newBatch) {
    await supabase.from("fee_structures").insert({
      batch_id: (newBatch as any).id,
      fee_type: "monthly",
      amount: Number(data.monthly_fee),
      description: `Monthly tuition fee for ${data.name}`,
    } as any)
  }

  return newBatch
}

export async function updateBatch(id: string, data: Partial<BatchFormData>) {
  const payload: any = { ...data }
  if (data.monthly_fee !== undefined) {
    payload.monthly_fee = Number(data.monthly_fee)
  }

  const { data: updated, error } = await supabase
    .from("batches")
    .update(payload)
    .eq("id", id)
    .select()
    .single()

  if (error) throw error
  return updated
}

export async function deleteBatch(id: string) {
  const { error } = await supabase.from("batches").delete().eq("id", id)
  if (error) throw error
}
