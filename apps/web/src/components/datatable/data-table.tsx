import { getCoreRowModel, useReactTable, type RowData } from '@tanstack/react-table'

import { TableBodyContent } from '@/components/datatable/table-body'
import { TableHeaderContent } from '@/components/datatable/table-header'
import { TablePagination } from '@/components/datatable/table-pagination'
import { TableToolbar } from '@/components/datatable/table-toolbar'
import { hasActiveFilters, parseSort, type DataTableProps } from '@/components/datatable/types'
import { useTableQuery } from '@/components/datatable/use-table-query'
import { ErrorState } from '@/components/error-state'
import { Card } from '@/components/ui/card'
import { Table } from '@/components/ui/table'

export function DataTable<TData extends RowData>({
    columns,
    data,
    meta,
    query,
    onQueryChange,
    isLoading,
    error,
    onRetry,
    emptyState,
    toolbar,
    searchable,
    rowTestId,
}: DataTableProps<TData>) {
    const {
        search,
        setSearch,
        handleSort,
        handlePageChange,
        handlePerPageChange,
        resetFilters,
    } = useTableQuery({ query, onQueryChange })

    const table = useReactTable({
        data,
        columns,
        manualPagination: true,
        manualSorting: true,
        manualFiltering: true,
        pageCount: meta.total_pages,
        getCoreRowModel: getCoreRowModel(),
    })

    const activeSort = parseSort(query.sort)
    const visibleColumnCount = Math.max(table.getVisibleLeafColumns().length, 1)
    const isInitialLoading = isLoading && data.length === 0
    const isRefreshing = isLoading && data.length > 0

    return (
        <div className="space-y-3">
            <TableToolbar
                search={search}
                onSearchChange={setSearch}
                isRefreshing={isRefreshing}
                toolbar={toolbar}
                searchable={searchable}
            />

            <Card className="gap-0 overflow-hidden py-0">
                {error ? (
                    <ErrorState description={error} onRetry={onRetry} />
                ) : (
                    <Table>
                        <TableHeaderContent table={table} activeSort={activeSort} onSort={handleSort} />
                        <TableBodyContent
                            table={table}
                            visibleColumnCount={visibleColumnCount}
                            isInitialLoading={isInitialLoading}
                            hasFilters={hasActiveFilters(query)}
                            emptyState={emptyState}
                            onResetFilters={resetFilters}
                            rowTestId={rowTestId}
                        />
                    </Table>
                )}
            </Card>

            <TablePagination
                meta={meta}
                disabled={isLoading}
                onPageChange={handlePageChange}
                onPerPageChange={handlePerPageChange}
            />
        </div>
    )
}
