import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Bell,
  Plus,
  Trash2,
  Users,
  GraduationCap,
  Sparkles,
  Layers,
} from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { fetchAnnouncements, createAnnouncement, deleteAnnouncement, type AnnouncementFormData } from "@/services/announcements"
import { fetchBatches } from "@/services/batches"
import { useAuth } from "@/hooks/use-auth"
import { formatDate } from "@/lib/utils"
import { toast } from "sonner"
import type { AnnouncementWithAuthor, TargetAudience } from "@/types/database"

export function AnnouncementsPage() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()

  const [modalOpen, setModalOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [targetAudience, setTargetAudience] = useState<TargetAudience>("all")
  const [targetBatchId, setTargetBatchId] = useState<string>("none")
  const [deleteTarget, setDeleteTarget] = useState<AnnouncementWithAuthor | null>(null)

  const { data: announcements, isLoading } = useQuery({
    queryKey: ["announcements"],
    queryFn: fetchAnnouncements,
  })

  const { data: batches } = useQuery({
    queryKey: ["batches"],
    queryFn: fetchBatches,
    enabled: modalOpen,
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload: AnnouncementFormData = {
        title: title.trim(),
        content: content.trim(),
        target_audience: targetAudience,
        target_batch_id: targetBatchId === "none" ? null : targetBatchId,
      }
      return createAnnouncement(payload, profile?.id || "")
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] })
      toast.success("Announcement broadcast successfully!")
      setModalOpen(false)
      setTitle("")
      setContent("")
      setTargetAudience("all")
      setTargetBatchId("none")
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to post announcement")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAnnouncement(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] })
      toast.success("Announcement removed")
      setDeleteTarget(null)
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete announcement")
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !content) {
      toast.error("Please enter both title and content")
      return
    }
    createMutation.mutate()
  }

  const getAudienceBadge = (aud: TargetAudience, batchId: string | null) => {
    if (batchId) {
      return (
        <Badge variant="outline" className="text-xs bg-indigo-50/50 dark:bg-indigo-950/40 border-indigo-400">
          <Layers className="h-3 w-3 mr-1" /> Batch Notice
        </Badge>
      )
    }
    if (aud === "teachers") {
      return (
        <Badge variant="secondary" className="text-xs">
          <Users className="h-3 w-3 mr-1 text-violet-600" /> Teachers Only
        </Badge>
      )
    }
    if (aud === "students") {
      return (
        <Badge variant="secondary" className="text-xs">
          <GraduationCap className="h-3 w-3 mr-1 text-emerald-600" /> Students Only
        </Badge>
      )
    }
    return (
      <Badge variant="default" className="text-xs">
        <Sparkles className="h-3 w-3 mr-1" /> Institute Wide
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notice Board & Announcements"
        description="Broadcast important schedule alerts, test notifications, and institute updates."
        badge={
          <Badge variant="outline" className="border-indigo-400/40 text-indigo-600 dark:text-indigo-400">
            {announcements?.length || 0} Notices
          </Badge>
        }
      >
        <Button onClick={() => setModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          <span>Post Announcement</span>
        </Button>
      </PageHeader>

      {/* Announcements List */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-32 rounded-2xl border border-border/60 bg-card p-6 animate-pulse"
            />
          ))}
        </div>
      ) : (announcements || []).length > 0 ? (
        <div className="space-y-4">
          {(announcements || []).map((notice) => (
            <Card
              key={notice.id}
              className="p-6 transition-all hover:shadow-md hover:border-indigo-500/30"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2.5">
                    {getAudienceBadge(notice.target_audience, notice.target_batch_id)}
                    <span className="text-xs text-muted-foreground">
                      {formatDate(notice.created_at)}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-foreground">
                    {notice.title}
                  </h3>

                  <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {notice.content}
                  </p>

                  <p className="text-[11px] text-muted-foreground/80 pt-2">
                    Broadcasted by: <span className="font-semibold text-foreground">{notice.profiles?.full_name || "Admin"}</span>
                  </p>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => setDeleteTarget(notice)}
                  title="Delete Notice"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Bell}
          title="No notices broadcasted yet"
          description="Send out test timetables, holiday schedules, or fee reminders to staff and students."
          actionLabel="Publish First Notice"
          onAction={() => setModalOpen(true)}
        />
      )}

      {/* Create Announcement Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-lg max-h-[88vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Broadcast New Announcement</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="a-title">Notice Title *</Label>
              <Input
                id="a-title"
                placeholder="e.g. Schedule for Monthly Assessment Test"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Target Audience *</Label>
                <Select
                  value={targetAudience}
                  onValueChange={(val: any) => setTargetAudience(val)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Everyone (All)</SelectItem>
                    <SelectItem value="students">Students Only</SelectItem>
                    <SelectItem value="teachers">Teachers Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Specific Batch (Optional)</Label>
                <Select value={targetBatchId} onValueChange={setTargetBatchId}>
                  <SelectTrigger>
                    <SelectValue placeholder="All batches" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Specific Batch</SelectItem>
                    {(batches || []).map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="a-content">Announcement Body *</Label>
              <textarea
                id="a-content"
                rows={4}
                placeholder="Type your notice content here..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full rounded-xl border border-input bg-background/50 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                disabled={createMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Broadcasting..." : "Broadcast Notice"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Announcement"
        description={`Are you sure you want to remove the announcement "${deleteTarget?.title}"?`}
        confirmText="Remove Notice"
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </div>
  )
}
