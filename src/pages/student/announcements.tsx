import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  Bell,
  Sparkles,
  Layers,
  GraduationCap,
} from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/hooks/use-auth"
import { fetchStudentDashboard, type StudentAnnouncementItem } from "@/services/student-module"
import { formatDate } from "@/lib/utils"

export function StudentAnnouncementsPage() {
  const { profile } = useAuth()
  const [activeTab, setActiveTab] = useState<string>("all")

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ["student-dashboard", profile?.id],
    queryFn: () => fetchStudentDashboard(profile?.id || ""),
    enabled: !!profile?.id,
  })

  const notices = dashboard?.recentAnnouncements || []

  const filteredNotices = notices.filter((notice) => {
    if (activeTab === "all") return true
    if (activeTab === "classes") return !!notice.target_batch_id
    if (activeTab === "institute") return !notice.target_batch_id
    return true
  })

  const getNoticeBadge = (notice: StudentAnnouncementItem) => {
    if (notice.target_batch_id) {
      return (
        <Badge variant="outline" className="text-xs bg-indigo-50/50 dark:bg-indigo-950/40 border-indigo-400 gap-1">
          <Layers className="h-3 w-3" />
          {notice.batch_name || "Class Notice"}
        </Badge>
      )
    }
    if (notice.target_audience === "students") {
      return (
        <Badge variant="secondary" className="text-xs gap-1">
          <GraduationCap className="h-3 w-3 text-indigo-600" />
          Students Only
        </Badge>
      )
    }
    return (
      <Badge variant="default" className="text-xs gap-1">
        <Sparkles className="h-3 w-3" />
        Institute Wide
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Notice Board"
        description="Important circulars, test timetables, holiday announcements, and homework from your instructors."
        badge={
          <Badge variant="outline" className="border-indigo-400/50 text-indigo-600 dark:text-indigo-400">
            {notices.length} Notices
          </Badge>
        }
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all" className="text-xs">
            All ({notices.length})
          </TabsTrigger>
          <TabsTrigger value="classes" className="text-xs">
            Class Notices ({notices.filter((n) => n.target_batch_id).length})
          </TabsTrigger>
          <TabsTrigger value="institute" className="text-xs">
            Institute Circulars ({notices.filter((n) => !n.target_batch_id).length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Notices Feed */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-32 rounded-2xl border border-border/60 bg-card p-6 animate-pulse"
            />
          ))}
        </div>
      ) : filteredNotices.length > 0 ? (
        <div className="space-y-4">
          {filteredNotices.map((notice) => (
            <Card
              key={notice.id}
              className="p-6 transition-all hover:shadow-md hover:border-indigo-500/30 space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-3">
                <div className="flex items-center gap-2">
                  {getNoticeBadge(notice)}
                  <span className="text-xs text-muted-foreground">
                    {formatDate(notice.created_at)}
                  </span>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-foreground">
                  {notice.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {notice.content}
                </p>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Bell}
          title="No notices found"
          description="There are currently no active announcements matching this category."
        />
      )}
    </div>
  )
}

