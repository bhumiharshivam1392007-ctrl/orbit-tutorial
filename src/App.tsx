import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { Toaster } from "sonner"
import { QueryProvider } from "@/providers/query-provider"
import { ThemeProvider } from "@/providers/theme-provider"
import { AuthProvider, useAuth } from "@/providers/auth-provider"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { AppShell } from "@/components/layout/app-shell"
import { LoginPage } from "@/pages/auth/login"

// Admin pages
import { AdminDashboardPage } from "@/pages/admin/dashboard"
import { StudentsListPage } from "@/pages/admin/students/index"
import { StudentProfilePage } from "@/pages/admin/students/[id]"
import { TeachersListPage } from "@/pages/admin/teachers/index"
import { BatchesListPage } from "@/pages/admin/batches/index"
import { FeesManagementPage } from "@/pages/admin/fees/index"
import { AnnouncementsPage } from "@/pages/admin/announcements/index"

// Teacher pages
import { TeacherDashboardPage } from "@/pages/teacher/dashboard"
import { TeacherBatchesPage } from "@/pages/teacher/batches"
import { TeacherAttendancePage } from "@/pages/teacher/attendance"
import { TeacherAnnouncementsPage } from "@/pages/teacher/announcements"

// Student pages
import { StudentDashboardPage } from "@/pages/student/dashboard"
import { StudentBatchesPage } from "@/pages/student/batches"
import { StudentFeesPage } from "@/pages/student/fees"
import { StudentAttendancePage } from "@/pages/student/attendance"
import { StudentAnnouncementsPage } from "@/pages/student/announcements"
import { NotFoundPage } from "@/pages/not-found"
import { ROLE_ROUTES, type Role } from "@/lib/constants"

function RootRedirect() {
  const { user, role, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent shadow-md" />
          <p className="text-sm font-medium text-muted-foreground animate-pulse">
            Connecting to ORBIT...
          </p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (role && ROLE_ROUTES[role as Role]) {
    return <Navigate to={ROLE_ROUTES[role as Role]} replace />
  }

  return <Navigate to="/admin" replace />
}

export default function App() {
  return (
    <QueryProvider>
      <ThemeProvider defaultTheme="system" storageKey="orbit-theme">
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public route */}
              <Route path="/login" element={<LoginPage />} />

              {/* Root redirect */}
              <Route path="/" element={<RootRedirect />} />

              {/* Admin Module Routes */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AppShell />
                  </ProtectedRoute>
                }
              >
                <Route index element={<AdminDashboardPage />} />
                <Route path="students" element={<StudentsListPage />} />
                <Route path="students/:id" element={<StudentProfilePage />} />
                <Route path="teachers" element={<TeachersListPage />} />
                <Route path="batches" element={<BatchesListPage />} />
                <Route path="fees" element={<FeesManagementPage />} />
                <Route path="announcements" element={<AnnouncementsPage />} />
              </Route>

              {/* Teacher Module Routes */}
              <Route
                path="/teacher"
                element={
                  <ProtectedRoute allowedRoles={["teacher"]}>
                    <AppShell />
                  </ProtectedRoute>
                }
              >
                <Route index element={<TeacherDashboardPage />} />
                <Route path="batches" element={<TeacherBatchesPage />} />
                <Route path="attendance" element={<TeacherAttendancePage />} />
                <Route path="announcements" element={<TeacherAnnouncementsPage />} />
              </Route>

              {/* Student Routes */}
              <Route
                path="/student"
                element={
                  <ProtectedRoute allowedRoles={["student"]}>
                    <AppShell />
                  </ProtectedRoute>
                }
              >
                <Route index element={<StudentDashboardPage />} />
                <Route path="batch" element={<StudentBatchesPage />} />
                <Route path="batches" element={<StudentBatchesPage />} />
                <Route path="fees" element={<StudentFeesPage />} />
                <Route path="attendance" element={<StudentAttendancePage />} />
                <Route path="announcements" element={<StudentAnnouncementsPage />} />
              </Route>

              {/* 404 Catch-All */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </BrowserRouter>
          <Toaster richColors position="top-right" closeButton />
        </AuthProvider>
      </ThemeProvider>
    </QueryProvider>
  )
}
