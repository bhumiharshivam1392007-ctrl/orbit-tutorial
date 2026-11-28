import { supabase } from "@/lib/supabase"

export interface ResetUserPasswordResponse {
  message: string
  user_id: string
}

/**
 * Resets the password of a student or teacher via the Supabase Edge Function `reset-user-password`.
 * Restricted to admin callers.
 */
export async function resetUserPassword(
  userId: string,
  newPassword: string
): Promise<ResetUserPasswordResponse> {
  if (!userId) {
    throw new Error("Target user ID is required")
  }
  if (!newPassword || newPassword.length < 8) {
    throw new Error("Password must be at least 8 characters long")
  }

  // Ensure active session token is present
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData?.session?.access_token

  const { data, error } = await supabase.functions.invoke("reset-user-password", {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: {
      user_id: userId,
      new_password: newPassword,
    },
  })

  if (error) {
    console.error("Error invoking reset-user-password edge function:", error)
    let message = error.message
    try {
      if ((error as any).context && typeof (error as any).context.json === "function") {
        const body = await (error as any).context.json()
        if (body?.error) message = body.error
      }
    } catch {
      // ignore
    }
    throw new Error(message || "Failed to reset password")
  }

  if (data?.error) {
    throw new Error(data.error)
  }

  return data as ResetUserPasswordResponse
}
