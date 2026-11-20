import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react"
import { User, Session } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"
import type { Profile, UserRole } from "@/types/database"

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: Profile | null
  role: UserRole | null
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null; role?: UserRole }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const fetchProfile = useCallback(async (currUser: User): Promise<Profile | null> => {
    try {
      // 1. Try querying by id = currUser.id
      let { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", currUser.id)
        .maybeSingle()

      if (error) {
        console.warn("[ORBIT Auth] profiles select by id failed:", error.message)
      }

      // 2. If not found by id, query by email as fallback
      if (!data && currUser.email) {
        const emailRes = await supabase
          .from("profiles")
          .select("*")
          .eq("email", currUser.email.trim())
          .maybeSingle()

        if (emailRes.data) {
          data = emailRes.data
        }
      }

      if (data) {
        return data as Profile
      }

      // 3. If no profile found in DB, check user_metadata or app_metadata
      const metadataRole = (currUser.user_metadata?.role || currUser.app_metadata?.role) as UserRole | undefined
      if (metadataRole) {
        return {
          id: currUser.id,
          role: metadataRole,
          full_name: currUser.user_metadata?.full_name || currUser.email?.split("@")[0] || "User",
          email: currUser.email || "",
          phone: currUser.user_metadata?.phone || null,
          avatar_url: null,
          created_at: currUser.created_at,
          updated_at: currUser.created_at,
        }
      }

      return null
    } catch (err) {
      console.error("Unexpected error in fetchProfile:", err)
      return null
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!user) return
    const p = await fetchProfile(user)
    setProfile(p)
  }, [user, fetchProfile])

  useEffect(() => {
    let mounted = true

    // Initialize session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return
      setSession(session)
      setUser(session?.user ?? null)

      if (session?.user) {
        const p = await fetchProfile(session.user)
        if (mounted) setProfile(p)
      }
      if (mounted) setIsLoading(false)
    })

    // Listen to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!mounted) return
      setSession(newSession)
      setUser(newSession?.user ?? null)

      if (newSession?.user) {
        const p = await fetchProfile(newSession.user)
        if (mounted) setProfile(p)
      } else {
        if (mounted) setProfile(null)
      }
      if (mounted) setIsLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [fetchProfile])

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        return { error }
      }

      if (data.user) {
        const p = await fetchProfile(data.user)
        setProfile(p)
        const userRole = p?.role || (data.user.user_metadata?.role as UserRole) || null
        return { error: null, role: userRole || undefined }
      }

      return { error: new Error("User data missing after login") }
    } catch (err: any) {
      return { error: err }
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
    setProfile(null)
  }

  // Derive active role: strictly from DB profile, then user metadata (never default to admin)
  const activeRole: UserRole | null =
    profile?.role ||
    (user?.user_metadata?.role as UserRole) ||
    null

  const value: AuthContextType = {
    user,
    session,
    profile,
    role: activeRole,
    isLoading,
    signIn,
    signOut,
    refreshProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
