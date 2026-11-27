import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Layers, Plus, Search } from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { fetchBatches, deleteBatch } from "@/services/batches"
import { BatchCard } from "@/pages/admin/batches/batch-card"
import { BatchDetailsDrawer } from "@/pages/admin/batches/batch-details-drawer"
import { BatchModal } from "@/pages/admin/batches/batch-modal"
import { toast } from "sonner"
import type { BatchWithSubjects } from "@/types/database"

export function BatchesListPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [editingBatch, setEditingBatch] = useState<BatchWithSubjects | null>(null)
  const [selectedBatch, setSelectedBatch] = useState<BatchWithSubjects | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<BatchWithSubjects | null>(null)

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
      if (selectedBatch?.id === deleteTarget?.id) {
        setSelectedBatch(null)
      }
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete batch")
    },
  })

  // Search filter across batch name, legacy subject/teacher, and multiple batch_subjects/teachers
  const filteredBatches = (batches || []).filter((b) => {
    const q = search.toLowerCase().trim()
    if (!q) return true
    const nameMatch = b.name.toLowerCase().includes(q)
    const legacyMatch =
      (b.subject || "").toLowerCase().includes(q) ||
      (b.teachers?.profiles?.full_name || "").toLowerCase().includes(q)
    const subjectsMatch = (b.batch_subjects || []).some(
      (s) =>
        s.subject.toLowerCase().includes(q) ||
        (s.teachers?.profiles?.full_name || "").toLowerCase().includes(q)
    )
    return nameMatch || legacyMatch || subjectsMatch
  })

  // Sync selectedBatch with live query cache if it updates
  const activeSelectedBatch =
    batches?.find((b) => b.id === selectedBatch?.id) || selectedBatch

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
          className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
        >
          <Plus className="h-4 w-4" />
          <span>Create Batch</span>
        </Button>
      </PageHeader>

      {/* Search Bar */}
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

      {/* Batches Grid (Clean, compact, uniform height cards) */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-[155px] rounded-2xl border border-border/50 bg-card p-5 animate-pulse space-y-3"
            />
          ))}
        </div>
      ) : filteredBatches.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredBatches.map((batch) => (
            <BatchCard
              key={batch.id}
              batch={batch}
              onSelect={(b) => setSelectedBatch(b)}
              onEdit={(b) => {
                setEditingBatch(b)
                setModalOpen(true)
              }}
              onDelete={(b) => setDeleteTarget(b)}
            />
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

      {/* Batch Details Slide-over Drawer */}
      <BatchDetailsDrawer
        batch={activeSelectedBatch}
        open={!!selectedBatch}
        onClose={() => setSelectedBatch(null)}
        onEdit={(b) => {
          setSelectedBatch(null)
          setEditingBatch(b)
          setModalOpen(true)
        }}
      />

      {/* Batch Create/Edit Modal */}
      <BatchModal
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open)
          if (!open) setEditingBatch(null)
        }}
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
