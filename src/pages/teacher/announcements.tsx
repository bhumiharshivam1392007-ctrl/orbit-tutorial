import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Bell,
  Plus,
  Layers,
  Sparkles,
  Users,
} from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
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
import { useAuth } from "@/hooks/use-auth"
import { fetchTeacherDashboard, postTeacherAnnouncement } from "@/services/teacher-module"
import { formatDate } from "@/lib/utils"
import { toast } from "sonner"
import type { TargetAudience } from "@/types/database"

export function TeacherAnnouncementsPage() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()

  const [modalOpen, setModalOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [targetBatchId, setTargetBatchId] = useState<string>("")

  // Fetch teacher dashboard data (includes announcements and assigned batches)
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ["teacher-dashboard", profile?.id],
    queryFn: () => fetchTeacherDashboard(profile?.id || ""),
    enabled: !!profile?.id,
  })

  const batches = dashboard?.batches || []
  const notices = dashboard?.recentAnnouncements || []

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!targetBatchId) throw new Error("Please select a target batch")
      return postTeacherAnnouncement(profile!.id, title, content, targetBatchId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-dashboard", profile?.id] })
      toast.success("Notice broadcasted to batch successfully!")
      setModalOpen(false)
      setTitle("")
      setContent("")
      setTargetBatchId("")
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to post notice")
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !content || !targetBatchId) {
      toast.error("Please fill in all fields including the target batch")
      return
    }
    createMutation.mutate()
  }

  const getAudienceBadge = (aud: TargetAudience, batchId: string | null) => {
    if (batchId) {
      const matchBatch = batches.find((b) => b.id === batchId)
      return (
        <Badge variant="outline" className="text-xs bg-indigo-50/50 dark:bg-indigo-950/40 border-indigo-400">
          <Layers className="h-3 w-3 mr-1" /> {matchBatch ? matchBatch.name : "Batch Notice"}
        </Badge>
      )
    }
    if (aud === "teachers") {
      return (
        <Badge variant="secondary" className="text-xs">
          <Users className="h-3 w-3 mr-1 text-violet-600" /> Teachers Notice
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
    <div className="space-y-6 w-full max-w-full min-w-0">
      <PageHeader
        title="Notice Board & Class Updates"
        description="Broadcast homework, test dates, and syllabus announcements directly to your students."
        badge={
          <Badge variant="outline" className="border-indigo-400/40 text-indigo-600 dark:text-indigo-400">
            {notices.length} Notices
          </Badge>
        }
      >
        <Button
          onClick={() => setModalOpen(true)}
          disabled={batches.length === 0}
          className="w-full sm:w-auto gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-xs sm:text-sm shrink-0"
        >
          <Plus className="h-4 w-4 shrink-0" />
          <span>Post Notice to Batch</span>
        </Button>
      </PageHeader>

      {/* Notices Feed */}
      {isLoading ? (
        <div className="space-y-4 w-full max-w-full min-w-0">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-32 rounded-2xl border border-border/60 bg-card p-6 animate-pulse"
            />
          ))}
        </div>
      ) : notices.length > 0 ? (
        <div className="space-y-4 w-full max-w-full min-w-0">
          {notices.map((notice) => (
            <Card
              key={notice.id}
              className="p-4 sm:p-6 transition-all hover:shadow-md hover:border-indigo-500/30 w-full max-w-full min-w-0 overflow-hidden"
            >
              <div className="space-y-2 w-full max-w-full min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {getAudienceBadge(notice.target_audience, notice.target_batch_id)}
                  <span className="text-xs text-muted-foreground">
                    {formatDate(notice.created_at)}
                  </span>
                </div>

                <h3 className="text-base sm:text-lg font-bold text-foreground break-words">
                  {notice.title}
                </h3>

                <p className="text-xs sm:text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed break-words">
                  {notice.content}
                </p>

                <p className="text-[11px] text-muted-foreground/80 pt-2 border-t border-border/30">
                  Author: <span className="font-semibold text-foreground">{notice.profiles?.full_name || "Faculty Member"}</span>
                </p>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Bell}
          title="No notices on your board"
          description="Broadcast test dates, study materials, or schedule changes to students in your batches."
          actionLabel={batches.length > 0 ? "Post First Notice" : undefined}
          onAction={batches.length > 0 ? () => setModalOpen(true) : undefined}
        />
      )}

      {/* Create Announcement Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-md max-h-[88vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Broadcast Batch Notice</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Select Target Batch *</Label>
              <Select value={targetBatchId} onValueChange={setTargetBatchId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose one of your batches..." />
                </SelectTrigger>
                <SelectContent>
                  {batches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name} ({b.timing})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="t-title">Notice Title *</Label>
              <Input
                id="t-title"
                placeholder="e.g. Test on Optics next Wednesday"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="t-content">Announcement Body *</Label>
              <textarea
                id="t-content"
                rows={4}
                placeholder="Write your class message..."
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
    </div>
  )
}
