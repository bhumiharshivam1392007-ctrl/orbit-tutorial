export const ROLES = {
  ADMIN: 'admin',
  TEACHER: 'teacher',
  STUDENT: 'student',
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

export const ROLE_ROUTES: Record<Role, string> = {
  admin: '/admin',
  teacher: '/teacher',
  student: '/student',
}

export const PAYMENT_MODES = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
] as const

export const ATTENDANCE_STATUS = [
  { value: 'present', label: 'Present', color: 'text-green-600' },
  { value: 'absent', label: 'Absent', color: 'text-red-600' },
  { value: 'late', label: 'Late', color: 'text-yellow-600' },
] as const

export const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
] as const

export const FEE_TYPES = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'one-time', label: 'One-time' },
] as const

export const TARGET_AUDIENCE = [
  { value: 'all', label: 'Everyone' },
  { value: 'teachers', label: 'Teachers Only' },
  { value: 'students', label: 'Students Only' },
] as const

