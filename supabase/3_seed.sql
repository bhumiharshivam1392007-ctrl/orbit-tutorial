-- ============================================================================
-- ORBIT - Coaching Institute Management System
-- Seed Data
-- ============================================================================
--
-- PREREQUISITE: Create auth users BEFORE running this script.
--
-- The application relies on Supabase Auth. When a user is created in Auth,
-- the handle_new_user() trigger automatically creates a row in `profiles`.
-- This seed script then looks up those profiles by email and inserts all
-- related sample data (teachers, students, batches, enrollments, fees, etc.).
--
-- ============================================================================
-- STEP 1: Create these users in Supabase Auth Dashboard
--         (Authentication > Users > Add User)
--
--   Email                        Password       user_metadata
--   ---------------------------  ------------   -------------------------------------------
--   admin@orbit.edu              password123    { "full_name": "Admin User",
--                                                 "role": "admin",
--                                                 "phone": "9000000001" }
--
--   rajesh.kumar@orbit.edu       password123    { "full_name": "Rajesh Kumar",
--                                                 "role": "teacher",
--                                                 "phone": "9000000002" }
--
--   priya.sharma@orbit.edu       password123    { "full_name": "Priya Sharma",
--                                                 "role": "teacher",
--                                                 "phone": "9000000003" }
--
--   amit.verma@orbit.edu         password123    { "full_name": "Amit Verma",
--                                                 "role": "student",
--                                                 "phone": "9876543210" }
--
--   sneha.patel@orbit.edu        password123    { "full_name": "Sneha Patel",
--                                                 "role": "student",
--                                                 "phone": "9876543211" }
--
--   rahul.singh@orbit.edu        password123    { "full_name": "Rahul Singh",
--                                                 "role": "student",
--                                                 "phone": "9876543212" }
--
-- STEP 2: After ALL six users are created (and the trigger has populated
--         the profiles table), run this script in the SQL Editor.
-- ============================================================================

DO $$
DECLARE
  -- Profile IDs (looked up from the profiles table)
  v_admin_id    uuid;
  v_teacher1_id uuid;
  v_teacher2_id uuid;
  v_student1_id uuid;
  v_student2_id uuid;
  v_student3_id uuid;

  -- Teacher record IDs (from the teachers table)
  v_teacher1_rec_id uuid;
  v_teacher2_rec_id uuid;

  -- Student record IDs (from the students table)
  v_student1_rec_id uuid;
  v_student2_rec_id uuid;
  v_student3_rec_id uuid;

  -- Batch IDs
  v_batch1_id uuid;  -- JEE Mathematics
  v_batch2_id uuid;  -- JEE Physics
  v_batch3_id uuid;  -- Foundation Math

  -- Tracking date for attendance
  v_att_date date;

BEGIN
  -- ==========================================================================
  -- Look up profile IDs by email
  -- ==========================================================================
  SELECT id INTO v_admin_id    FROM profiles WHERE email = 'admin@orbit.edu';
  SELECT id INTO v_teacher1_id FROM profiles WHERE email = 'rajesh.kumar@orbit.edu';
  SELECT id INTO v_teacher2_id FROM profiles WHERE email = 'priya.sharma@orbit.edu';
  SELECT id INTO v_student1_id FROM profiles WHERE email = 'amit.verma@orbit.edu';
  SELECT id INTO v_student2_id FROM profiles WHERE email = 'sneha.patel@orbit.edu';
  SELECT id INTO v_student3_id FROM profiles WHERE email = 'rahul.singh@orbit.edu';

  -- Validate that all profiles exist
  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Profile not found for admin@orbit.edu. Create the user in Supabase Auth first.';
  END IF;
  IF v_teacher1_id IS NULL THEN
    RAISE EXCEPTION 'Profile not found for rajesh.kumar@orbit.edu. Create the user in Supabase Auth first.';
  END IF;
  IF v_teacher2_id IS NULL THEN
    RAISE EXCEPTION 'Profile not found for priya.sharma@orbit.edu. Create the user in Supabase Auth first.';
  END IF;
  IF v_student1_id IS NULL THEN
    RAISE EXCEPTION 'Profile not found for amit.verma@orbit.edu. Create the user in Supabase Auth first.';
  END IF;
  IF v_student2_id IS NULL THEN
    RAISE EXCEPTION 'Profile not found for sneha.patel@orbit.edu. Create the user in Supabase Auth first.';
  END IF;
  IF v_student3_id IS NULL THEN
    RAISE EXCEPTION 'Profile not found for rahul.singh@orbit.edu. Create the user in Supabase Auth first.';
  END IF;

  RAISE NOTICE 'All profiles found. Proceeding with seed data...';

  -- ==========================================================================
  -- TEACHERS
  -- ==========================================================================

  INSERT INTO teachers (profile_id, subject, qualification, salary, status)
  VALUES (v_teacher1_id, 'Mathematics', 'M.Sc. Mathematics', 35000, 'active')
  RETURNING id INTO v_teacher1_rec_id;

  INSERT INTO teachers (profile_id, subject, qualification, salary, status)
  VALUES (v_teacher2_id, 'Physics', 'M.Sc. Physics', 32000, 'active')
  RETURNING id INTO v_teacher2_rec_id;

  RAISE NOTICE 'Teachers created: %, %', v_teacher1_rec_id, v_teacher2_rec_id;

  -- ==========================================================================
  -- STUDENTS
  -- ==========================================================================

  INSERT INTO students (profile_id, date_of_birth, gender, guardian_name, guardian_phone, address, status)
  VALUES (v_student1_id, '2008-05-15', 'male', 'Suresh Verma', '9876543210', '12, Lajpat Nagar, New Delhi', 'active')
  RETURNING id INTO v_student1_rec_id;

  INSERT INTO students (profile_id, date_of_birth, gender, guardian_name, guardian_phone, address, status)
  VALUES (v_student2_id, '2007-11-22', 'female', 'Ramesh Patel', '9876543211', '45, Satellite Road, Ahmedabad', 'active')
  RETURNING id INTO v_student2_rec_id;

  INSERT INTO students (profile_id, date_of_birth, gender, guardian_name, guardian_phone, address, status)
  VALUES (v_student3_id, '2008-03-08', 'male', 'Vikram Singh', '9876543212', '78, Civil Lines, Jaipur', 'active')
  RETURNING id INTO v_student3_rec_id;

  RAISE NOTICE 'Students created: %, %, %', v_student1_rec_id, v_student2_rec_id, v_student3_rec_id;

  -- ==========================================================================
  -- BATCHES
  -- ==========================================================================

  INSERT INTO batches (name, subject, timing, teacher_id, monthly_fee, status)
  VALUES ('JEE Mathematics', 'Mathematics', 'Mon-Fri 9:00-10:30', v_teacher1_rec_id, 2500, 'active')
  RETURNING id INTO v_batch1_id;

  INSERT INTO batches (name, subject, timing, teacher_id, monthly_fee, status)
  VALUES ('JEE Physics', 'Physics', 'Mon-Fri 10:30-12:00', v_teacher2_rec_id, 2500, 'active')
  RETURNING id INTO v_batch2_id;

  INSERT INTO batches (name, subject, timing, teacher_id, monthly_fee, status)
  VALUES ('Foundation Math', 'Mathematics', 'Mon-Wed-Fri 14:00-15:30', v_teacher1_rec_id, 1800, 'active')
  RETURNING id INTO v_batch3_id;

  RAISE NOTICE 'Batches created: %, %, %', v_batch1_id, v_batch2_id, v_batch3_id;

  -- ==========================================================================
  -- ENROLLMENTS
  -- ==========================================================================

  -- Amit → JEE Math + JEE Physics
  INSERT INTO enrollments (student_id, batch_id, enrolled_on, status) VALUES (v_student1_rec_id, v_batch1_id, CURRENT_DATE, 'active');
  INSERT INTO enrollments (student_id, batch_id, enrolled_on, status) VALUES (v_student1_rec_id, v_batch2_id, CURRENT_DATE, 'active');

  -- Sneha → JEE Physics + Foundation Math
  INSERT INTO enrollments (student_id, batch_id, enrolled_on, status) VALUES (v_student2_rec_id, v_batch2_id, CURRENT_DATE, 'active');
  INSERT INTO enrollments (student_id, batch_id, enrolled_on, status) VALUES (v_student2_rec_id, v_batch3_id, CURRENT_DATE, 'active');

  -- Rahul → JEE Math + Foundation Math
  INSERT INTO enrollments (student_id, batch_id, enrolled_on, status) VALUES (v_student3_rec_id, v_batch1_id, CURRENT_DATE, 'active');
  INSERT INTO enrollments (student_id, batch_id, enrolled_on, status) VALUES (v_student3_rec_id, v_batch3_id, CURRENT_DATE, 'active');

  RAISE NOTICE 'Enrollments created: 6 total';

  -- ==========================================================================
  -- FEE STRUCTURES
  -- ==========================================================================

  INSERT INTO fee_structures (batch_id, fee_type, amount, description)
  VALUES (v_batch1_id, 'monthly', 2500, 'Monthly tuition fee for JEE Mathematics batch');

  INSERT INTO fee_structures (batch_id, fee_type, amount, description)
  VALUES (v_batch2_id, 'monthly', 2500, 'Monthly tuition fee for JEE Physics batch');

  INSERT INTO fee_structures (batch_id, fee_type, amount, description)
  VALUES (v_batch3_id, 'monthly', 1800, 'Monthly tuition fee for Foundation Math batch');

  RAISE NOTICE 'Fee structures created: 3 total';

  -- ==========================================================================
  -- FEE PAYMENTS (sample payments across students and months)
  -- ==========================================================================

  -- Payment 1: Amit pays for JEE Mathematics – Oct 2026
  INSERT INTO fee_payments (student_id, batch_id, amount, payment_mode, transaction_ref, payment_date, month_label, status, notes, recorded_by)
  VALUES (v_student1_rec_id, v_batch1_id, 2500, 'upi', 'UPI-20261015-001', '2026-10-15', 'Oct 2026', 'paid', NULL, v_admin_id);

  -- Payment 2: Amit pays for JEE Physics – Oct 2026
  INSERT INTO fee_payments (student_id, batch_id, amount, payment_mode, transaction_ref, payment_date, month_label, status, notes, recorded_by)
  VALUES (v_student1_rec_id, v_batch2_id, 2500, 'upi', 'UPI-20261015-002', '2026-10-15', 'Oct 2026', 'paid', NULL, v_admin_id);

  -- Payment 3: Sneha pays for JEE Physics – Oct 2026
  INSERT INTO fee_payments (student_id, batch_id, amount, payment_mode, payment_date, month_label, status, notes, recorded_by)
  VALUES (v_student2_rec_id, v_batch2_id, 2500, 'cash', '2026-10-20', 'Oct 2026', 'paid', 'Paid in cash at office', v_admin_id);

  -- Payment 4: Rahul pays for Foundation Math – Oct 2026
  INSERT INTO fee_payments (student_id, batch_id, amount, payment_mode, transaction_ref, payment_date, month_label, status, notes, recorded_by)
  VALUES (v_student3_rec_id, v_batch3_id, 1800, 'bank_transfer', 'NEFT-20261018-001', '2026-10-18', 'Oct 2026', 'paid', NULL, v_admin_id);

  RAISE NOTICE 'Fee payments created: 4 total';

  -- ==========================================================================
  -- ATTENDANCE RECORDS
  -- One week of attendance for the JEE Mathematics batch
  -- Students in this batch: Amit Verma, Rahul Singh
  -- ==========================================================================

  v_att_date := date_trunc('week', CURRENT_DATE)::date;  -- Most recent Monday

  -- Monday
  INSERT INTO attendance (student_id, batch_id, date, status, marked_by)
  VALUES
    (v_student1_rec_id, v_batch1_id, v_att_date, 'present', v_teacher1_id),
    (v_student3_rec_id, v_batch1_id, v_att_date, 'present', v_teacher1_id);

  -- Tuesday
  v_att_date := v_att_date + 1;
  INSERT INTO attendance (student_id, batch_id, date, status, marked_by)
  VALUES
    (v_student1_rec_id, v_batch1_id, v_att_date, 'present', v_teacher1_id),
    (v_student3_rec_id, v_batch1_id, v_att_date, 'absent', v_teacher1_id);

  -- Wednesday
  v_att_date := v_att_date + 1;
  INSERT INTO attendance (student_id, batch_id, date, status, marked_by)
  VALUES
    (v_student1_rec_id, v_batch1_id, v_att_date, 'present', v_teacher1_id),
    (v_student3_rec_id, v_batch1_id, v_att_date, 'present', v_teacher1_id);

  -- Thursday
  v_att_date := v_att_date + 1;
  INSERT INTO attendance (student_id, batch_id, date, status, marked_by)
  VALUES
    (v_student1_rec_id, v_batch1_id, v_att_date, 'absent', v_teacher1_id),
    (v_student3_rec_id, v_batch1_id, v_att_date, 'present', v_teacher1_id);

  -- Friday
  v_att_date := v_att_date + 1;
  INSERT INTO attendance (student_id, batch_id, date, status, marked_by)
  VALUES
    (v_student1_rec_id, v_batch1_id, v_att_date, 'late', v_teacher1_id),
    (v_student3_rec_id, v_batch1_id, v_att_date, 'present', v_teacher1_id);

  RAISE NOTICE 'Attendance records created: 10 total (1 week × 2 students)';

  -- ==========================================================================
  -- ANNOUNCEMENTS
  -- ==========================================================================

  INSERT INTO announcements (author_id, title, content, target_audience, target_batch_id)
  VALUES (
    v_admin_id,
    'Welcome to ORBIT',
    'Welcome to the ORBIT Coaching Institute Management System! We are excited to have you on board. '
    || 'Please make sure to check your batch schedules and fee deadlines regularly. '
    || 'For any queries, contact the administration office.',
    'all',
    NULL
  );

  INSERT INTO announcements (author_id, title, content, target_audience, target_batch_id)
  VALUES (
    v_teacher1_id,
    'Math Test Next Monday',
    'Dear students, there will be a mathematics test next Monday covering chapters on Calculus and Trigonometry. '
    || 'Please revise all practice problems from the last two weeks. '
    || 'The test will be held during regular class hours (9:00 AM – 10:30 AM).',
    'students',
    v_batch1_id
  );

  RAISE NOTICE 'Announcements created: 2 total';

  -- ==========================================================================
  RAISE NOTICE '✅ Seed data populated successfully!';
  RAISE NOTICE '   - 1 Admin, 2 Teachers, 3 Students';
  RAISE NOTICE '   - 3 Batches, 6 Enrollments';
  RAISE NOTICE '   - 3 Fee Structures, 4 Fee Payments';
  RAISE NOTICE '   - 10 Attendance Records, 2 Announcements';

END $$;
