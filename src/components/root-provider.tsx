import {QueryClient,QueryClientProvider} from '@tanstack/react-query'
import type {ReactNode} from 'react'

let context: {queryClient: QueryClient} | undefined

export function getContext() {
  if (context) return context
  const queryClient = new QueryClient({
    defaultOptions:{
      queries:{
        // refetchOnWindowFocus:false,
        // retry:false,
        // refetchOnMount:false,
        // refetchOnReconnect:false
      }
    }
  })
  return {queryClient}
}

type Children = {
  children: ReactNode
}

export default function TanStackQueryProvider({children}: Children) {
  const { queryClient } = getContext()
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
