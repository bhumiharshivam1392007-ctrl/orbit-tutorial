import { useState, useEffect } from "react"
import { useMutation } from "@tanstack/react-query"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { resetUserPassword } from "@/services/auth-admin"
import { toast } from "sonner"
import { Key, Eye, EyeOff, Sparkles, Copy, Check, ShieldCheck } from "lucide-react"

export interface ResetPasswordTarget {
  id: string // auth user id (profiles.id)
  name: string
  email: string
  role?: "student" | "teacher" | string
}

interface ResetPasswordDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: ResetPasswordTarget | null
}

export function ResetPasswordDialog({
  open,
  onOpenChange,
  user,
}: ResetPasswordDialogProps) {
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (open) {
      setNewPassword("")
      setConfirmPassword("")
      setShowPassword(false)
      setCopied(false)
    }
  }, [open])

  const generatePassword = () => {
    const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%"
    let generated = ""
    for (let i = 0; i < 10; i++) {
      generated += charset.charAt(Math.floor(Math.random() * charset.length))
    }
    setNewPassword(generated)
    setConfirmPassword(generated)
    setShowPassword(true)
    toast.info("Generated strong password")
  }

  const handleCopy = async () => {
    if (!newPassword) return
    try {
      await navigator.clipboard.writeText(newPassword)
      setCopied(true)
      toast.success("Password copied to clipboard")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Failed to copy password")
    }
  }

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("No target user selected")
      if (!newPassword || newPassword.length < 8) {
        throw new Error("Password must be at least 8 characters long")
      }
      if (newPassword !== confirmPassword) {
        throw new Error("Passwords do not match")
      }

      return resetUserPassword(user.id, newPassword)
    },
    onSuccess: () => {
      toast.success("Password updated")
      onOpenChange(false)
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to reset password")
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate()
  }

  const isTooShort = newPassword.length > 0 && newPassword.length < 8
  const isMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-md p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Key className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <span>Reset User Password</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Set a new login password for this account.
          </DialogDescription>
        </DialogHeader>

        {user && (
          <div className="bg-muted/50 rounded-xl p-3 border border-border/60 flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-xs font-semibold text-foreground truncate">{user.name}</div>
              <div className="text-[11px] text-muted-foreground truncate">{user.email}</div>
            </div>
            {user.role && (
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                {user.role}
              </span>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* New Password */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="new-pass" className="text-xs">New Password *</Label>
              <button
                type="button"
                onClick={generatePassword}
                className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                <Sparkles className="h-3 w-3" />
                <span>Generate strong password</span>
              </button>
            </div>
            <div className="relative">
              <Input
                id="new-pass"
                type={showPassword ? "text" : "password"}
                placeholder="At least 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="pr-16"
                required
              />
              <div className="absolute right-1 top-1 flex items-center gap-0.5">
                {newPassword && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={handleCopy}
                    title="Copy password"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>
            {isTooShort && (
              <p className="text-[11px] text-rose-500">Password must be at least 8 characters long.</p>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <Label htmlFor="conf-pass" className="text-xs">Confirm New Password *</Label>
            <Input
              id="conf-pass"
              type={showPassword ? "text" : "password"}
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            {isMismatch && (
              <p className="text-[11px] text-rose-500">Passwords do not match.</p>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                mutation.isPending ||
                !newPassword ||
                newPassword.length < 8 ||
                newPassword !== confirmPassword
              }
              className="gap-1.5 bg-indigo-600 hover:bg-indigo-700"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>{mutation.isPending ? "Updating..." : "Update Password"}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
