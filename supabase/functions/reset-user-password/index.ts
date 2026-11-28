// supabase/functions/reset-user-password/index.ts
// ============================================================
// Supabase Edge Function — Reset User Password (Admin Only)
//
// Allows an authenticated admin to reset a student's or teacher's
// password using Supabase Auth Admin API.
// Never logs or stores plaintext passwords.
//
// Deploy: supabase functions deploy reset-user-password --project-ref rdpbiqmozkhjekjxroca
// ============================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ResetPasswordPayload {
  user_id: string
  new_password: string
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Verify Authorization Header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace(/^Bearer\s+/i, '').trim()
    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Missing bearer token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Admin client to verify token & perform updates
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Also create caller client with caller's token
    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    })

    // 2. Validate caller's JWT token (pass token directly so it doesn't fail on missing local session in Deno)
    const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser(token)
    if (callerError || !caller) {
      console.error('Caller authentication failed:', callerError?.message)
      return new Response(
        JSON.stringify({ error: `Unauthorized: ${callerError?.message || 'Invalid or expired session'}` }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Verify caller has 'admin' role in profiles
    const { data: callerProfile, error: profileError } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .maybeSingle()

    if (profileError || callerProfile?.role !== 'admin') {
      console.error('Admin role check failed for caller:', caller.id, callerProfile, profileError)
      return new Response(
        JSON.stringify({ error: 'Forbidden: Only administrators can reset user passwords' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Parse request payload
    const body: ResetPasswordPayload = await req.json()
    const { user_id, new_password } = body

    if (!user_id || !new_password) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: user_id and new_password are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (typeof new_password !== 'string' || new_password.length < 8) {
      return new Response(
        JSON.stringify({ error: 'New password must be at least 8 characters long' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 5. Resolve target user id (handle both profiles.id and students.id / teachers.id)
    let targetAuthUserId = user_id
    let { data: targetProfile } = await adminClient
      .from('profiles')
      .select('id, role')
      .eq('id', user_id)
      .maybeSingle()

    if (!targetProfile) {
      // Check if user_id was student id
      const { data: studentRecord } = await adminClient
        .from('students')
        .select('profile_id')
        .eq('id', user_id)
        .maybeSingle()

      if (studentRecord?.profile_id) {
        targetAuthUserId = studentRecord.profile_id
        const { data: p } = await adminClient
          .from('profiles')
          .select('id, role')
          .eq('id', targetAuthUserId)
          .maybeSingle()
        targetProfile = p
      }
    }

    if (!targetProfile) {
      // Check if user_id was teacher id
      const { data: teacherRecord } = await adminClient
        .from('teachers')
        .select('profile_id')
        .eq('id', user_id)
        .maybeSingle()

      if (teacherRecord?.profile_id) {
        targetAuthUserId = teacherRecord.profile_id
        const { data: p } = await adminClient
          .from('profiles')
          .select('id, role')
          .eq('id', targetAuthUserId)
          .maybeSingle()
        targetProfile = p
      }
    }

    if (!targetProfile) {
      return new Response(
        JSON.stringify({ error: 'Target user profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!['student', 'teacher'].includes(targetProfile.role)) {
      return new Response(
        JSON.stringify({ error: 'Only student and teacher passwords can be reset via this function' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 6. Update password via Supabase Auth Admin API
    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      targetAuthUserId,
      { password: new_password }
    )

    if (updateError) {
      console.error('Error updating password via admin API:', updateError)
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        message: 'Password updated successfully',
        user_id: targetAuthUserId,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Unhandled error in reset-user-password:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
