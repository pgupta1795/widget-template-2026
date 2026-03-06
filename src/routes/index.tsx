import Index from '@/app/test';
import {fetchCsrfToken} from '@/lib/sample-request';
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

  console.log({csrf : data})
  return (<Index />)
}
