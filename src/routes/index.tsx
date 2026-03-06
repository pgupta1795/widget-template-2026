import Index from '@/app/test';
import {useWafQuery} from '@/services/hooks/use-waf-query';
import {createFileRoute} from '@tanstack/react-router';

export const Route=createFileRoute('/')({component: App})

function App() {
  const {data,isLoading,isError,error}=useWafQuery('resources/v1/modeler/dseng/dseng:EngItem/search', {
    params: {
      searchStr: 'Electric',
    },
    queryKey: ['search', 'dseng:EngItem']
  })
  if (isLoading) {
    return <p className='flex items-center justify-center h-screen text-2xl'>Loading...</p>;
  }
  if (isError) {
    return <p className='flex items-center justify-center h-screen text-2xl'>
      An error occurred: {error.message}
    </p>;
  }
  console.log({data})
  return (<Index />)
}
