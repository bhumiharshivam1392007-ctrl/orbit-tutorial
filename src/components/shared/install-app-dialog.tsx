import { useState } from "react"
import {
  Download,
  Smartphone,
  Share,
  MoreVertical,
  Laptop,
  Zap,
  ShieldCheck,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface InstallAppDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  canPromptNative: boolean
  onNativeInstall: () => void
  isIOS: boolean
  isAndroid: boolean
}

export function InstallAppDialog({
  open,
  onOpenChange,
  canPromptNative,
  onNativeInstall,
  isIOS,
  isAndroid,
}: InstallAppDialogProps) {
  // Determine default tab based on device
  const defaultTab = isIOS ? "ios" : isAndroid ? "android" : "android"
  const [activeTab, setActiveTab] = useState<"android" | "ios" | "desktop">(defaultTab)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6 border-border/80 bg-card/95 backdrop-blur-2xl shadow-2xl">
        <DialogHeader className="space-y-3 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/25 text-white font-extrabold text-xl ring-2 ring-indigo-400/30">
              O
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <DialogTitle className="text-lg sm:text-xl font-bold text-foreground">
                  Install ORBIT App
                </DialogTitle>
                <Badge variant="outline" className="text-[10px] py-0 border-indigo-400/40 text-indigo-600 dark:text-indigo-400">
                  PWA
                </Badge>
              </div>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Fast, standalone academic portal on your device
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Key Advantages Strip */}
          <div className="grid grid-cols-3 gap-2 py-2 px-3 rounded-xl bg-muted/40 border border-border/50 text-center">
            <div className="space-y-0.5">
              <Zap className="h-4 w-4 text-amber-500 mx-auto" />
              <p className="text-[11px] font-semibold text-foreground">Instant</p>
              <p className="text-[10px] text-muted-foreground">Cached shell</p>
            </div>
            <div className="space-y-0.5 border-x border-border/50 px-1">
              <Smartphone className="h-4 w-4 text-indigo-500 mx-auto" />
              <p className="text-[11px] font-semibold text-foreground">Full Screen</p>
              <p className="text-[10px] text-muted-foreground">No URL bars</p>
            </div>
            <div className="space-y-0.5">
              <ShieldCheck className="h-4 w-4 text-emerald-500 mx-auto" />
              <p className="text-[11px] font-semibold text-foreground">Secure</p>
              <p className="text-[10px] text-muted-foreground">Always synced</p>
            </div>
          </div>

          {/* Primary Action Button when native prompt is ready */}
          {canPromptNative && (
            <div className="space-y-2">
              <Button
                onClick={() => {
                  onNativeInstall()
                }}
                className="w-full gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 shadow-md shadow-indigo-500/25 h-11 text-sm font-semibold"
              >
                <Download className="h-4 w-4" />
                <span>Install ORBIT Now</span>
              </Button>
              <p className="text-[11px] text-center text-muted-foreground">
                Tapping install will prompt Chrome to add the app to your home screen.
              </p>
            </div>
          )}

          {/* Manual Instructions (Tabs for Android, iOS, Desktop) */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {canPromptNative ? "Or Install via Browser Menu" : "How to Install on Your Device"}
              </span>
            </div>

            {/* Platform Selector Tabs */}
            <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-muted/60 border border-border/50">
              <button
                type="button"
                onClick={() => setActiveTab("android")}
                className={`py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === "android"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Smartphone className="h-3.5 w-3.5 text-emerald-500" />
                <span>Android</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("ios")}
                className={`py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === "ios"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Share className="h-3.5 w-3.5 text-indigo-500" />
                <span>iPhone / iPad</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("desktop")}
                className={`py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === "desktop"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Laptop className="h-3.5 w-3.5 text-blue-500" />
                <span>Desktop</span>
              </button>
            </div>

            {/* Tab Instructions Content */}
            <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20 space-y-2.5 text-xs">
              {activeTab === "android" && (
                <ol className="space-y-2 list-none">
                  <li className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-[11px]">
                      1
                    </span>
                    <span className="text-foreground leading-tight">
                      Open <strong>Google Chrome</strong> and tap the three-dot menu{" "}
                      <MoreVertical className="inline h-3.5 w-3.5 text-muted-foreground" /> at the top-right.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-[11px]">
                      2
                    </span>
                    <span className="text-foreground leading-tight">
                      Tap <strong>"Install app"</strong> (or <strong>"Add to Home screen"</strong>).
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-[11px]">
                      3
                    </span>
                    <span className="text-foreground leading-tight">
                      Tap <strong>"Install"</strong> to confirm. ORBIT will appear on your home screen and app drawer!
                    </span>
                  </li>
                </ol>
              )}

              {activeTab === "ios" && (
                <ol className="space-y-2 list-none">
                  <li className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-[11px]">
                      1
                    </span>
                    <span className="text-foreground leading-tight">
                      Open <strong>Safari</strong> on your iPhone or iPad.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-[11px]">
                      2
                    </span>
                    <span className="text-foreground leading-tight">
                      Tap the <strong>Share</strong> button{" "}
                      <Share className="inline h-3.5 w-3.5 text-indigo-500" /> at the bottom of the screen.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-[11px]">
                      3
                    </span>
                    <span className="text-foreground leading-tight">
                      Scroll down and tap <strong>"Add to Home Screen"</strong> (+), then tap <strong>"Add"</strong>.
                    </span>
                  </li>
                </ol>
              )}

              {activeTab === "desktop" && (
                <ol className="space-y-2 list-none">
                  <li className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-[11px]">
                      1
                    </span>
                    <span className="text-foreground leading-tight">
                      In <strong>Google Chrome, Microsoft Edge, or Brave</strong>, look at the right side of the address bar.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-[11px]">
                      2
                    </span>
                    <span className="text-foreground leading-tight">
                      Click the <strong>Install</strong> icon{" "}
                      <Download className="inline h-3.5 w-3.5 text-indigo-500" /> (or computer symbol).
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-[11px]">
                      3
                    </span>
                    <span className="text-foreground leading-tight">
                      Click <strong>"Install"</strong> to launch ORBIT in its own standalone desktop window.
                    </span>
                  </li>
                </ol>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
