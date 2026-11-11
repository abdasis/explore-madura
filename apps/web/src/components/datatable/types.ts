import type { ColumnDef, RowData } from '@tanstack/react-table'
import type { ReactNode } from 'react'

import type { PaginationMeta } from '@/types/api'

export type TableQuery = {
    page: number
    per_page: number
    q: string
    sort: string | null
    filters: Record<string, string>
}

export type SortDirection = 'asc' | 'desc'

export type ParsedSort = {
    field: string
    direction: SortDirection
}

export type SortState = ParsedSort

export type DataTableProps<TData extends RowData> = {
    columns: ColumnDef<TData>[]
    data: TData[]
    meta: PaginationMeta
    query: TableQuery
    onQueryChange: (next: TableQuery) => void
    isLoading: boolean
    error?: string | null
    onRetry?: () => void
    emptyState?: ReactNode
    toolbar?: ReactNode
    searchable?: boolean
    /** Stable test id applied to each body row, e.g. `shu-share-row`. */
    rowTestId?: (row: TData) => string
}

declare module '@tanstack/react-table' {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface ColumnMeta<TData extends RowData, TValue> {
        align?: 'left' | 'right' | 'center'
    }
}

export function alignClass(align?: 'left' | 'right' | 'center') {
    if (align === 'right') return 'text-right'
    if (align === 'center') return 'text-center'
    return 'text-left'
}

export function parseSort(sort: string | null): ParsedSort | null {
    if (!sort) return null

    const [field, direction] = sort.split(':')
    if (!field || (direction !== 'asc' && direction !== 'desc')) return null

    return { field, direction }
}

export function nextSortValue(current: string | null, field: string): string | null {
    const parsed = parseSort(current)
    if (!parsed || parsed.field !== field) return `${field}:asc`
    if (parsed.direction === 'asc') return `${field}:desc`
    return null
}

export function hasActiveFilters(query: TableQuery): boolean {
    return query.q.trim() !== '' || Object.values(query.filters).some((value) => value !== '')
}
