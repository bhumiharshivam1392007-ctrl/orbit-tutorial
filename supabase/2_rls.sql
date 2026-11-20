-- =====================================================================
-- ORBIT - Coaching Institute Management System
-- Database Migration: Non-Recursive RLS Policies & Security Helpers
-- File: 2_rls.sql
-- =====================================================================
-- This script completely eliminates infinite recursion (Postgres error 42P17)
-- by replacing cross-table RLS subqueries with STABLE SECURITY DEFINER functions.
--
-- Tables covered:
--   1. profiles
--   2. teachers
--   3. students
--   4. batches
--   5. enrollments
--   6. fee_structures
--   7. fee_payments
--   8. attendance
--   9. announcements
-- =====================================================================


-- =====================================================================
-- 1. SECURITY DEFINER HELPER FUNCTIONS
-- =====================================================================
-- Running with SECURITY DEFINER and STABLE bypasses RLS within the function,
-- breaking circular dependency chains between policies across tables.
-- =====================================================================

-- 1.1 Helper: get current user role
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1),
    'unknown'
  );
$$;

-- 1.2 Helper: get current user's student ID
CREATE OR REPLACE FUNCTION public.my_student_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.students WHERE profile_id = auth.uid() LIMIT 1;
$$;

-- 1.3 Helper: get current user's teacher ID
CREATE OR REPLACE FUNCTION public.my_teacher_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.teachers WHERE profile_id = auth.uid() LIMIT 1;
$$;

-- 1.4 Helper: check if current user is the teacher of a given batch
CREATE OR REPLACE FUNCTION public.is_teacher_of_batch(p_batch_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.batches b
    JOIN public.teachers t ON t.id = b.teacher_id
    WHERE b.id = p_batch_id
      AND t.profile_id = auth.uid()
  );
$$;

-- 1.5 Helper: check if current user is a teacher of a given student
CREATE OR REPLACE FUNCTION public.is_teacher_of_student(p_student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.enrollments e
    JOIN public.batches b ON b.id = e.batch_id
    JOIN public.teachers t ON t.id = b.teacher_id
    WHERE e.student_id = p_student_id
      AND t.profile_id = auth.uid()
  );
$$;

-- 1.6 Helper: check if current student is enrolled in a given batch
CREATE OR REPLACE FUNCTION public.is_enrolled_in_batch(p_batch_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.enrollments e
    JOIN public.students s ON s.id = e.student_id
    WHERE e.batch_id = p_batch_id
      AND s.profile_id = auth.uid()
  );
$$;

-- 1.7 Helper: check if current user is a parent of a given student (reserved for parent role)
CREATE OR REPLACE FUNCTION public.is_parent_of_student(p_student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT false;
$$;


-- =====================================================================
-- 2. ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- =====================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;


-- =====================================================================
-- 3. PROFILES POLICIES
-- =====================================================================

DROP POLICY IF EXISTS profiles_select_authenticated ON public.profiles;
DROP POLICY IF EXISTS profiles_select_all ON public.profiles;
DROP POLICY IF EXISTS profiles_self_select ON public.profiles;
DROP POLICY IF EXISTS profiles_admin_all ON public.profiles;
DROP POLICY IF EXISTS profiles_teacher_select ON public.profiles;
DROP POLICY IF EXISTS profiles_self_update ON public.profiles;
DROP POLICY IF EXISTS profiles_self_insert ON public.profiles;
DROP POLICY IF EXISTS profiles_admin_update ON public.profiles;
DROP POLICY IF EXISTS profiles_admin_delete ON public.profiles;

-- Authenticated users can view profile records (prevents recursion on get_my_role)
CREATE POLICY profiles_select_authenticated
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Users can insert their own profile on signup
CREATE POLICY profiles_self_insert
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Users can update their own profile; admins can update any profile
CREATE POLICY profiles_self_update
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid() OR get_my_role() = 'admin')
  WITH CHECK (id = auth.uid() OR get_my_role() = 'admin');

-- Admins can delete profiles
CREATE POLICY profiles_admin_delete
  ON public.profiles
  FOR DELETE
  TO authenticated
  USING (get_my_role() = 'admin');


-- =====================================================================
-- 4. TEACHERS POLICIES
-- =====================================================================

DROP POLICY IF EXISTS teachers_admin_all ON public.teachers;
DROP POLICY IF EXISTS teachers_teacher_select ON public.teachers;
DROP POLICY IF EXISTS teachers_teacher_update ON public.teachers;
DROP POLICY IF EXISTS teachers_select_authenticated ON public.teachers;
DROP POLICY IF EXISTS teachers_admin_insert ON public.teachers;
DROP POLICY IF EXISTS teachers_admin_update ON public.teachers;
DROP POLICY IF EXISTS teachers_admin_delete ON public.teachers;
DROP POLICY IF EXISTS teachers_update_policy ON public.teachers;

-- All authenticated users can view teacher listings (needed for rosters and batch cards)
CREATE POLICY teachers_select_authenticated
  ON public.teachers
  FOR SELECT
  TO authenticated
  USING (true);

-- Admins can insert teachers
CREATE POLICY teachers_admin_insert
  ON public.teachers
  FOR INSERT
  TO authenticated
  WITH CHECK (get_my_role() = 'admin');

-- Admins or the teacher themselves can update teacher info
CREATE POLICY teachers_update_policy
  ON public.teachers
  FOR UPDATE
  TO authenticated
  USING (get_my_role() = 'admin' OR profile_id = auth.uid())
  WITH CHECK (get_my_role() = 'admin' OR profile_id = auth.uid());

-- Admins can delete teachers
CREATE POLICY teachers_admin_delete
  ON public.teachers
  FOR DELETE
  TO authenticated
  USING (get_my_role() = 'admin');


-- =====================================================================
-- 5. STUDENTS POLICIES
-- =====================================================================

DROP POLICY IF EXISTS students_admin_all ON public.students;
DROP POLICY IF EXISTS students_teacher_select ON public.students;
DROP POLICY IF EXISTS students_student_select ON public.students;
DROP POLICY IF EXISTS students_student_update ON public.students;
DROP POLICY IF EXISTS students_parent_select ON public.students;

-- Admin has full access to students
CREATE POLICY students_admin_all
  ON public.students
  FOR ALL
  TO authenticated
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

-- Teachers can view students enrolled in their assigned batches
CREATE POLICY students_teacher_select
  ON public.students
  FOR SELECT
  TO authenticated
  USING (
    get_my_role() = 'teacher'
    AND is_teacher_of_student(id)
  );

-- Students can view their own record
CREATE POLICY students_student_select
  ON public.students
  FOR SELECT
  TO authenticated
  USING (
    get_my_role() = 'student'
    AND (profile_id = auth.uid() OR id = my_student_id())
  );

-- Students can update their own personal info
CREATE POLICY students_student_update
  ON public.students
  FOR UPDATE
  TO authenticated
  USING (
    get_my_role() = 'student'
    AND profile_id = auth.uid()
  )
  WITH CHECK (
    get_my_role() = 'student'
    AND profile_id = auth.uid()
  );

-- Parents can view their child's record
CREATE POLICY students_parent_select
  ON public.students
  FOR SELECT
  TO authenticated
  USING (is_parent_of_student(id));


-- =====================================================================
-- 6. BATCHES POLICIES
-- =====================================================================

DROP POLICY IF EXISTS batches_admin_all ON public.batches;
DROP POLICY IF EXISTS batches_teacher_select ON public.batches;
DROP POLICY IF EXISTS batches_student_select ON public.batches;
DROP POLICY IF EXISTS batches_select_authenticated ON public.batches;
DROP POLICY IF EXISTS batches_admin_insert ON public.batches;
DROP POLICY IF EXISTS batches_admin_update ON public.batches;
DROP POLICY IF EXISTS batches_admin_delete ON public.batches;

-- All authenticated users can view active batches
CREATE POLICY batches_select_authenticated
  ON public.batches
  FOR SELECT
  TO authenticated
  USING (true);

-- Admins can create batches
CREATE POLICY batches_admin_insert
  ON public.batches
  FOR INSERT
  TO authenticated
  WITH CHECK (get_my_role() = 'admin');

-- Admins can update batches
CREATE POLICY batches_admin_update
  ON public.batches
  FOR UPDATE
  TO authenticated
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

-- Admins can delete batches
CREATE POLICY batches_admin_delete
  ON public.batches
  FOR DELETE
  TO authenticated
  USING (get_my_role() = 'admin');


-- =====================================================================
-- 7. ENROLLMENTS POLICIES
-- =====================================================================

DROP POLICY IF EXISTS enrollments_admin_all ON public.enrollments;
DROP POLICY IF EXISTS enrollments_teacher_select ON public.enrollments;
DROP POLICY IF EXISTS enrollments_student_select ON public.enrollments;

-- Admin has full access to enrollments
CREATE POLICY enrollments_admin_all
  ON public.enrollments
  FOR ALL
  TO authenticated
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

-- Teachers can view enrollments for their own batches
CREATE POLICY enrollments_teacher_select
  ON public.enrollments
  FOR SELECT
  TO authenticated
  USING (
    get_my_role() = 'teacher'
    AND is_teacher_of_batch(batch_id)
  );

-- Students can view their own enrollments
CREATE POLICY enrollments_student_select
  ON public.enrollments
  FOR SELECT
  TO authenticated
  USING (
    get_my_role() = 'student'
    AND student_id = my_student_id()
  );


-- =====================================================================
-- 8. FEE_STRUCTURES POLICIES
-- =====================================================================

DROP POLICY IF EXISTS fee_structures_admin_all ON public.fee_structures;
DROP POLICY IF EXISTS fee_structures_teacher_select ON public.fee_structures;
DROP POLICY IF EXISTS fee_structures_student_select ON public.fee_structures;

-- Admin has full access to fee structures
CREATE POLICY fee_structures_admin_all
  ON public.fee_structures
  FOR ALL
  TO authenticated
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

-- Teachers can view fee structures for their batches
CREATE POLICY fee_structures_teacher_select
  ON public.fee_structures
  FOR SELECT
  TO authenticated
  USING (
    get_my_role() = 'teacher'
    AND is_teacher_of_batch(batch_id)
  );

-- Students can view fee structures for batches they are enrolled in
CREATE POLICY fee_structures_student_select
  ON public.fee_structures
  FOR SELECT
  TO authenticated
  USING (
    get_my_role() = 'student'
    AND is_enrolled_in_batch(batch_id)
  );


-- =====================================================================
-- 9. FEE_PAYMENTS POLICIES
-- =====================================================================

DROP POLICY IF EXISTS fee_payments_admin_all ON public.fee_payments;
DROP POLICY IF EXISTS fee_payments_teacher_select ON public.fee_payments;
DROP POLICY IF EXISTS fee_payments_student_select ON public.fee_payments;
DROP POLICY IF EXISTS fee_payments_parent_select ON public.fee_payments;

-- Admin has full access to record and manage fee payments
CREATE POLICY fee_payments_admin_all
  ON public.fee_payments
  FOR ALL
  TO authenticated
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

-- Teachers can view payment records for students in their batches
CREATE POLICY fee_payments_teacher_select
  ON public.fee_payments
  FOR SELECT
  TO authenticated
  USING (
    get_my_role() = 'teacher'
    AND is_teacher_of_batch(batch_id)
  );

-- Students can view their own fee payments
CREATE POLICY fee_payments_student_select
  ON public.fee_payments
  FOR SELECT
  TO authenticated
  USING (
    get_my_role() = 'student'
    AND student_id = my_student_id()
  );

-- Parents can view payments for their children
CREATE POLICY fee_payments_parent_select
  ON public.fee_payments
  FOR SELECT
  TO authenticated
  USING (is_parent_of_student(student_id));


-- =====================================================================
-- 10. ATTENDANCE POLICIES
-- =====================================================================

DROP POLICY IF EXISTS attendance_admin_all ON public.attendance;
DROP POLICY IF EXISTS attendance_teacher_select ON public.attendance;
DROP POLICY IF EXISTS attendance_teacher_insert ON public.attendance;
DROP POLICY IF EXISTS attendance_teacher_update ON public.attendance;
DROP POLICY IF EXISTS attendance_student_select ON public.attendance;

-- Admin has full access to attendance
CREATE POLICY attendance_admin_all
  ON public.attendance
  FOR ALL
  TO authenticated
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

-- Teachers can view attendance for their batches
CREATE POLICY attendance_teacher_select
  ON public.attendance
  FOR SELECT
  TO authenticated
  USING (
    get_my_role() = 'teacher'
    AND is_teacher_of_batch(batch_id)
  );

-- Teachers can mark attendance for their batches
CREATE POLICY attendance_teacher_insert
  ON public.attendance
  FOR INSERT
  TO authenticated
  WITH CHECK (
    get_my_role() = 'teacher'
    AND is_teacher_of_batch(batch_id)
  );

-- Teachers can update attendance for their batches
CREATE POLICY attendance_teacher_update
  ON public.attendance
  FOR UPDATE
  TO authenticated
  USING (
    get_my_role() = 'teacher'
    AND is_teacher_of_batch(batch_id)
  )
  WITH CHECK (
    get_my_role() = 'teacher'
    AND is_teacher_of_batch(batch_id)
  );

-- Students can view their own attendance
CREATE POLICY attendance_student_select
  ON public.attendance
  FOR SELECT
  TO authenticated
  USING (
    get_my_role() = 'student'
    AND student_id = my_student_id()
  );


-- =====================================================================
-- 11. ANNOUNCEMENTS POLICIES
-- =====================================================================

DROP POLICY IF EXISTS announcements_admin_all ON public.announcements;
DROP POLICY IF EXISTS announcements_teacher_select ON public.announcements;
DROP POLICY IF EXISTS announcements_teacher_insert ON public.announcements;
DROP POLICY IF EXISTS announcements_student_select ON public.announcements;

-- Admin has full access to announcements
CREATE POLICY announcements_admin_all
  ON public.announcements
  FOR ALL
  TO authenticated
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

-- Teachers can view institute-wide announcements, teacher announcements, and their batch announcements
CREATE POLICY announcements_teacher_select
  ON public.announcements
  FOR SELECT
  TO authenticated
  USING (
    get_my_role() = 'teacher'
    AND (
      target_audience IN ('all', 'teachers')
      OR (target_batch_id IS NOT NULL AND is_teacher_of_batch(target_batch_id))
    )
  );

-- Teachers can post announcements for their batches
CREATE POLICY announcements_teacher_insert
  ON public.announcements
  FOR INSERT
  TO authenticated
  WITH CHECK (
    get_my_role() = 'teacher'
    AND target_batch_id IS NOT NULL
    AND is_teacher_of_batch(target_batch_id)
  );

-- Students can view institute-wide announcements and announcements for their enrolled batches
CREATE POLICY announcements_student_select
  ON public.announcements
  FOR SELECT
  TO authenticated
  USING (
    get_my_role() = 'student'
    AND (
      target_audience IN ('all', 'students')
      OR (target_batch_id IS NOT NULL AND is_enrolled_in_batch(target_batch_id))
    )
  );

-- =====================================================================
-- Verification Query
-- =====================================================================
-- SELECT tablename, policyname, cmd FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname;
