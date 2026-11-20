import { useState, useEffect } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createTeacher, updateTeacher, type TeacherFormData, type TeacherListItem } from "@/services/teachers"
import { toast } from "sonner"

interface TeacherModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  teacherToEdit?: TeacherListItem | null
}

export function TeacherModal({ open, onOpenChange, teacherToEdit }: TeacherModalProps) {
  const queryClient = useQueryClient()

  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("Teacher@123")
  const [phone, setPhone] = useState("")
  const [subject, setSubject] = useState("")
  const [qualification, setQualification] = useState("")
  const [salary, setSalary] = useState<string>("35000")
  const [status, setStatus] = useState<"active" | "inactive">("active")

  useEffect(() => {
    if (teacherToEdit) {
      setFullName(teacherToEdit.profiles?.full_name || "")
      setEmail(teacherToEdit.profiles?.email || "")
      setPassword("")
      setPhone(teacherToEdit.profiles?.phone || "")
      setSubject(teacherToEdit.subject || "")
      setQualification(teacherToEdit.qualification || "")
      setSalary(String(teacherToEdit.salary || 0))
      setStatus(teacherToEdit.status)
    } else {
      setFullName("")
      setEmail("")
      setPassword("Teacher@123")
      setPhone("")
      setSubject("")
      setQualification("M.Sc.")
      setSalary("35000")
      setStatus("active")
    }
  }, [teacherToEdit, open])

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: TeacherFormData = {
        full_name: fullName.trim(),
        email: email.trim(),
        password: password ? password.trim() : undefined,
        phone: phone.trim() || undefined,
        subject: subject.trim(),
        qualification: qualification.trim() || undefined,
        salary: Number(salary),
        status,
      }

      if (teacherToEdit) {
        return updateTeacher(teacherToEdit.id, teacherToEdit.profile_id, payload)
      } else {
        return createTeacher(payload)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] })
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] })
      toast.success(teacherToEdit ? "Teacher updated successfully!" : "Teacher registered successfully!")
      onOpenChange(false)
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save teacher")
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName || !email || !subject) {
      toast.error("Please fill in required fields: Name, Email, Subject")
      return
    }
    mutation.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{teacherToEdit ? "Edit Faculty Member" : "Add Faculty Member"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="t-name">Full Name *</Label>
              <Input
                id="t-name"
                placeholder="Dr. Rajesh Kumar"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="t-phone">Phone Number</Label>
              <Input
                id="t-phone"
                placeholder="9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="t-email">Email Address *</Label>
              <Input
                id="t-email"
                type="email"
                placeholder="rajesh@orbit.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={!!teacherToEdit}
              />
            </div>

            {!teacherToEdit && (
              <div className="space-y-1.5">
                <Label htmlFor="t-pass">Initial Password</Label>
                <Input
                  id="t-pass"
                  type="text"
                  placeholder="Teacher@123"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="t-sub">Primary Subject *</Label>
              <Input
                id="t-sub"
                placeholder="e.g. Mathematics"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="t-qual">Qualification</Label>
              <Input
                id="t-qual"
                placeholder="e.g. M.Sc, Ph.D"
                value={qualification}
                onChange={(e) => setQualification(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="t-sal">Monthly Salary (₹)</Label>
              <Input
                id="t-sal"
                type="number"
                placeholder="35000"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                min={0}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(val: any) => setStatus(val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving..." : teacherToEdit ? "Update Teacher" : "Register Teacher"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

