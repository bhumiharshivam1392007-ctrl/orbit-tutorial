-- =====================================================================
-- ORBIT - Coaching Institute Management System
-- Migration: Fee Start Month, Fee Waivers & Password Reset Support
-- File: supabase/4_fee_and_password_updates.sql
-- =====================================================================
-- Idempotent script: Safe to run multiple times without errors.
-- =====================================================================

-- 1. ADD fee_start_month TO students TABLE
-- If set, student fees are calculated starting from this month (1st day of month).
-- If NULL, fees calculate from enrollment/registration month as before.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'students' 
      AND column_name = 'fee_start_month'
  ) THEN
    ALTER TABLE public.students ADD COLUMN fee_start_month date NULL;
  END IF;
END $$;

-- 2. CREATE fee_waivers TABLE
-- Allows waiving a month's fee for:
--  - a specific student in a specific batch (student_id not null, batch_id not null)
--  - a specific student across all batches (student_id not null, batch_id null)
--  - ALL students in a specific batch (student_id null, batch_id not null)
--  - ALL students across all batches (student_id null, batch_id null)
CREATE TABLE IF NOT EXISTS public.fee_waivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NULL REFERENCES public.students(id) ON DELETE CASCADE,
  batch_id uuid NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  month date NOT NULL,
  reason text NULL,
  created_by uuid NULL REFERENCES public.profiles(id) DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now()
);

-- 3. UNIQUE INDEX TO PREVENT DUPLICATE WAIVERS
-- Uses COALESCE to handle NULL student_id and NULL batch_id properly
CREATE UNIQUE INDEX IF NOT EXISTS fee_waivers_unique_scope_idx 
ON public.fee_waivers (
  COALESCE(student_id, '00000000-0000-0000-0000-000000000000'::uuid),
  COALESCE(batch_id, '00000000-0000-0000-0000-000000000000'::uuid),
  month
);

-- 4. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.fee_waivers ENABLE ROW LEVEL SECURITY;

-- 5. RLS POLICIES FOR fee_waivers
-- Admin has full access (SELECT, INSERT, UPDATE, DELETE)
DROP POLICY IF EXISTS "fee_waivers_admin_all" ON public.fee_waivers;
CREATE POLICY "fee_waivers_admin_all" ON public.fee_waivers
  FOR ALL
  TO authenticated
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- Student can only SELECT waivers that apply to everyone (student_id IS NULL)
-- or that specifically apply to their student record (student_id = my_student_id())
DROP POLICY IF EXISTS "fee_waivers_student_select" ON public.fee_waivers;
CREATE POLICY "fee_waivers_student_select" ON public.fee_waivers
  FOR SELECT
  TO authenticated
  USING (
    public.get_my_role() = 'student'
    AND (student_id IS NULL OR student_id = public.my_student_id())
  );

-- Teachers have NO access to fee waivers (no policy granted for role teacher)

-- 6. PERMISSIONS
GRANT ALL ON public.fee_waivers TO authenticated;
GRANT ALL ON public.fee_waivers TO service_role;
