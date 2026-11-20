import React from "react"
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from "@tanstack/react-query"
import { toast } from "sonner"

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error: any) => {
      const msg = error?.message || error?.details || "A database query error occurred"
      console.error("[Database Query Error]:", error)
      toast.error(`Database Error: ${msg}`, { duration: 6000 })
    },
  }),
  mutationCache: new MutationCache({
    onError: (error: any) => {
      const msg = error?.message || error?.details || "A database operation failed"
      console.error("[Database Mutation Error]:", error)
      toast.error(`Operation Failed: ${msg}`, { duration: 6000 })
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export function QueryProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

export { queryClient }

