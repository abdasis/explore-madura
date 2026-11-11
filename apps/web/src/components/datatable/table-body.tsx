import type { ReactNode } from 'react'
import { flexRender, type RowData, type Table } from '@tanstack/react-table'

import { alignClass } from '@/components/datatable/types'
import { EmptyState } from '@/components/empty-state'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { TableBody, TableCell, TableRow } from '@/components/ui/table'

const SKELETON_ROWS = 5

type TableBodyContentProps<TData extends RowData> = {
    table: Table<TData>
    visibleColumnCount: number
    isInitialLoading: boolean
    hasFilters: boolean
    emptyState?: ReactNode
    onResetFilters: () => void
    rowTestId?: (row: TData) => string
}

function SkeletonRows({ columnCount }: { columnCount: number }) {
    return (
        <>
            {Array.from({ length: SKELETON_ROWS }, (_, rowIndex) => (
                <TableRow key={`skeleton-${rowIndex}`}>
                    {Array.from({ length: columnCount }, (__, cellIndex) => (
                        <TableCell key={`skeleton-cell-${cellIndex}`}>
                            <Skeleton className="h-4 w-full" />
                        </TableCell>
                    ))}
                </TableRow>
            ))}
        </>
    )
}

function EmptyRow({
    hasFilters,
    columnCount,
    emptyState,
    onResetFilters,
}: {
    hasFilters: boolean
    columnCount: number
    emptyState?: ReactNode
    onResetFilters: () => void
}) {
    return (
        <TableRow>
            <TableCell colSpan={columnCount} className="p-0">
                {hasFilters ? (
                    <EmptyState
                        title="Tidak ada hasil"
                        description="Coba ubah kata kunci atau hapus filter yang aktif."
                        action={
                            <Button variant="outline" size="sm" onClick={onResetFilters}>
                                Hapus filter
                            </Button>
                        }
                    />
                ) : (
                    (emptyState ?? (
                        <EmptyState title="Belum ada data" description="Data akan muncul di sini setelah tersedia." />
                    ))
                )}
            </TableCell>
        </TableRow>
    )
}

export function TableBodyContent<TData extends RowData>({
    table,
    visibleColumnCount,
    isInitialLoading,
    hasFilters,
    emptyState,
    onResetFilters,
    rowTestId,
}: TableBodyContentProps<TData>) {
    return (
        <TableBody>
            {isInitialLoading ? (
                <SkeletonRows columnCount={visibleColumnCount} />
            ) : (
                table.getRowModel().rows.map((row) => (
                    <TableRow
                        key={row.id}
                        data-testid={rowTestId?.(row.original)}
                        className="hover:bg-muted/50"
                    >
                        {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id} className={alignClass(cell.column.columnDef.meta?.align)}>
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                        ))}
                    </TableRow>
                ))
            )}

            {!isInitialLoading && table.getRowModel().rows.length === 0 ? (
                <EmptyRow
                    hasFilters={hasFilters}
                    columnCount={visibleColumnCount}
                    emptyState={emptyState}
                    onResetFilters={onResetFilters}
                />
            ) : null}
        </TableBody>
    )
}
