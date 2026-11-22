import { NavLink } from "react-router-dom"
import { X, LogOut } from "lucide-react"
import {
  LayoutDashboard,
  GraduationCap,
  Users2,
  Layers,
  Receipt,
  Bell,
  CheckCircle2,
  CreditCard,
  BookOpen,
  Calendar,
  UserCheck,
} from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { cn, getInitials } from "@/lib/utils"
import type { UserRole } from "@/types/database"

interface MobileNavProps {
  open: boolean
  onClose: () => void
}

const roleNavItems: Record<UserRole, Array<{ label: string; href: string; icon: any }>> = {
  admin: [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "Students", href: "/admin/students", icon: GraduationCap },
    { label: "Teachers", href: "/admin/teachers", icon: Users2 },
    { label: "Batches", href: "/admin/batches", icon: Layers },
    { label: "Fee Management", href: "/admin/fees", icon: Receipt },
    { label: "Announcements", href: "/admin/announcements", icon: Bell },
  ],
  teacher: [
    { label: "Dashboard", href: "/teacher", icon: LayoutDashboard },
    { label: "My Batches", href: "/teacher/batches", icon: Layers },
    { label: "My Students", href: "/teacher/students", icon: Users2 },
    { label: "Timetable", href: "/teacher/schedule", icon: Calendar },
    { label: "Attendance", href: "/teacher/attendance", icon: CheckCircle2 },
    { label: "Announcements", href: "/teacher/announcements", icon: Bell },
    { label: "My Profile", href: "/teacher/profile", icon: UserCheck },
  ],
  student: [
    { label: "Dashboard", href: "/student", icon: LayoutDashboard },
    { label: "My Batches", href: "/student/batch", icon: BookOpen },
    { label: "Fee Status", href: "/student/fees", icon: CreditCard },
    { label: "Attendance", href: "/student/attendance", icon: CheckCircle2 },
    { label: "Announcements", href: "/student/announcements", icon: Bell },
  ],
}

export function MobileNav({ open, onClose }: MobileNavProps) {
  const { profile, role, signOut } = useAuth()
  const items = role ? roleNavItems[role] || [] : []

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 left-0 w-3/4 max-w-xs bg-card shadow-2xl flex flex-col z-50 border-r border-border/60 animate-in slide-in-from-left duration-300">
        <div className="flex h-16 items-center justify-between px-4 border-b border-border/40">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-bold">
              O
            </div>
            <div>
              <span className="font-bold text-base bg-gradient-to-r from-indigo-500 to-violet-600 bg-clip-text text-transparent">
                ORBIT
              </span>
              <p className="text-[10px] text-muted-foreground uppercase font-semibold">
                {role || "Coaching"}
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Links */}
        <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
          {items.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.href}
                to={item.href}
                end={item.href === "/admin" || item.href === "/teacher" || item.href === "/student"}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                    isActive
                      ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md font-semibold"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )
                }
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-border/40 space-y-2">
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-muted/40">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-bold text-white">
              {profile?.full_name ? getInitials(profile.full_name) : "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate text-foreground">
                {profile?.full_name || "User"}
              </p>
              <p className="text-[11px] truncate text-muted-foreground capitalize">
                {role}
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full justify-center text-xs h-9 text-destructive hover:text-destructive"
            onClick={() => {
              onClose()
              signOut()
            }}
          >
            <LogOut className="mr-2 h-3.5 w-3.5" />
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  )
}
