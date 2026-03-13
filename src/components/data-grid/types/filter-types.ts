export type FilterMode = 'client' | 'server'

export type FilterOperator = 'contains' | 'startsWith' | 'equals' | 'between' | 'in'

export interface FilterState {
  columnId: string
  value: unknown
  operator?: FilterOperator
}

export type FacetData = Map<unknown, number>
