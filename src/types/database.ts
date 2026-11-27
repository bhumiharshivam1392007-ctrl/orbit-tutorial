// ============================================================
// Database Types — matches Supabase schema from 1_schema.sql
// ============================================================

export type UserRole = 'admin' | 'teacher' | 'student'
export type StudentStatus = 'active' | 'inactive'
export type TeacherStatus = 'active' | 'inactive'
export type BatchStatus = 'active' | 'inactive'
export type EnrollmentStatus = 'active' | 'left'
export type FeeType = 'monthly' | 'quarterly' | 'yearly' | 'one-time'
export type PaymentMode = 'cash' | 'upi' | 'bank_transfer'
export type PaymentStatus = 'paid' | 'partial' | 'refunded'
export type AttendanceStatus = 'present' | 'absent' | 'late'
export type TargetAudience = 'all' | 'teachers' | 'students'
export type Gender = 'male' | 'female' | 'other'

// ---- Row types ----

export interface Profile {
  id: string
  role: UserRole
  full_name: string
  email: string
  phone: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Student {
  id: string
  profile_id: string
  date_of_birth: string | null
  gender: Gender | null
  guardian_name: string | null
  guardian_phone: string | null
  address: string | null
  status: StudentStatus
  fee_start_month?: string | null
  created_at: string
}

export interface Teacher {
  id: string
  profile_id: string
  subject: string | null
  qualification: string | null
  salary: number | null
  status: TeacherStatus
  created_at: string
}

export interface Batch {
  id: string
  name: string
  subject?: string | null
  timing?: string | null
  teacher_id?: string | null
  monthly_fee: number
  status: BatchStatus
  created_at: string
}

export interface BatchSubject {
  id: string
  batch_id: string
  subject: string
  teacher_id: string | null
  days?: string | null
  start_time?: string | null
  end_time?: string | null
  created_at?: string
  teachers?: TeacherWithProfile | null
}

export interface Enrollment {
  id: string
  student_id: string
  batch_id: string
  enrolled_on: string
  left_on: string | null
  status: EnrollmentStatus
}

export interface FeeStructure {
  id: string
  batch_id: string
  fee_type: FeeType
  amount: number
  description: string | null
}

export interface FeePayment {
  id: string
  student_id: string
  batch_id: string
  amount: number
  payment_mode: PaymentMode
  transaction_ref: string | null
  payment_date: string
  month_label: string
  status: PaymentStatus
  notes: string | null
  recorded_by: string | null
  created_at: string
}

export interface FeeWaiver {
  id: string
  student_id: string | null
  batch_id: string | null
  month: string // "YYYY-MM-01"
  reason: string | null
  created_by: string | null
  created_at: string
}

export interface FeeWaiverWithDetails extends FeeWaiver {
  students?: (Student & { profiles: Profile }) | null
  batches?: Batch | null
  created_by_profile?: Profile | null
}

export interface Attendance {
  id: string
  student_id: string
  batch_id: string
  date: string
  status: AttendanceStatus
  marked_by: string | null
  created_at: string
}

export interface Announcement {
  id: string
  author_id: string
  title: string
  content: string
  target_audience: TargetAudience
  target_batch_id: string | null
  created_at: string
}

// ---- Joined / enriched types (for queries with joins) ----

export interface StudentWithProfile extends Student {
  profiles: Profile
}

export interface TeacherWithProfile extends Teacher {
  profiles: Profile
}

export interface BatchWithSubjects extends Batch {
  batch_subjects?: BatchSubject[]
  teachers?: (Teacher & { profiles: Profile }) | null
  enrollments?: Array<{ id: string; status: EnrollmentStatus }>
  student_count?: number
}

export interface BatchWithTeacher extends BatchWithSubjects {
  teachers: (Teacher & { profiles: Profile }) | null
}

export interface EnrollmentWithDetails extends Enrollment {
  students: StudentWithProfile
  batches: Batch
}

export interface FeePaymentWithDetails extends FeePayment {
  students: StudentWithProfile
  batches: Batch
}

export interface AttendanceWithStudent extends Attendance {
  students: StudentWithProfile
}

export interface AnnouncementWithAuthor extends Announcement {
  profiles: Profile
}

// ---- Insert types ----

export type ProfileInsert = Omit<Profile, 'created_at' | 'updated_at'>
export type StudentInsert = Omit<Student, 'id' | 'created_at'>
export type TeacherInsert = Omit<Teacher, 'id' | 'created_at'>
export type BatchInsert = Omit<Batch, 'id' | 'created_at'>
export type EnrollmentInsert = Omit<Enrollment, 'id'>
export type FeeStructureInsert = Omit<FeeStructure, 'id'>
export type FeePaymentInsert = Omit<FeePayment, 'id' | 'created_at'>
export type AttendanceInsert = Omit<Attendance, 'id' | 'created_at'>
export type AnnouncementInsert = Omit<Announcement, 'id' | 'created_at'>

// ---- Update types ----

export type ProfileUpdate = Partial<Omit<Profile, 'id' | 'created_at'>>
export type StudentUpdate = Partial<Omit<Student, 'id' | 'created_at' | 'profile_id'>>
export type TeacherUpdate = Partial<Omit<Teacher, 'id' | 'created_at' | 'profile_id'>>
export type BatchUpdate = Partial<Omit<Batch, 'id' | 'created_at'>>

// ---- Supabase Generated Database Type ----

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: ProfileInsert
        Update: ProfileUpdate
      }
      students: {
        Row: Student
        Insert: StudentInsert
        Update: StudentUpdate
      }
      teachers: {
        Row: Teacher
        Insert: TeacherInsert
        Update: TeacherUpdate
      }
      batches: {
        Row: Batch
        Insert: BatchInsert
        Update: BatchUpdate
      }
      enrollments: {
        Row: Enrollment
        Insert: EnrollmentInsert
        Update: Partial<EnrollmentInsert>
      }
      fee_structures: {
        Row: FeeStructure
        Insert: FeeStructureInsert
        Update: Partial<FeeStructureInsert>
      }
      fee_payments: {
        Row: FeePayment
        Insert: FeePaymentInsert
        Update: Partial<FeePaymentInsert>
      }
      attendance: {
        Row: Attendance
        Insert: AttendanceInsert
        Update: Partial<AttendanceInsert>
      }
      announcements: {
        Row: Announcement
        Insert: AnnouncementInsert
        Update: Partial<AnnouncementInsert>
      }
    }
    Functions: {
      get_my_role: {
        Args: Record<string, never>
        Returns: string
      }
    }
  }
}

