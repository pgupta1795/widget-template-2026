import {fetchCsrfToken} from '@/lib/utils';
import {useQuery} from '@tanstack/react-query';
import {createFileRoute} from '@tanstack/react-router';

export const Route=createFileRoute('/')({component: App})

function App() {
  const {data,isLoading,isError,error}=useQuery({
    queryKey: ['csrf-token'],
    queryFn: fetchCsrfToken,
  });

  if (isLoading) {
    return <p className='flex items-center justify-center h-screen text-2xl'>Loading...</p>;
  }

  if (isError) {
    return <p className='flex items-center justify-center h-screen text-2xl'>An error occurred: {error.message}</p>;
  }

  return (
    <div className="flex items-center justify-center h-screen">
      {data?.csrf?.value}
    </div>
  )
}
