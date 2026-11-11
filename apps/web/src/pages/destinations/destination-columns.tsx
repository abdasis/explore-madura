import { HugeiconsIcon } from '@hugeicons/react'
import { Delete02Icon, Image01Icon, PencilEdit01Icon, StarIcon } from '@hugeicons/core-free-icons'
import type { ColumnDef } from '@tanstack/react-table'
import { Link } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { destinationIcon } from '@/lib/destination-icons'
import { formatPrice, formatRating } from '@/lib/format'
import type { AdminDestination } from '@/types/destination'

type DestinationColumnOptions = {
    canWrite: boolean
    onDelete: (destination: AdminDestination) => void
}

export function destinationColumns({
    canWrite,
    onDelete,
}: DestinationColumnOptions): ColumnDef<AdminDestination>[] {
    const columns: ColumnDef<AdminDestination>[] = [
        {
            id: 'cover',
            header: 'Cover',
            enableSorting: false,
            cell: ({ row }) => {
                const destination = row.original

                return destination.cover ? (
                    <img
                        src={destination.cover.url}
                        alt=""
                        loading="lazy"
                        className="size-9 rounded-md border border-border/60 object-cover"
                    />
                ) : (
                    <span
                        aria-hidden
                        className="grid size-9 place-items-center rounded-md bg-muted text-muted-foreground"
                    >
                        <HugeiconsIcon
                            icon={destinationIcon(destination.category.slug)}
                            size={18}
                            strokeWidth={1.8}
                        />
                    </span>
                )
            },
        },
        {
            accessorKey: 'name',
            header: 'Nama',
            enableSorting: false,
            cell: ({ row }) => {
                const destination = row.original

                return (
                    <div className="max-w-[240px] space-y-0.5">
                        <p className="truncate text-[13px] font-medium">{destination.name}</p>
                        {destination.address ? (
                            <p className="truncate text-xs text-muted-foreground">
                                {destination.address}
                            </p>
                        ) : null}
                    </div>
                )
            },
        },
        {
            id: 'category',
            header: 'Kategori',
            enableSorting: false,
            cell: ({ row }) => (
                <Badge variant="outline">
                    <HugeiconsIcon
                        icon={destinationIcon(row.original.category.slug)}
                        size={12}
                        strokeWidth={1.8}
                        aria-hidden
                    />
                    {row.original.category.name}
                </Badge>
            ),
        },
        {
            id: 'rating',
            header: 'Rating',
            enableSorting: false,
            cell: ({ row }) => (
                <span className="inline-flex items-center gap-1 tabular-nums">
                    <HugeiconsIcon
                        icon={StarIcon}
                        size={14}
                        className="text-warning"
                        aria-hidden
                    />
                    {formatRating(row.original.rating)}
                </span>
            ),
        },
        {
            id: 'price',
            header: 'Harga',
            enableSorting: false,
            cell: ({ row }) => (
                <span className="tabular-nums">{formatPrice(row.original)}</span>
            ),
        },
        {
            id: 'status',
            header: 'Status',
            enableSorting: false,
            cell: ({ row }) =>
                row.original.is_published ? (
                    <Badge variant="success">Terbit</Badge>
                ) : (
                    <Badge variant="secondary">Draf</Badge>
                ),
        },
        {
            id: 'photo_count',
            header: 'Jumlah foto',
            enableSorting: false,
            cell: ({ row }) => (
                <span className="inline-flex items-center gap-1 text-muted-foreground tabular-nums">
                    <HugeiconsIcon icon={Image01Icon} size={14} aria-hidden />
                    {row.original.photo_count}
                </span>
            ),
        },
    ]

    if (canWrite) {
        columns.push({
            id: 'actions',
            header: '',
            enableSorting: false,
            cell: ({ row }) => {
                const destination = row.original

                return (
                    <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon-sm" asChild>
                            <Link
                                to={`/destinations/${destination.id}/edit`}
                                aria-label={`Ubah ${destination.name}`}
                            >
                                <HugeiconsIcon icon={PencilEdit01Icon} size={15} />
                            </Link>
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-destructive hover:text-destructive"
                            aria-label={`Hapus ${destination.name}`}
                            onClick={() => onDelete(destination)}
                        >
                            <HugeiconsIcon icon={Delete02Icon} size={15} />
                        </Button>
                    </div>
                )
            },
        })
    }

    return columns
}
