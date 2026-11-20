import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "@/hooks/use-auth"
import { ROLE_ROUTES, type Role } from "@/lib/constants"
import { Button } from "@/components/ui/button"
import { RotateCw, LogOut } from "lucide-react"
import type { UserRole } from "@/types/database"

interface ProtectedRouteProps {
  children?: React.ReactNode
  allowedRoles?: UserRole[]
}

export function ProtectedRoute({
  children,
  allowedRoles,
}: ProtectedRouteProps) {
  const { user, role, isLoading, refreshProfile, signOut } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent shadow-md" />
          <p className="text-sm font-medium text-muted-foreground animate-pulse">
            Loading ORBIT workspace...
          </p>
        </div>
      </div>
    )
  }

  // Not logged in -> go to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Profile or role still loading or missing
  if (!role) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background p-4">
        <div className="max-w-md text-center space-y-4">
          <h2 className="text-xl font-bold text-foreground">Setting Up Your Profile</h2>
          <p className="text-sm text-muted-foreground">
            Signed in as <strong>{user.email}</strong>, but no role profile could be fetched from Supabase.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refreshProfile()}
              className="gap-2 text-xs"
            >
              <RotateCw className="h-3.5 w-3.5" />
              <span>Retry</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut()}
              className="gap-2 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign out</span>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Role check: If this route is restricted to specific roles and current role is not allowed
  if (allowedRoles && !allowedRoles.includes(role)) {
    // Redirect to their own dashboard
    const destination = ROLE_ROUTES[role as Role] || "/login"
    return <Navigate to={destination} replace />
  }

  return <>{children}</>
}
