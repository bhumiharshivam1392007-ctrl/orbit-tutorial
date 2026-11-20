import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Layers,
  Plus,
  Search,
  Clock,
  User,
  GraduationCap,
  IndianRupee,
  MoreVertical,
  Edit2,
  Trash2,
} from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { fetchBatches, deleteBatch } from "@/services/batches"
import { BatchModal } from "@/pages/admin/batches/batch-modal"
import { formatCurrency } from "@/lib/utils"
import { toast } from "sonner"
import type { Batch } from "@/types/database"

export function BatchesListPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Batch | null>(null)

  const { data: batches, isLoading } = useQuery({
    queryKey: ["batches"],
    queryFn: fetchBatches,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteBatch(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["batches"] })
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] })
      toast.success("Batch deleted successfully")
      setDeleteTarget(null)
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete batch")
    },
  })

  const filteredBatches = (batches || []).filter((b) => {
    const q = search.toLowerCase()
    return (
      b.name.toLowerCase().includes(q) ||
      b.subject.toLowerCase().includes(q) ||
      (b.teachers?.profiles?.full_name || "").toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Batches & Classes"
        description="Configure academic batches, lecture timings, faculty assignments, and monthly fees."
        badge={
          <Badge variant="outline" className="border-indigo-400/40 text-indigo-600 dark:text-indigo-400">
            {batches?.length || 0} Batches
          </Badge>
        }
      >
        <Button
          onClick={() => {
            setEditingBatch(null)
            setModalOpen(true)
          }}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          <span>Create Batch</span>
        </Button>
      </PageHeader>

      {/* Search & Filter Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by batch name, subject, or teacher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Batches Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-48 rounded-2xl border border-border/50 bg-card p-6 animate-pulse space-y-4"
            />
          ))}
        </div>
      ) : filteredBatches.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredBatches.map((batch) => (
            <Card
              key={batch.id}
              className="group relative overflow-hidden transition-all hover:shadow-md hover:border-indigo-500/30"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <Badge variant="secondary" className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50">
                      {batch.subject}
                    </Badge>
                    <CardTitle className="text-lg font-bold group-hover:text-indigo-600 transition-colors">
                      {batch.name}
                    </CardTitle>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          setEditingBatch(batch as any)
                          setModalOpen(true)
                        }}
                      >
                        <Edit2 className="mr-2 h-4 w-4" /> Edit Details
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setDeleteTarget(batch as any)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete Batch
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>

              <CardContent className="space-y-3 pt-0">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                  <span className="truncate">{batch.timing}</span>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <User className="h-3.5 w-3.5 text-violet-500 shrink-0" />
                  <span className="truncate">
                    {batch.teachers?.profiles?.full_name ? (
                      <span className="font-medium text-foreground">
                        {batch.teachers.profiles.full_name}
                      </span>
                    ) : (
                      <span className="italic text-muted-foreground/80">Unassigned</span>
                    )}
                  </span>
                </div>

                <div className="pt-2 border-t border-border/40 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1 font-semibold text-foreground">
                    <IndianRupee className="h-3.5 w-3.5 text-emerald-600" />
                    <span>{formatCurrency(batch.monthly_fee)} / mo</span>
                  </div>

                  <div className="flex items-center gap-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 text-indigo-600 dark:text-indigo-400 font-medium">
                    <GraduationCap className="h-3 w-3" />
                    <span>{batch.student_count} Enrolled</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Layers}
          title={search ? "No matching batches" : "No batches created yet"}
          description={
            search
              ? "Try adjusting your search keywords."
              : "Create your first batch to start assigning teachers and enrolling students."
          }
          actionLabel="Create First Batch"
          onAction={() => {
            setEditingBatch(null)
            setModalOpen(true)
          }}
        />
      )}

      {/* Batch Create/Edit Modal */}
      <BatchModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        batchToEdit={editingBatch}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Batch"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? All associated student enrollments and fee schedules will be affected.`}
        confirmText="Delete Batch"
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </div>
  )
}

