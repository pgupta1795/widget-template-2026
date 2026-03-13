export type SortMode = 'client' | 'server'

export interface SortState {
  columnId: string
  direction: 'asc' | 'desc'
}
