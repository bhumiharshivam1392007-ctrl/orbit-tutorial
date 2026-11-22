import React, { createContext, useContext, useEffect, useState, useCallback } from "react"
import { toast } from "sonner"
import { Sparkles } from "lucide-react"
import { InstallAppDialog } from "@/components/shared/install-app-dialog"

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed"
    platform: string
  }>
  prompt(): Promise<void>
}

interface PwaContextType {
  isInstallable: boolean
  isInstalled: boolean
  canPromptNative: boolean
  isIOS: boolean
  isAndroid: boolean
  installApp: () => Promise<void>
  isInstallModalOpen: boolean
  setIsInstallModalOpen: (open: boolean) => void
  hasUpdate: boolean
  updateApp: () => void
}

const PwaContext = createContext<PwaContextType | undefined>(undefined)

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState<boolean>(false)
  const [isInstallModalOpen, setIsInstallModalOpen] = useState<boolean>(false)
  const [hasUpdate, setHasUpdate] = useState<boolean>(false)
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null)

  // Platform detection
  const isIOS =
    typeof navigator !== "undefined" &&
    (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1))
  const isAndroid =
    typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent)

  // Check if running in standalone display mode
  const checkIsInstalled = useCallback(() => {
    if (typeof window === "undefined") return false
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes("android-app://")
    setIsInstalled(isStandalone)
    return isStandalone
  }, [])

  useEffect(() => {
    checkIsInstalled()

    const mediaQuery = window.matchMedia("(display-mode: standalone)")
    const handleChange = () => checkIsInstalled()
    mediaQuery.addEventListener("change", handleChange)

    // Capture Chrome/Android beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      console.log("[PWA] Captured beforeinstallprompt event")
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    // App installed event
    const handleAppInstalled = () => {
      console.log("[PWA] Application was successfully installed")
      setIsInstalled(true)
      setDeferredPrompt(null)
      setIsInstallModalOpen(false)
      toast.success("ORBIT installed successfully! You can now launch it from your home screen.", {
        icon: <Sparkles className="h-4 w-4 text-emerald-500" />,
      })
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    window.addEventListener("appinstalled", handleAppInstalled)

    // Register Service Worker in production / live deployment
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((registration) => {
          console.log("[PWA] Service Worker registered with scope:", registration.scope)

          // Check if an updated service worker is already waiting
          if (registration.waiting) {
            setWaitingWorker(registration.waiting)
            setHasUpdate(true)
          }

          // Listen for new service worker installation
          registration.addEventListener("updatefound", () => {
            const installingWorker = registration.installing
            if (installingWorker) {
              installingWorker.addEventListener("statechange", () => {
                if (
                  installingWorker.state === "installed" &&
                  navigator.serviceWorker.controller
                ) {
                  console.log("[PWA] New version available")
                  setWaitingWorker(installingWorker)
                  setHasUpdate(true)
                  toast.info("A new version of ORBIT is available!", {
                    action: {
                      label: "Update Now",
                      onClick: () => {
                        installingWorker.postMessage({ type: "SKIP_WAITING" })
                        window.location.reload()
                      },
                    },
                    duration: 10000,
                  })
                }
              })
            }
          })

          // Check for service worker updates periodically and when window regains focus
          const checkForUpdates = () => {
            registration.update().catch((err) => {
              console.warn("[PWA] Error checking for SW update:", err)
            })
          }

          window.addEventListener("focus", checkForUpdates)
          const interval = setInterval(checkForUpdates, 30 * 60 * 1000) // every 30 mins

          return () => {
            window.removeEventListener("focus", checkForUpdates)
            clearInterval(interval)
          }
        })
        .catch((error) => {
          console.warn("[PWA] Service Worker registration failed:", error)
        })

      // Reload page automatically when new controller takes over
      let refreshing = false
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!refreshing) {
          refreshing = true
          window.location.reload()
        }
      })
    }

    return () => {
      mediaQuery.removeEventListener("change", handleChange)
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      window.removeEventListener("appinstalled", handleAppInstalled)
    }
  }, [checkIsInstalled])

  // Install app handler
  const installApp = useCallback(async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt()
        const choice = await deferredPrompt.userChoice
        console.log("[PWA] User choice outcome:", choice.outcome)
        if (choice.outcome === "accepted") {
          setIsInstalled(true)
          setDeferredPrompt(null)
          setIsInstallModalOpen(false)
        }
      } catch (err) {
        console.error("[PWA] Prompt error:", err)
        setIsInstallModalOpen(true)
      }
    } else {
      // If native prompt cannot be triggered, show the guided instructions dialog
      setIsInstallModalOpen(true)
    }
  }, [deferredPrompt])

  const updateApp = useCallback(() => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: "SKIP_WAITING" })
    }
    window.location.reload()
  }, [waitingWorker])

  const isInstallable = !isInstalled

  return (
    <PwaContext.Provider
      value={{
        isInstallable,
        isInstalled,
        canPromptNative: !!deferredPrompt,
        isIOS,
        isAndroid,
        installApp,
        isInstallModalOpen,
        setIsInstallModalOpen,
        hasUpdate,
        updateApp,
      }}
    >
      {children}
      <InstallAppDialog
        open={isInstallModalOpen}
        onOpenChange={setIsInstallModalOpen}
        canPromptNative={!!deferredPrompt}
        onNativeInstall={installApp}
        isIOS={isIOS}
        isAndroid={isAndroid}
      />
    </PwaContext.Provider>
  )
}

export function usePwa() {
  const context = useContext(PwaContext)
  if (!context) {
    throw new Error("usePwa must be used within a PwaProvider")
  }
  return context
}
