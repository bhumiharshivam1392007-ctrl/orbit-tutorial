import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Compass } from "lucide-react"

export function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center bg-background">
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 shadow-inner">
        <Compass className="h-8 w-8 animate-pulse" />
      </div>
      <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
        404
      </h1>
      <p className="mt-2 text-lg font-semibold text-foreground">
        Page Not Found
      </p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        The page you are looking for doesn't exist or has been moved.
      </p>
      <Button onClick={() => navigate("/")} className="mt-6 gap-2">
        <ArrowLeft className="h-4 w-4" />
        Return to Safety
      </Button>
    </div>
  )
}
