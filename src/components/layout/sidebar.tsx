import React from "react"
import { NavLink } from "react-router-dom"
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
  ChevronLeft,
  ChevronRight,
  LogOut,
  Sparkles,
  Calendar,
  UserCheck,
  Download,
} from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { usePwa } from "@/hooks/use-pwa"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn, getInitials } from "@/lib/utils"
import type { UserRole } from "@/types/database"

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

const roleNavItems: Record<UserRole, NavItem[]> = {
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

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { profile, role, signOut } = useAuth()
  const { isInstalled, installApp } = usePwa()
  const items = role ? roleNavItems[role] || [] : []

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col border-r border-border/60 bg-card/60 backdrop-blur-xl transition-all duration-300 ease-in-out select-none",
        collapsed ? "w-[76px]" : "w-64"
      )}
    >
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-border/40">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-600 shadow-md shadow-indigo-500/20 text-white font-bold tracking-wider">
            O
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-bold text-base tracking-tight bg-gradient-to-r from-indigo-500 via-purple-500 to-violet-600 bg-clip-text text-transparent">
                ORBIT
              </span>
              <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">
                Coaching Portal
              </span>
            </div>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Role Pill Banner */}
      {!collapsed && role && (
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center justify-between rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 px-3 py-1.5 border border-indigo-500/20">
            <span className="text-xs font-semibold capitalize text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" />
              {role} Space
            </span>
            <Badge variant="outline" className="text-[10px] py-0 border-indigo-300">
              Active
            </Badge>
          </div>
        </div>
      )}

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1 px-3 py-3 overflow-y-auto">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.href}
              to={item.href}
              end={item.href === "/admin" || item.href === "/teacher" || item.href === "/student"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all group",
                  isActive
                    ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/20 font-semibold"
                    : "text-muted-foreground hover:bg-accent/80 hover:text-foreground"
                )
              }
              title={collapsed ? item.label : undefined}
            >
              <Icon className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110" />
              {!collapsed && (
                <span className="truncate">{item.label}</span>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Install App Link (If not already installed) */}
      {!isInstalled && (
        <div className="px-3 pb-2">
          <button
            onClick={installApp}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all border border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20 hover:border-indigo-500/50 shadow-sm",
              collapsed && "justify-center px-1"
            )}
            title="Install ORBIT App"
          >
            <Download className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="truncate">Install App</span>}
          </button>
        </div>
      )}

      {/* User Info / Logout Footer */}
      <div className="p-3 border-t border-border/40">
        <div
          className={cn(
            "flex items-center gap-3 rounded-xl p-2 bg-muted/40",
            collapsed && "justify-center p-1"
          )}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-bold text-white shadow-sm">
            {profile?.full_name ? getInitials(profile.full_name) : "U"}
          </div>

          {!collapsed && (
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-semibold truncate text-foreground">
                {profile?.full_name || "User"}
              </p>
              <p className="text-[11px] truncate text-muted-foreground capitalize">
                {role || "Guest"}
              </p>
            </div>
          )}

          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={signOut}
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </aside>
  )
}

