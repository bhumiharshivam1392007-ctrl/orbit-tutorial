import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  UserCheck,
  Mail,
  Phone,
  BookOpen,
  GraduationCap,
  IndianRupee,
  Layers,
  Save,
  Shield,
} from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useAuth } from "@/hooks/use-auth"
import { fetchTeacherProfile, updateTeacherProfile } from "@/services/teacher-module"
import { getInitials, formatCurrency } from "@/lib/utils"
import { toast } from "sonner"

export function TeacherProfilePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { profile } = useAuth()

  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")

  const { data: teacherProfile, isLoading } = useQuery({
    queryKey: ["teacher-profile", profile?.id],
    queryFn: () => fetchTeacherProfile(profile?.id || ""),
    enabled: !!profile?.id,
  })

  // Sync state when data is loaded
  useEffect(() => {
    if (teacherProfile) {
      setFullName(teacherProfile.full_name || "")
      setPhone(teacherProfile.phone || "")
    }
  }, [teacherProfile])

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.id) throw new Error("User session expired")
      if (!fullName.trim()) throw new Error("Full name cannot be blank")
      return updateTeacherProfile(profile.id, {
        full_name: fullName,
        phone: phone,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-profile", profile?.id] })
      queryClient.invalidateQueries({ queryKey: ["teacher-dashboard", profile?.id] })
      toast.success("Profile details updated successfully!")
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update profile")
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateMutation.mutate()
  }

  return (
    <div className="space-y-6 w-full max-w-full min-w-0">
      <PageHeader
        title="Faculty Profile & Preferences"
        description="View your institutional appointment details, academic specialization, and manage your personal contact info."
        badge={
          <Badge variant="outline" className="border-indigo-400/50 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/50">
            Faculty Space
          </Badge>
        }
      />

      {isLoading ? (
        <div className="space-y-4 w-full max-w-full min-w-0 animate-pulse">
          <div className="h-44 bg-card rounded-2xl border" />
          <div className="h-64 bg-card rounded-2xl border" />
        </div>
      ) : teacherProfile ? (
        <div className="grid gap-6 md:grid-cols-12 w-full max-w-full min-w-0">
          {/* Left Column: Academic Credentials & Institute Stats (5 cols) */}
          <div className="md:col-span-5 space-y-4 w-full max-w-full min-w-0">
            <Card className="p-6 text-center space-y-4 w-full max-w-full min-w-0 overflow-hidden">
              <Avatar className="h-20 w-20 mx-auto ring-4 ring-indigo-500/20">
                <AvatarFallback className="text-xl font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  {getInitials(teacherProfile.full_name)}
                </AvatarFallback>
              </Avatar>

              <div className="space-y-1">
                <h3 className="font-bold text-lg text-foreground truncate">
                  {teacherProfile.full_name}
                </h3>
                <p className="text-xs text-muted-foreground break-all">{teacherProfile.email}</p>
                <div className="pt-1 flex items-center justify-center gap-1.5">
                  <Badge variant="default" className="text-[11px] capitalize">
                    <Shield className="h-3 w-3 mr-1" /> Faculty Member
                  </Badge>
                  {teacherProfile.subject && (
                    <Badge variant="secondary" className="text-[11px] text-indigo-600 dark:text-indigo-400">
                      {teacherProfile.subject}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-border/40 space-y-3 text-left">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                    Specialization
                  </span>
                  <span className="font-semibold text-foreground">
                    {teacherProfile.subject || "General Faculty"}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <GraduationCap className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                    Qualification
                  </span>
                  <span className="font-semibold text-foreground">
                    {teacherProfile.qualification || "—"}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <IndianRupee className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                    Compensation
                  </span>
                  <span className="font-semibold text-foreground">
                    {teacherProfile.salary ? `${formatCurrency(teacherProfile.salary)} / mo` : "—"}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                    Assigned Classes
                  </span>
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                    {teacherProfile.assigned_batch_count} Batches
                  </span>
                </div>
              </div>

              <Button
                variant="outline"
                onClick={() => navigate("/teacher/batches")}
                className="w-full text-xs h-9 gap-1.5 mt-2"
              >
                <Layers className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                <span>View Assigned Batches</span>
              </Button>
            </Card>
          </div>

          {/* Right Column: Edit Profile Form (7 cols) */}
          <div className="md:col-span-7 w-full max-w-full min-w-0">
            <Card className="w-full max-w-full min-w-0 overflow-hidden">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-indigo-500 shrink-0" />
                  Personal Information
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Update your contact phone number and display name.
                </p>
              </CardHeader>

              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="prof-name">Full Name *</Label>
                    <Input
                      id="prof-name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Prof. Shivam Singh"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="prof-email">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="prof-email"
                        value={teacherProfile.email}
                        disabled
                        className="pl-10 bg-muted/30 cursor-not-allowed opacity-80"
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Email address is managed by your institute administrator.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="prof-phone">Mobile / WhatsApp Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="prof-phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="e.g. +91 98765 43210"
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button
                      type="submit"
                      disabled={updateMutation.isPending}
                      className="gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 w-full sm:w-auto"
                    >
                      <Save className="h-4 w-4" />
                      <span>{updateMutation.isPending ? "Saving..." : "Save Changes"}</span>
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <Card className="p-8 text-center text-muted-foreground">
          <p>Could not load faculty profile information.</p>
        </Card>
      )}
    </div>
  )
}
