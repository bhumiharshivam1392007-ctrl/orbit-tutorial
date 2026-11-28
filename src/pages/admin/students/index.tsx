import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  GraduationCap,
  Plus,
  Search,
  MoreVertical,
  Edit2,
  Trash2,
  Eye,
  Filter,
  Key,
} from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { ResetPasswordDialog, type ResetPasswordTarget } from "@/components/shared/reset-password-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { fetchStudents, deleteStudent, type StudentListItem } from "@/services/students"
import { fetchBatches } from "@/services/batches"
import { StudentModal } from "@/pages/admin/students/student-modal"
import { getInitials } from "@/lib/utils"
import { toast } from "sonner"

export function StudentsListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [search, setSearch] = useState("")
  const [batchFilter, setBatchFilter] = useState<string>("all")
  const [modalOpen, setModalOpen] = useState(false)
  const [editingStudent, setEditingStudent] = useState<StudentListItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<StudentListItem | null>(null)
  const [resetTarget, setResetTarget] = useState<ResetPasswordTarget | null>(null)

  const { data: students, isLoading } = useQuery({
    queryKey: ["students"],
    queryFn: fetchStudents,
  })

  const { data: batches } = useQuery({
    queryKey: ["batches"],
    queryFn: fetchBatches,
  })

  const deleteMutation = useMutation({
    mutationFn: (student: StudentListItem) => deleteStudent(student.id, student.profile_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] })
      queryClient.invalidateQueries({ queryKey: ["batches"] })
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] })
      toast.success("Student removed successfully")
      setDeleteTarget(null)
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete student")
    },
  })

  const filteredStudents = (students || []).filter((s) => {
    const q = search.toLowerCase()
    const matchesQuery =
      (s.profiles?.full_name || "").toLowerCase().includes(q) ||
      (s.profiles?.email || "").toLowerCase().includes(q) ||
      (s.profiles?.phone || "").toLowerCase().includes(q) ||
      (s.guardian_name || "").toLowerCase().includes(q)

    const matchesBatch =
      batchFilter === "all" ||
      (s.enrollments || []).some((e) => e.batch_id === batchFilter)

    return matchesQuery && matchesBatch
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students Directory"
        description="Manage enrolled students, batch assignments, contact records, and fee ledgers."
        badge={
          <Badge variant="outline" className="border-indigo-400/40 text-indigo-600 dark:text-indigo-400">
            {students?.length || 0} Students
          </Badge>
        }
      >
        <Button
          onClick={() => {
            setEditingStudent(null)
            setModalOpen(true)
          }}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          <span>Add Student</span>
        </Button>
      </PageHeader>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by student name, email, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-muted-foreground hidden sm:block" />
          <Select value={batchFilter} onValueChange={setBatchFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filter by batch" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Batches</SelectItem>
              {(batches || []).map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Students Table */}
      {isLoading ? (
        <div className="rounded-2xl border border-border/60 bg-card p-6 animate-pulse space-y-4">
          <div className="h-6 w-48 bg-muted/60 rounded" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 bg-muted/40 rounded-xl" />
            ))}
          </div>
        </div>
      ) : filteredStudents.length > 0 ? (
        <div className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[660px]">
              <thead className="bg-muted/40 border-b border-border/60 text-xs font-semibold text-muted-foreground uppercase">
                <tr>
                  <th className="py-3.5 px-4">Student</th>
                  <th className="py-3.5 px-4">Contact</th>
                  <th className="py-3.5 px-4">Enrolled Batches</th>
                  <th className="py-3.5 px-4">Guardian</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredStudents.map((student) => {
                  const activeEnrollments = (student.enrollments || []).filter(
                    (e) => e.status === "active"
                  )

                  return (
                    <tr
                      key={student.id}
                      className="hover:bg-accent/40 transition-colors group cursor-pointer"
                      onClick={() => navigate(`/admin/students/${student.id}`)}
                    >
                      {/* Student info */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 ring-2 ring-indigo-500/20">
                            <AvatarFallback>
                              {getInitials(student.profiles?.full_name || "S")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold text-foreground group-hover:text-indigo-600 transition-colors">
                              {student.profiles?.full_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {student.profiles?.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="py-3 px-4 text-xs text-muted-foreground">
                        {student.profiles?.phone || "—"}
                      </td>

                      {/* Enrolled Batches */}
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {activeEnrollments.length > 0 ? (
                            activeEnrollments.map((e) => (
                              <Badge
                                key={e.id}
                                variant="secondary"
                                className="text-[10px] font-medium py-0"
                              >
                                {e.batches?.name || "Batch"}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground italic">
                              Not enrolled
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Guardian */}
                      <td className="py-3 px-4 text-xs">
                        <p className="font-medium text-foreground">
                          {student.guardian_name || "—"}
                        </p>
                        {student.guardian_phone && (
                          <p className="text-muted-foreground text-[11px]">
                            {student.guardian_phone}
                          </p>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <Badge
                          variant={student.status === "active" ? "success" : "secondary"}
                          className="text-[10px] capitalize py-0"
                        >
                          {student.status}
                        </Badge>
                      </td>

                      {/* Actions */}
                      <td
                        className="py-3 px-4 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => navigate(`/admin/students/${student.id}`)}
                            >
                              <Eye className="mr-2 h-4 w-4" /> View Full Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingStudent(student)
                                setModalOpen(true)
                              }}
                            >
                              <Edit2 className="mr-2 h-4 w-4" /> Edit Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                setResetTarget({
                                  id: student.profile_id || student.id,
                                  name: student.profiles?.full_name || "Student",
                                  email: student.profiles?.email || "",
                                  role: "student",
                                })
                              }
                            >
                              <Key className="mr-2 h-4 w-4" /> Reset Password
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeleteTarget(student)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete Student
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState
          icon={GraduationCap}
          title={search || batchFilter !== "all" ? "No matching students found" : "No students registered yet"}
          description={
            search || batchFilter !== "all"
              ? "Try adjusting your filters or search keywords."
              : "Register students, assign them to classes, and manage fee dues."
          }
          actionLabel="Register First Student"
          onAction={() => {
            setEditingStudent(null)
            setModalOpen(true)
          }}
        />
      )}

      {/* Student Modal */}
      <StudentModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        studentToEdit={editingStudent}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Student"
        description={`Are you sure you want to delete ${deleteTarget?.profiles?.full_name}? All payment history and attendance records for this student will be removed.`}
        confirmText="Delete Student"
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

