import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
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
import { fetchBatches } from "@/services/batches"
import { createStudent, updateStudent, type StudentFormData, type StudentListItem } from "@/services/students"
import { toast } from "sonner"

interface StudentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  studentToEdit?: StudentListItem | null
}

export function StudentModal({ open, onOpenChange, studentToEdit }: StudentModalProps) {
  const queryClient = useQueryClient()

  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("Student@123")
  const [phone, setPhone] = useState("")
  const [dob, setDob] = useState("")
  const [gender, setGender] = useState<"male" | "female" | "other">("male")
  const [guardianName, setGuardianName] = useState("")
  const [guardianPhone, setGuardianPhone] = useState("")
  const [address, setAddress] = useState("")
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([])
  const [status, setStatus] = useState<"active" | "inactive">("active")

  // Fetch available batches
  const { data: batches } = useQuery({
    queryKey: ["batches"],
    queryFn: fetchBatches,
    enabled: open,
  })

  useEffect(() => {
    if (studentToEdit) {
      setFullName(studentToEdit.profiles?.full_name || "")
      setEmail(studentToEdit.profiles?.email || "")
      setPassword("")
      setPhone(studentToEdit.profiles?.phone || "")
      setDob(studentToEdit.date_of_birth || "")
      setGender((studentToEdit.gender as any) || "male")
      setGuardianName(studentToEdit.guardian_name || "")
      setGuardianPhone(studentToEdit.guardian_phone || "")
      setAddress(studentToEdit.address || "")
      setSelectedBatchIds(
        (studentToEdit.enrollments || []).map((e) => e.batch_id)
      )
      setStatus(studentToEdit.status)
    } else {
      setFullName("")
      setEmail("")
      setPassword("Student@123")
      setPhone("")
      setDob("")
      setGender("male")
      setGuardianName("")
      setGuardianPhone("")
      setAddress("")
      setSelectedBatchIds([])
      setStatus("active")
    }
  }, [studentToEdit, open])

  const toggleBatch = (batchId: string) => {
    // A student belongs to exactly ONE batch (their academic class)
    setSelectedBatchIds((prev) => (prev.includes(batchId) ? [] : [batchId]))
  }

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: StudentFormData = {
        full_name: fullName.trim(),
        email: email.trim(),
        password: password ? password.trim() : undefined,
        phone: phone.trim() || undefined,
        date_of_birth: dob || undefined,
        gender,
        guardian_name: guardianName.trim() || undefined,
        guardian_phone: guardianPhone.trim() || undefined,
        address: address.trim() || undefined,
        batch_ids: selectedBatchIds,
        status,
      }

      if (studentToEdit) {
        return updateStudent(studentToEdit.id, studentToEdit.profile_id, payload)
      } else {
        return createStudent(payload)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] })
      queryClient.invalidateQueries({ queryKey: ["batches"] })
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] })
      toast.success(studentToEdit ? "Student updated successfully!" : "Student registered successfully!")
      onOpenChange(false)
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save student")
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName || !email) {
      toast.error("Please fill in required fields: Name and Email")
      return
    }
    mutation.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-xl max-h-[88vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>{studentToEdit ? "Edit Student Profile" : "Register New Student"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Personal Details */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              1. Student Details
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="s-name">Full Name *</Label>
                <Input
                  id="s-name"
                  placeholder="Amit Verma"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="s-phone">Phone Number</Label>
                <Input
                  id="s-phone"
                  placeholder="9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="s-email">Email Address *</Label>
                <Input
                  id="s-email"
                  type="email"
                  placeholder="amit@orbit.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={!!studentToEdit}
                />
              </div>

              {!studentToEdit && (
                <div className="space-y-1.5">
                  <Label htmlFor="s-pass">Initial Password</Label>
                  <Input
                    id="s-pass"
                    type="text"
                    placeholder="Student@123"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="s-dob">Date of Birth</Label>
                <Input
                  id="s-dob"
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Gender</Label>
                <Select value={gender} onValueChange={(val: any) => setGender(val)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Guardian Info */}
          <div className="space-y-3 pt-2 border-t border-border/60">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              2. Guardian & Address
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="g-name">Guardian Name</Label>
                <Input
                  id="g-name"
                  placeholder="Suresh Verma"
                  value={guardianName}
                  onChange={(e) => setGuardianName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="g-phone">Guardian Contact</Label>
                <Input
                  id="g-phone"
                  placeholder="9876543211"
                  value={guardianPhone}
                  onChange={(e) => setGuardianPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="s-addr">Residential Address</Label>
              <Input
                id="s-addr"
                placeholder="Flat / House No, Street, City"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
          </div>

          {/* Batch Enrolment */}
          <div className="space-y-3 pt-2 border-t border-border/60">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                3. Assign Academic Class (Batch)
              </h4>
              <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
                {selectedBatchIds.length > 0 ? "1 Class Selected" : "None Selected"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
              {(batches || []).map((b) => {
                const isSelected = selectedBatchIds.includes(b.id)
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => toggleBatch(b.id)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs text-left transition-all ${
                      isSelected
                        ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 font-semibold ring-1 ring-indigo-500"
                        : "border-border/60 hover:bg-muted/50 text-foreground"
                    }`}
                  >
                    <div>
                      <p className="font-semibold text-sm">{b.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {b.batch_subjects?.length ? `${b.batch_subjects.length} Subjects` : "All Subjects"}
                      </p>
                    </div>
                    <span className="text-xs font-mono font-bold">
                      ₹{b.monthly_fee}/mo
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <DialogFooter className="pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving..." : studentToEdit ? "Update Student" : "Register Student"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

