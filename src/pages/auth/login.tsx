import React, { useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { motion } from "framer-motion"
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Download,
} from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { usePwa } from "@/hooks/use-pwa"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ROLE_ROUTES, type Role } from "@/lib/constants"
import { toast } from "sonner"

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { signIn, user, role } = useAuth()
  const { isInstalled, installApp } = usePwa()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Redirect if already logged in
  React.useEffect(() => {
    if (user && role) {
      const dest = ROLE_ROUTES[role as Role] || "/login"
      navigate(dest, { replace: true })
    }
  }, [user, role, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setErrorMsg("Please enter both email and password")
      return
    }

    setLoading(true)
    setErrorMsg(null)

    try {
      const { error, role: userRole } = await signIn(email.trim(), password)

      if (error) {
        setErrorMsg(error.message || "Invalid credentials. Please try again.")
        toast.error("Authentication failed: " + (error.message || "Invalid credentials"))
        return
      }

      toast.success("Welcome back! Signed in successfully.")

      // Determine proper role-based destination
      const from = (location.state as any)?.from?.pathname
      const targetRole = userRole || "student"
      const defaultDest = ROLE_ROUTES[targetRole as Role] || "/student"

      // Only honour 'from' if it belongs to this user's role namespace
      const isAllowedFrom =
        from &&
        from !== "/login" &&
        ((targetRole === "admin" && from.startsWith("/admin")) ||
          (targetRole === "teacher" && from.startsWith("/teacher")) ||
          (targetRole === "student" && from.startsWith("/student")))

      navigate(isAllowedFrom ? from : defaultDest, { replace: true })
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.")
    } finally {
      setLoading(false)
    }
  }

  const fillCredentials = (roleType: "admin" | "teacher" | "student") => {
    if (roleType === "admin") {
      setEmail("admin@orbit.edu")
      setPassword("password123")
    } else if (roleType === "teacher") {
      setEmail("rajesh.kumar@orbit.edu")
      setPassword("password123")
    } else {
      setEmail("amit.verma@orbit.edu")
      setPassword("password123")
    }
    setErrorMsg(null)
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* LEFT COLUMN: Premium Branded Hero (Hidden on Mobile) */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 p-12 text-white lg:flex">
        {/* Glow Effects */}
        <div className="absolute -left-20 -top-20 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-violet-500/20 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/3 h-72 w-72 rounded-full bg-pink-500/10 blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-500 font-bold text-lg shadow-lg shadow-indigo-500/30 text-white">
            O
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight">ORBIT</span>
            <span className="block text-[11px] font-medium tracking-widest text-indigo-300 uppercase">
              Coaching Institute Management
            </span>
          </div>
        </div>

        {/* Center Hero Content */}
        <div className="relative z-10 my-auto max-w-lg space-y-6">
          <Badge className="bg-indigo-500/20 border-indigo-400/30 text-indigo-200 text-xs py-1 px-3">
            <Sparkles className="mr-1.5 h-3.5 w-3.5 text-indigo-300" />
            Empowering Modern Coaching Academies
          </Badge>

          <h2 className="text-4xl font-extrabold tracking-tight leading-tight text-white">
            Streamline your coaching operations in one cohesive workspace.
          </h2>

          <p className="text-base text-indigo-200/80 leading-relaxed">
            Manage batches, track fee dues, record daily attendance, and broadcast notices
            with real-time role-based access for admins, teachers, and students.
          </p>

          {/* Value Props */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            {[
              { title: "Fee Dues & Receipts", desc: "Automated tracking & print slips" },
              { title: "Attendance Tracking", desc: "Daily mark & percentage logs" },
              { title: "Role-Based Access", desc: "Admin, Teacher, and Student views" },
              { title: "Instant Notices", desc: "Institute-wide or batch broadcast" },
            ].map((feature, i) => (
              <div
                key={i}
                className="rounded-xl border border-white/10 bg-white/5 p-3.5 backdrop-blur-sm"
              >
                <div className="flex items-center gap-2 text-indigo-300 text-xs font-semibold">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  {feature.title}
                </div>
                <p className="mt-1 text-[11px] text-white/60">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Quote */}
        <div className="relative z-10 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
          <p className="text-xs italic text-indigo-100">
            "ORBIT simplified our fee recovery and daily batch scheduling by 10x. Our teachers love the daily attendance tracker."
          </p>
          <div className="mt-2 flex items-center justify-between text-[11px] text-indigo-300">
            <span>— Director, Pioneer Academy</span>
            <span className="flex items-center gap-1 font-medium text-emerald-400">
              <ShieldCheck className="h-3.5 w-3.5" /> High Security RLS
            </span>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Polished Login Card */}
      <div className="flex flex-1 flex-col items-center justify-center p-4 sm:p-6 md:p-12 w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md space-y-6"
        >
          {/* Mobile Brand Header */}
          <div className="flex flex-col items-center text-center lg:hidden">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-bold text-xl shadow-lg shadow-indigo-500/25">
              O
            </div>
            <h1 className="mt-3 text-2xl font-bold bg-gradient-to-r from-indigo-500 to-violet-600 bg-clip-text text-transparent">
              ORBIT
            </h1>
            <p className="text-xs text-muted-foreground">Coaching Institute Management</p>
          </div>

          {/* Form Header */}
          <div className="space-y-1.5 text-center lg:text-left">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Sign In to Your Account
            </h2>
            <p className="text-sm text-muted-foreground">
              Enter your credentials to access your portal
            </p>
          </div>

          {/* Demo Credentials Quick-Select Pill */}
          <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-indigo-600 dark:text-indigo-400">
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" /> Quick Fill Demo Accounts
              </span>
              <span className="text-[10px] text-muted-foreground font-normal">
                Click to fill
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fillCredentials("admin")}
                className="h-8 text-xs rounded-lg hover:border-indigo-400 hover:bg-indigo-500/10"
              >
                Admin
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fillCredentials("teacher")}
                className="h-8 text-xs rounded-lg hover:border-indigo-400 hover:bg-indigo-500/10"
              >
                Teacher
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fillCredentials("student")}
                className="h-8 text-xs rounded-lg hover:border-indigo-400 hover:bg-indigo-500/10"
              >
                Student
              </Button>
            </div>
          </div>

          {/* Error Alert Box */}
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive"
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@orbit.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                  <span className="sr-only">Toggle password visibility</span>
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-base font-semibold shadow-md"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Signing In...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span>Sign In to Dashboard</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              )}
            </Button>
          </form>

          {/* Footer note */}
          <p className="text-center text-xs text-muted-foreground">
            Role-protected access. Protected by Row Level Security (RLS).
          </p>

          {!isInstalled && (
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={installApp}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-indigo-500 hover:text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 transition-all border border-indigo-500/20"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Install ORBIT App on this device</span>
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
