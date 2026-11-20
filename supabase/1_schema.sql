-- =====================================================================
-- ORBIT — Coaching Institute Management System
-- Schema Migration: 1_schema.sql
-- =====================================================================
-- This file defines the complete database schema for ORBIT:
--   1. Required PostgreSQL extensions (uuid-ossp, pgcrypto)
--   2. All application tables: profiles, students, teachers, batches,
--      enrollments, fee_structures, fee_payments, attendance, announcements
--   3. Helper function: get_my_role() (created after profiles table)
--   4. Auth trigger: handle_new_user() to auto-create profile on sign-up
--   5. Updated_at trigger: keeps profiles.updated_at fresh
--   6. Indexes: performance indexes for common lookups
-- =====================================================================


-- =====================================================================
-- 1. EXTENSIONS
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- =====================================================================
-- 2. TABLES (Created first so functions & triggers can reference them)
-- =====================================================================

-- ----- profiles ------------------------------------------------------
-- Central identity table; every auth.users row gets a matching profile
-- via the on_auth_user_created trigger.
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.profiles (
  id         uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role       text        NOT NULL CHECK (role IN ('admin', 'teacher', 'student')),
  full_name  text        NOT NULL,
  email      text        NOT NULL,
  phone      text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.profiles IS 'User profile linked 1-to-1 with auth.users';


-- ----- students ------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.students (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  date_of_birth date,
  gender        text        CHECK (gender IN ('male', 'female', 'other')),
  guardian_name text,
  guardian_phone text,
  address       text,
  status        text        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.students IS 'Extended details for users with the student role';


-- ----- teachers ------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.teachers (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  subject       text,
  qualification text,
  salary        numeric(10,2),
  status        text        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.teachers IS 'Extended details for users with the teacher role';


-- ----- batches -------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.batches (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  subject     text        NOT NULL,
  timing      text        NOT NULL,                                        -- e.g. 'Mon-Fri 9:00-10:30'
  teacher_id  uuid        REFERENCES public.teachers(id) ON DELETE SET NULL,
  monthly_fee numeric(10,2) NOT NULL DEFAULT 0,
  status      text        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.batches IS 'Teaching batches / classes offered by the institute';


-- ----- enrollments ---------------------------------------------------

CREATE TABLE IF NOT EXISTS public.enrollments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  batch_id    uuid NOT NULL REFERENCES public.batches(id)  ON DELETE CASCADE,
  enrolled_on date NOT NULL DEFAULT CURRENT_DATE,
  left_on     date,
  status      text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'left')),
  UNIQUE (student_id, batch_id)
);

COMMENT ON TABLE public.enrollments IS 'Maps students to their enrolled batches';


-- ----- fee_structures ------------------------------------------------

CREATE TABLE IF NOT EXISTS public.fee_structures (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id    uuid        NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  fee_type    text        NOT NULL CHECK (fee_type IN ('monthly', 'quarterly', 'yearly', 'one-time')),
  amount      numeric(10,2) NOT NULL,
  description text
);

COMMENT ON TABLE public.fee_structures IS 'Defines the fee plans available for each batch';


-- ----- fee_payments --------------------------------------------------

CREATE TABLE IF NOT EXISTS public.fee_payments (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      uuid        NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  batch_id        uuid        NOT NULL REFERENCES public.batches(id)  ON DELETE CASCADE,
  amount          numeric(10,2) NOT NULL,
  payment_mode    text        NOT NULL CHECK (payment_mode IN ('cash', 'upi', 'bank_transfer')),
  transaction_ref text,
  payment_date    date        NOT NULL DEFAULT CURRENT_DATE,
  month_label     text        NOT NULL,                                    -- e.g. 'Nov 2026'
  status          text        NOT NULL DEFAULT 'paid' CHECK (status IN ('paid', 'partial', 'refunded')),
  notes           text,
  recorded_by     uuid        REFERENCES public.profiles(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.fee_payments IS 'Ledger of fee payments made by students';


-- ----- attendance ----------------------------------------------------

CREATE TABLE IF NOT EXISTS public.attendance (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  uuid        NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  batch_id    uuid        NOT NULL REFERENCES public.batches(id)  ON DELETE CASCADE,
  date        date        NOT NULL,
  status      text        NOT NULL CHECK (status IN ('present', 'absent', 'late')),
  marked_by   uuid        REFERENCES public.profiles(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, batch_id, date)
);

COMMENT ON TABLE public.attendance IS 'Daily attendance records per student per batch';


-- ----- announcements -------------------------------------------------

CREATE TABLE IF NOT EXISTS public.announcements (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id       uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title           text        NOT NULL,
  content         text        NOT NULL,
  target_audience text        NOT NULL CHECK (target_audience IN ('all', 'teachers', 'students')),
  target_batch_id uuid        REFERENCES public.batches(id) ON DELETE CASCADE,  -- nullable; for batch-specific announcements
  created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.announcements IS 'Institute-wide or batch-specific announcements';


-- =====================================================================
-- 3. HELPER FUNCTION: get_my_role()
-- =====================================================================
-- Returns the role of the currently authenticated user from the profiles
-- table. Declared as SECURITY DEFINER so it can read profiles even when
-- RLS policies are active, avoiding recursive policy evaluation.
-- Placed after profiles table is created so relation exists.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$;


-- =====================================================================
-- 4. TRIGGER: Auto-create profile on sign-up
-- =====================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, phone)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    NEW.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- =====================================================================
-- 5. TRIGGER: Automatically set updated_at on row modification
-- =====================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();


-- =====================================================================
-- 6. INDEXES
-- =====================================================================

-- profiles
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);

-- students
CREATE INDEX IF NOT EXISTS idx_students_profile_id ON public.students (profile_id);
CREATE INDEX IF NOT EXISTS idx_students_status     ON public.students (status);

-- teachers
CREATE INDEX IF NOT EXISTS idx_teachers_profile_id ON public.teachers (profile_id);

-- batches
CREATE INDEX IF NOT EXISTS idx_batches_teacher_id ON public.batches (teacher_id);
CREATE INDEX IF NOT EXISTS idx_batches_status     ON public.batches (status);

-- enrollments
CREATE INDEX IF NOT EXISTS idx_enrollments_student_id ON public.enrollments (student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_batch_id   ON public.enrollments (batch_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_status     ON public.enrollments (status);

-- fee_payments
CREATE INDEX IF NOT EXISTS idx_fee_payments_student_id   ON public.fee_payments (student_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_batch_id     ON public.fee_payments (batch_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_payment_date ON public.fee_payments (payment_date);

-- attendance
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON public.attendance (student_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_batch_date   ON public.attendance (batch_id, date);

-- announcements
CREATE INDEX IF NOT EXISTS idx_announcements_target_audience ON public.announcements (target_audience);
CREATE INDEX IF NOT EXISTS idx_announcements_target_batch_id ON public.announcements (target_batch_id);


-- =====================================================================
-- END OF SCHEMA
-- =====================================================================
