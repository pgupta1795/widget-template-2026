import {logger} from '@/lib/logger'
import {fetchCsrfToken} from '@/lib/utils'
import {useQuery} from '@tanstack/react-query'
import {createFileRoute} from '@tanstack/react-router'
import {useEffect} from 'react'

export const Route = createFileRoute('/')({component: App})

function App() {
  useEffect(() => {
    logger.debug("Home page mounted")
  }, [])

  const {data: csrfToken,isLoading,error} = useQuery({
    queryKey: ['csrfToken'],
    queryFn: fetchCsrfToken,
  })
  logger.info("csrfToken : ", csrfToken);
  logger.info("isLoading : ", isLoading);
  logger.info("error : ", error);

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">CSRF Token Manager</h1>
      
      {isLoading ? (
        <p className="animate-pulse text-blue-500">Fetching CSRF Token...</p>
      ) : error ? (
        <p className="text-red-500 font-medium">Error: {(error as Error).message}</p>
      ) : (
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
          <p className="text-sm text-slate-500 mb-1">Current CSRF Token:</p>
          <code className="block bg-white p-2 rounded border border-slate-300 break-all text-sm font-mono text-blue-600">
            {csrfToken}
          </code>
        </div>
      )}

      <div className="mt-8 pt-8 border-t border-slate-200">
        <p className="text-xs text-slate-400">
          This token is fetched automatically using <span className="font-semibold italic text-slate-500">WAFData</span> and <span className="font-semibold italic text-slate-500">i3DXCompassServices</span> via TanStack Query.
        </p>
      </div>
    </div>
  )
}
