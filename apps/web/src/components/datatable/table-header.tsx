import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowDown01Icon, ArrowUp01Icon, UnfoldMoreIcon } from '@hugeicons/core-free-icons'
import { flexRender, type Header, type RowData, type Table } from '@tanstack/react-table'

import { alignClass, type ParsedSort } from '@/components/datatable/types'
import { TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'

function SortIndicator({ direction }: { direction?: 'asc' | 'desc' }) {
    if (!direction) {
        return <HugeiconsIcon icon={UnfoldMoreIcon} size={14} className="text-muted-foreground/60" />
    }

    return (
        <HugeiconsIcon
            icon={direction === 'asc' ? ArrowUp01Icon : ArrowDown01Icon}
            size={14}
            className="text-foreground"
        />
    )
}

function SortableHeader<TData extends RowData>({
    header,
    direction,
    onSort,
}: {
    header: Header<TData, unknown>
    direction?: 'asc' | 'desc'
    onSort: (field: string) => void
}) {
    const align = header.column.columnDef.meta?.align
    const label = typeof header.column.columnDef.header === 'string' ? header.column.columnDef.header : header.column.id

    return (
        <button
            type="button"
            onClick={() => onSort(header.column.id)}
            aria-label={`Urutkan ${label}`}
            className={cn(
                'inline-flex min-h-11 w-full items-center gap-1 rounded-sm transition-colors duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]',
                'hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none motion-reduce:transition-none md:min-h-10',
                align === 'right' && 'justify-end',
                align === 'center' && 'justify-center'
            )}
        >
            {flexRender(header.column.columnDef.header, header.getContext())}
            <SortIndicator direction={direction} />
        </button>
    )
}

export function TableHeaderContent<TData extends RowData>({
    table,
    activeSort,
    onSort,
}: {
    table: Table<TData>
    activeSort: ParsedSort | null
    onSort: (field: string) => void
}) {
    return (
        <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                        const direction = activeSort?.field === header.column.id ? activeSort.direction : undefined
                        const ariaSort =
                            direction === 'asc' ? 'ascending' : direction === 'desc' ? 'descending' : undefined
                        const sortable = header.column.getCanSort()

                        return (
                            <TableHead
                                key={header.id}
                                aria-sort={ariaSort}
                                className={alignClass(header.column.columnDef.meta?.align)}
                            >
                                {header.isPlaceholder ? null : sortable ? (
                                    <SortableHeader header={header} direction={direction} onSort={onSort} />
                                ) : (
                                    flexRender(header.column.columnDef.header, header.getContext())
                                )}
                            </TableHead>
                        )
                    })}
                </TableRow>
            ))}
        </TableHeader>
    )
}
