import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Users2,
  Plus,
  Search,
  Mail,
  Phone,
  Layers,
  IndianRupee,
  MoreVertical,
  Edit2,
  Trash2,
  Key,
} from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { ResetPasswordDialog, type ResetPasswordTarget } from "@/components/shared/reset-password-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { fetchTeachers, deleteTeacher, type TeacherListItem } from "@/services/teachers"
import { TeacherModal } from "@/pages/admin/teachers/teacher-modal"
import { formatCurrency, getInitials } from "@/lib/utils"
import { toast } from "sonner"

export function TeachersListPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTeacher, setEditingTeacher] = useState<TeacherListItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TeacherListItem | null>(null)
  const [resetTarget, setResetTarget] = useState<ResetPasswordTarget | null>(null)

  const { data: teachers, isLoading } = useQuery({
    queryKey: ["teachers"],
    queryFn: fetchTeachers,
  })

  const deleteMutation = useMutation({
    mutationFn: (teacher: TeacherListItem) => deleteTeacher(teacher.id, teacher.profile_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] })
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] })
      toast.success("Faculty member deleted successfully")
      setDeleteTarget(null)
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete teacher")
    },
  })

  const filteredTeachers = (teachers || []).filter((t) => {
    const q = search.toLowerCase()
    return (
      (t.profiles?.full_name || "").toLowerCase().includes(q) ||
      (t.subject || "").toLowerCase().includes(q) ||
      (t.profiles?.email || "").toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Faculty & Teachers"
        description="Manage teaching staff, subject specializations, batch allocations, and compensation."
        badge={
          <Badge variant="outline" className="border-indigo-400/40 text-indigo-600 dark:text-indigo-400">
            {teachers?.length || 0} Faculty
          </Badge>
        }
      >
        <Button
          onClick={() => {
            setEditingTeacher(null)
            setModalOpen(true)
          }}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          <span>Add Teacher</span>
        </Button>
      </PageHeader>

      {/* Search Input */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, subject, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Teachers Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-44 rounded-2xl border border-border/50 bg-card p-6 animate-pulse"
            />
          ))}
        </div>
      ) : filteredTeachers.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTeachers.map((teacher) => (
            <Card
              key={teacher.id}
              className="group relative overflow-hidden transition-all hover:shadow-md hover:border-indigo-500/30"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Avatar className="h-11 w-11 ring-2 ring-indigo-500/20 shrink-0">
                      <AvatarFallback>
                        {getInitials(teacher.profiles?.full_name || "T")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <CardTitle
                        className="text-base font-bold group-hover:text-indigo-600 transition-colors truncate"
                        title={teacher.profiles?.full_name || "Teacher"}
                      >
                        {teacher.profiles?.full_name || "Teacher"}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground font-medium truncate">
                        {teacher.subject} • {teacher.qualification || "Instructor"}
                      </p>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0 relative z-10"
                        aria-label="Teacher actions"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem
                        onClick={() => {
                          setEditingTeacher(teacher)
                          setModalOpen(true)
                        }}
                      >
                        <Edit2 className="mr-2 h-4 w-4" /> Edit Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          setResetTarget({
                            id: teacher.profile_id,
                            name: teacher.profiles?.full_name || "Faculty Member",
                            email: teacher.profiles?.email || "",
                            role: "teacher",
                          })
                        }
                      >
                        <Key className="mr-2 h-4 w-4" /> Reset Password
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setDeleteTarget(teacher)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Remove Teacher
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>

              <CardContent className="space-y-3 pt-0">
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                    <span className="truncate">{teacher.profiles?.email}</span>
                  </div>
                  {teacher.profiles?.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                      <span>{teacher.profiles.phone}</span>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-border/40 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1 font-semibold text-foreground">
                    <IndianRupee className="h-3.5 w-3.5 text-emerald-600" />
                    <span>{formatCurrency(teacher.salary || 0)} / mo</span>
                  </div>

                  <div className="flex items-center gap-1 rounded-full bg-violet-50 dark:bg-violet-950/60 px-2 py-0.5 text-violet-600 dark:text-violet-400 font-medium">
                    <Layers className="h-3 w-3" />
                    <span>{(teacher.batches || []).length} Batches</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Users2}
          title={search ? "No matching teachers found" : "No teachers registered yet"}
          description={
            search
              ? "Try adjusting your search criteria."
              : "Register your faculty members to assign them to batches and track their schedules."
          }
          actionLabel="Add First Faculty Member"
          onAction={() => {
            setEditingTeacher(null)
            setModalOpen(true)
          }}
        />
      )}

      {/* Teacher Modal */}
      <TeacherModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        teacherToEdit={editingTeacher}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Remove Faculty Member"
        description={`Are you sure you want to delete ${deleteTarget?.profiles?.full_name}? Their associated batches will become unassigned.`}
        confirmText="Remove Teacher"
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
      />

      {/* Reset Password Dialog */}
      <ResetPasswordDialog
        open={!!resetTarget}
        onOpenChange={(open) => !open && setResetTarget(null)}
        user={resetTarget}
      />
    </div>
  )
}
