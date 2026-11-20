-- =============================================
-- ORBIT - Coaching Institute Management
-- Row Level Security (RLS) Policies (2_rls.sql)
-- =============================================
-- Prerequisites:
--   1_schema.sql must be run first.
--   Assumes get_my_role() function exists and returns 'admin', 'teacher', or 'student'.
-- =============================================


-- =============================================
-- ENABLE RLS ON ALL TABLES
-- =============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;


-- =============================================
-- PROFILES POLICIES (Clean, Non-recursive)
-- =============================================

DROP POLICY IF EXISTS profiles_select_authenticated ON public.profiles;
DROP POLICY IF EXISTS profiles_select_all ON public.profiles;
DROP POLICY IF EXISTS profiles_self_select ON public.profiles;
DROP POLICY IF EXISTS profiles_admin_all ON public.profiles;
DROP POLICY IF EXISTS profiles_teacher_select ON public.profiles;
DROP POLICY IF EXISTS profiles_self_update ON public.profiles;
DROP POLICY IF EXISTS profiles_self_insert ON public.profiles;

-- 1. Any authenticated user can read basic profile info (prevents infinite recursion with get_my_role())
CREATE POLICY profiles_select_authenticated
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- 2. Users can insert their own profile record
CREATE POLICY profiles_self_insert
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- 3. Users can update their own profile info
CREATE POLICY profiles_self_update
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());


-- =============================================
-- STUDENTS POLICIES
-- =============================================

DROP POLICY IF EXISTS students_admin_all ON public.students;
CREATE POLICY students_admin_all
  ON public.students
  FOR ALL
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

DROP POLICY IF EXISTS students_teacher_select ON public.students;
CREATE POLICY students_teacher_select
  ON public.students
  FOR SELECT
  USING (
    get_my_role() = 'teacher'
    AND id IN (
      SELECT e.student_id
      FROM public.enrollments e
      JOIN public.batches b ON b.id = e.batch_id
      JOIN public.teachers t ON t.id = b.teacher_id
      WHERE t.profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS students_student_select ON public.students;
CREATE POLICY students_student_select
  ON public.students
  FOR SELECT
  USING (
    get_my_role() = 'student'
    AND profile_id = auth.uid()
  );


-- =============================================
-- TEACHERS POLICIES
-- =============================================

DROP POLICY IF EXISTS teachers_admin_all ON public.teachers;
DROP POLICY IF EXISTS teachers_teacher_select ON public.teachers;
DROP POLICY IF EXISTS teachers_teacher_update ON public.teachers;
DROP POLICY IF EXISTS teachers_select_authenticated ON public.teachers;
DROP POLICY IF EXISTS teachers_admin_insert ON public.teachers;
DROP POLICY IF EXISTS teachers_admin_delete ON public.teachers;
DROP POLICY IF EXISTS teachers_update_policy ON public.teachers;

-- 1. All authenticated users can read teacher profiles (needed for class rosters and course listings)
CREATE POLICY teachers_select_authenticated
  ON public.teachers
  FOR SELECT
  TO authenticated
  USING (true);

-- 2. Only admin can insert teachers
CREATE POLICY teachers_admin_insert
  ON public.teachers
  FOR INSERT
  TO authenticated
  WITH CHECK (get_my_role() = 'admin');

-- 3. Only admin can delete teachers
CREATE POLICY teachers_admin_delete
  ON public.teachers
  FOR DELETE
  TO authenticated
  USING (get_my_role() = 'admin');

-- 4. Admin or the teacher can update teacher records
CREATE POLICY teachers_update_policy
  ON public.teachers
  FOR UPDATE
  TO authenticated
  USING (get_my_role() = 'admin' OR profile_id = auth.uid())
  WITH CHECK (get_my_role() = 'admin' OR profile_id = auth.uid());


-- =============================================
-- BATCHES POLICIES (Non-recursive)
-- =============================================

DROP POLICY IF EXISTS batches_admin_all ON public.batches;
DROP POLICY IF EXISTS batches_teacher_select ON public.batches;
DROP POLICY IF EXISTS batches_student_select ON public.batches;
DROP POLICY IF EXISTS batches_select_authenticated ON public.batches;
DROP POLICY IF EXISTS batches_admin_insert ON public.batches;
DROP POLICY IF EXISTS batches_admin_update ON public.batches;
DROP POLICY IF EXISTS batches_admin_delete ON public.batches;

-- 1. All authenticated users can view active batches (eliminates circular recursion with enrollments!)
CREATE POLICY batches_select_authenticated
  ON public.batches
  FOR SELECT
  TO authenticated
  USING (true);

-- 2. Only admin can create batches
CREATE POLICY batches_admin_insert
  ON public.batches
  FOR INSERT
  TO authenticated
  WITH CHECK (get_my_role() = 'admin');

-- 3. Only admin can update batches
CREATE POLICY batches_admin_update
  ON public.batches
  FOR UPDATE
  TO authenticated
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

-- 4. Only admin can delete batches
CREATE POLICY batches_admin_delete
  ON public.batches
  FOR DELETE
  TO authenticated
  USING (get_my_role() = 'admin');


-- =============================================
-- ENROLLMENTS POLICIES
-- =============================================

DROP POLICY IF EXISTS enrollments_admin_all ON public.enrollments;
CREATE POLICY enrollments_admin_all
  ON public.enrollments
  FOR ALL
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

DROP POLICY IF EXISTS enrollments_teacher_select ON public.enrollments;
CREATE POLICY enrollments_teacher_select
  ON public.enrollments
  FOR SELECT
  USING (
    get_my_role() = 'teacher'
    AND batch_id IN (
      SELECT b.id
      FROM public.batches b
      JOIN public.teachers t ON t.id = b.teacher_id
      WHERE t.profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS enrollments_student_select ON public.enrollments;
CREATE POLICY enrollments_student_select
  ON public.enrollments
  FOR SELECT
  USING (
    get_my_role() = 'student'
    AND student_id IN (
      SELECT s.id
      FROM public.students s
      WHERE s.profile_id = auth.uid()
    )
  );


-- =============================================
-- FEE_STRUCTURES POLICIES
-- =============================================

DROP POLICY IF EXISTS fee_structures_admin_all ON public.fee_structures;
CREATE POLICY fee_structures_admin_all
  ON public.fee_structures
  FOR ALL
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

DROP POLICY IF EXISTS fee_structures_teacher_select ON public.fee_structures;
CREATE POLICY fee_structures_teacher_select
  ON public.fee_structures
  FOR SELECT
  USING (
    get_my_role() = 'teacher'
    AND batch_id IN (
      SELECT b.id
      FROM public.batches b
      JOIN public.teachers t ON t.id = b.teacher_id
      WHERE t.profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS fee_structures_student_select ON public.fee_structures;
CREATE POLICY fee_structures_student_select
  ON public.fee_structures
  FOR SELECT
  USING (
    get_my_role() = 'student'
    AND batch_id IN (
      SELECT e.batch_id
      FROM public.enrollments e
      JOIN public.students s ON s.id = e.student_id
      WHERE s.profile_id = auth.uid()
    )
  );


-- =============================================
-- FEE_PAYMENTS POLICIES
-- =============================================

DROP POLICY IF EXISTS fee_payments_admin_all ON public.fee_payments;
CREATE POLICY fee_payments_admin_all
  ON public.fee_payments
  FOR ALL
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

DROP POLICY IF EXISTS fee_payments_teacher_select ON public.fee_payments;
CREATE POLICY fee_payments_teacher_select
  ON public.fee_payments
  FOR SELECT
  USING (
    get_my_role() = 'teacher'
    AND student_id IN (
      SELECT e.student_id
      FROM public.enrollments e
      JOIN public.batches b ON b.id = e.batch_id
      JOIN public.teachers t ON t.id = b.teacher_id
      WHERE t.profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS fee_payments_student_select ON public.fee_payments;
CREATE POLICY fee_payments_student_select
  ON public.fee_payments
  FOR SELECT
  USING (
    get_my_role() = 'student'
    AND student_id IN (
      SELECT s.id
      FROM public.students s
      WHERE s.profile_id = auth.uid()
    )
  );


-- =============================================
-- ATTENDANCE POLICIES
-- =============================================

DROP POLICY IF EXISTS attendance_admin_all ON public.attendance;
CREATE POLICY attendance_admin_all
  ON public.attendance
  FOR ALL
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

DROP POLICY IF EXISTS attendance_teacher_select ON public.attendance;
CREATE POLICY attendance_teacher_select
  ON public.attendance
  FOR SELECT
  USING (
    get_my_role() = 'teacher'
    AND batch_id IN (
      SELECT b.id
      FROM public.batches b
      JOIN public.teachers t ON t.id = b.teacher_id
      WHERE t.profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS attendance_teacher_insert ON public.attendance;
CREATE POLICY attendance_teacher_insert
  ON public.attendance
  FOR INSERT
  WITH CHECK (
    get_my_role() = 'teacher'
    AND batch_id IN (
      SELECT b.id
      FROM public.batches b
      JOIN public.teachers t ON t.id = b.teacher_id
      WHERE t.profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS attendance_teacher_update ON public.attendance;
CREATE POLICY attendance_teacher_update
  ON public.attendance
  FOR UPDATE
  USING (
    get_my_role() = 'teacher'
    AND batch_id IN (
      SELECT b.id
      FROM public.batches b
      JOIN public.teachers t ON t.id = b.teacher_id
      WHERE t.profile_id = auth.uid()
    )
  )
  WITH CHECK (
    get_my_role() = 'teacher'
    AND batch_id IN (
      SELECT b.id
      FROM public.batches b
      JOIN public.teachers t ON t.id = b.teacher_id
      WHERE t.profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS attendance_student_select ON public.attendance;
CREATE POLICY attendance_student_select
  ON public.attendance
  FOR SELECT
  USING (
    get_my_role() = 'student'
    AND student_id IN (
      SELECT s.id
      FROM public.students s
      WHERE s.profile_id = auth.uid()
    )
  );


-- =============================================
-- ANNOUNCEMENTS POLICIES
-- =============================================

DROP POLICY IF EXISTS announcements_admin_all ON public.announcements;
CREATE POLICY announcements_admin_all
  ON public.announcements
  FOR ALL
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

DROP POLICY IF EXISTS announcements_teacher_select ON public.announcements;
CREATE POLICY announcements_teacher_select
  ON public.announcements
  FOR SELECT
  USING (
    get_my_role() = 'teacher'
    AND (
      target_audience = 'all'
      OR target_audience = 'teachers'
      OR target_batch_id IN (
        SELECT b.id
        FROM public.batches b
        JOIN public.teachers t ON t.id = b.teacher_id
        WHERE t.profile_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS announcements_teacher_insert ON public.announcements;
CREATE POLICY announcements_teacher_insert
  ON public.announcements
  FOR INSERT
  WITH CHECK (
    get_my_role() = 'teacher'
    AND target_batch_id IN (
      SELECT b.id
      FROM public.batches b
      JOIN public.teachers t ON t.id = b.teacher_id
      WHERE t.profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS announcements_student_select ON public.announcements;
CREATE POLICY announcements_student_select
  ON public.announcements
  FOR SELECT
  USING (
    get_my_role() = 'student'
    AND (
      target_audience IN ('all', 'students')
      OR target_batch_id IN (
        SELECT e.batch_id
        FROM public.enrollments e
        JOIN public.students s ON s.id = e.student_id
        WHERE s.profile_id = auth.uid()
      )
    )
  );


-- =============================================
-- END OF RLS POLICIES
-- =============================================
