import { useQuery } from '@tanstack/react-query';
import { getBuiltInCollections } from '../openapi/registry';

export function useBuiltInSpecs() {
  return useQuery({
    queryKey: ['api-explorer', 'built-in-specs'],
    queryFn: () => getBuiltInCollections(),
    staleTime: Infinity, // static — never refetch
    gcTime: Infinity,
  });
}
