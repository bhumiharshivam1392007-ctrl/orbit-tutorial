import { useNavigate } from "react-router-dom"
import { Sun, Moon, LogOut, Menu, Shield, UserCheck, Download } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { usePwa } from "@/hooks/use-pwa"
import { useTheme } from "@/providers/theme-provider"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getInitials } from "@/lib/utils"

interface TopBarProps {
  onOpenMobileNav: () => void
}

export function TopBar({ onOpenMobileNav }: TopBarProps) {
  const navigate = useNavigate()
  const { profile, role, signOut } = useAuth()
  const { isInstalled, installApp } = usePwa()
  const { setTheme, isDark } = useTheme()

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark")
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border/60 bg-background/80 px-4 md:px-6 backdrop-blur-xl">
      {/* Left side: Mobile menu toggle + breadcrumbs */}
      <div className="flex items-center gap-2.5">
        <Button
          variant="ghost"
          size="icon"
          onClick={onOpenMobileNav}
          className="md:hidden h-9 w-9 text-muted-foreground hover:text-foreground shrink-0"
          aria-label="Open mobile navigation"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Mobile branding */}
        <div className="flex items-center gap-2 md:hidden">
          <span className="font-bold text-sm bg-gradient-to-r from-indigo-500 to-violet-600 bg-clip-text text-transparent">
            ORBIT
          </span>
          <Badge variant="outline" className="text-[10px] capitalize font-medium py-0 px-1.5 bg-muted/40">
            {role || "Portal"}
          </Badge>
        </div>

        {/* Desktop breadcrumb */}
        <div className="hidden sm:flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">ORBIT Portal</span>
          <span className="text-muted-foreground/60">•</span>
          <Badge variant="outline" className="text-xs capitalize font-medium py-0 px-2 bg-muted/40">
            {role || "Dashboard"}
          </Badge>
        </div>
      </div>

      {/* Right side: Install app + Theme toggle + User Profile dropdown */}
      <div className="flex items-center gap-2">
        {/* Install App Button (Hidden when running inside standalone PWA) */}
        {!isInstalled && (
          <Button
            variant="outline"
            size="sm"
            onClick={installApp}
            className="flex items-center gap-1.5 h-9 px-2.5 sm:px-3 rounded-xl border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20 hover:border-indigo-500/50 transition-all font-semibold text-xs shadow-sm"
            title="Install ORBIT as a standalone app"
          >
            <Download className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">Install App</span>
          </Button>
        )}

        {/* Dark/Light mode toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground transition-colors"
          title={`Switch to ${isDark ? "light" : "dark"} mode`}
        >
          {isDark ? (
            <Sun className="h-4 w-4 text-amber-400 transition-transform rotate-0 hover:rotate-90 duration-300" />
          ) : (
            <Moon className="h-4 w-4 text-indigo-600 transition-transform rotate-0 hover:-rotate-12 duration-300" />
          )}
          <span className="sr-only">Toggle theme</span>
        </Button>

        {/* User Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2.5 h-10 px-2 rounded-xl hover:bg-accent/80 transition-colors"
            >
              <Avatar className="h-8 w-8">
                {profile?.avatar_url && (
                  <AvatarImage src={profile.avatar_url} alt={profile?.full_name || "User"} />
                )}
                <AvatarFallback>
                  {profile?.full_name ? getInitials(profile.full_name) : "U"}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:flex flex-col items-start text-left">
                <span className="text-xs font-semibold leading-tight text-foreground">
                  {profile?.full_name || "User"}
                </span>
                <span className="text-[10px] leading-tight text-muted-foreground capitalize">
                  {role || "member"}
                </span>
              </div>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            <div className="flex flex-col space-y-1 p-2">
              <p className="text-xs font-semibold leading-none text-foreground">
                {profile?.full_name || "User"}
              </p>
              <p className="text-[11px] leading-none text-muted-foreground truncate">
                {profile?.email || ""}
              </p>
              <div className="pt-1.5">
                <Badge variant="default" className="text-[10px] font-medium capitalize">
                  <Shield className="h-2.5 w-2.5 mr-1" />
                  {role}
                </Badge>
              </div>
            </div>

            {role === "teacher" && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/teacher/profile")} className="cursor-pointer">
                  <UserCheck className="mr-2 h-4 w-4 text-indigo-500" />
                  <span>Faculty Profile</span>
                </DropdownMenuItem>
              </>
            )}

            {!isInstalled && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={installApp} className="cursor-pointer text-indigo-600 dark:text-indigo-400">
                  <Download className="mr-2 h-4 w-4" />
                  <span>Install App</span>
                </DropdownMenuItem>
              </>
            )}

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
