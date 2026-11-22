-- =====================================================================
-- ORBIT - Coaching Institute Management System
-- Migration: 3_batch_subjects.sql
-- Multi-Subject Batch Architecture Migration
-- =====================================================================
-- This migration refactors the batch module so that:
--   1. One Batch (Class, e.g. Class 5, Class 6) supports multiple subjects,
--      each taught by different faculty teachers at different lecture timings.
--   2. Existing batch columns (subject, timing, teacher_id) are made NULLABLE
--      for non-breaking backward compatibility.
--   3. Creates the new `batch_subjects` relational table.
--   4. Idempotently migrates existing single-subject batches into batch_subjects.
--   5. Configures non-recursive RLS and updates security helper functions.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. MAKE OLD BATCH COLUMNS NULLABLE (Backward-Compatible)
-- ---------------------------------------------------------------------

DO $$
BEGIN
  -- Make subject nullable if exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'batches' AND column_name = 'subject'
  ) THEN
    ALTER TABLE public.batches ALTER COLUMN subject DROP NOT NULL;
  END IF;

  -- Make timing nullable if exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'batches' AND column_name = 'timing'
  ) THEN
    ALTER TABLE public.batches ALTER COLUMN timing DROP NOT NULL;
  END IF;
END $$;


-- ---------------------------------------------------------------------
-- 2. CREATE NEW TABLE: batch_subjects
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.batch_subjects (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id    uuid NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  subject     text NOT NULL,
  teacher_id  uuid REFERENCES public.teachers(id) ON DELETE SET NULL,
  days        text DEFAULT 'Mon-Fri',
  start_time  time,
  end_time    time,
  created_at  timestamptz DEFAULT now()
);

COMMENT ON TABLE public.batch_subjects IS 'Maps individual academic subjects and faculty lecture schedules within a class batch';

-- Indexes for lightning fast lookups
CREATE INDEX IF NOT EXISTS idx_batch_subjects_batch_id ON public.batch_subjects(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_subjects_teacher_id ON public.batch_subjects(teacher_id);


-- ---------------------------------------------------------------------
-- 3. MIGRATE EXISTING DATA INTO batch_subjects (Idempotent)
-- ---------------------------------------------------------------------

INSERT INTO public.batch_subjects (batch_id, subject, teacher_id, days, start_time, end_time)
SELECT 
  b.id,
  COALESCE(NULLIF(b.subject, ''), 'General Subject'),
  b.teacher_id,
  COALESCE(NULLIF(split_part(b.timing, ' ', 1), ''), 'Mon-Fri'),
  '09:00:00'::time,
  '10:30:00'::time
FROM public.batches b
WHERE NOT EXISTS (
  SELECT 1 FROM public.batch_subjects bs WHERE bs.batch_id = b.id
)
AND b.subject IS NOT NULL;


-- ---------------------------------------------------------------------
-- 4. UPDATE SECURITY DEFINER HELPERS TO SUPPORT MULTI-SUBJECT
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_teacher_of_batch(p_batch_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Checks if teacher teaches any subject in the batch (or legacy batches.teacher_id)
  SELECT EXISTS (
    SELECT 1 
    FROM public.batch_subjects bs
    JOIN public.teachers t ON t.id = bs.teacher_id
    WHERE bs.batch_id = p_batch_id
      AND t.profile_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 
    FROM public.batches b
    JOIN public.teachers t ON t.id = b.teacher_id
    WHERE b.id = p_batch_id
      AND t.profile_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_teacher_of_student(p_student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Checks if teacher teaches any batch the student is enrolled in
  SELECT EXISTS (
    SELECT 1 
    FROM public.enrollments e
    WHERE e.student_id = p_student_id
      AND public.is_teacher_of_batch(e.batch_id)
  );
$$;


-- ---------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS) ON batch_subjects
-- ---------------------------------------------------------------------

ALTER TABLE public.batch_subjects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS batch_subjects_select_authenticated ON public.batch_subjects;
DROP POLICY IF EXISTS batch_subjects_admin_all ON public.batch_subjects;

-- All authenticated users (admin, teachers, students) can view class subjects & schedules
CREATE POLICY batch_subjects_select_authenticated
  ON public.batch_subjects
  FOR SELECT
  TO authenticated
  USING (true);

-- Only admin can insert, update, or delete batch subjects
CREATE POLICY batch_subjects_admin_all
  ON public.batch_subjects
  FOR ALL
  TO authenticated
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- Verification query
-- SELECT count(*) FROM public.batch_subjects;
