import { Calendar03Icon, Delete02Icon, PencilEdit01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import type { ColumnDef } from '@tanstack/react-table'
import { Link } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/date'
import type { AdminPost } from '@/types/post'

type PostColumnOptions = {
    canWrite: boolean
    onDelete: (post: AdminPost) => void
}

export function postColumns({ canWrite, onDelete }: PostColumnOptions): ColumnDef<AdminPost>[] {
    const columns: ColumnDef<AdminPost>[] = [
        {
            accessorKey: 'title',
            header: 'Judul',
            enableSorting: false,
            cell: ({ row }) => {
                const post = row.original

                return (
                    <div className="max-w-[320px] space-y-0.5">
                        <p className="truncate text-[13px] font-medium">{post.title}</p>
                        <p className="truncate text-xs text-muted-foreground">/{post.slug}</p>
                    </div>
                )
            },
        },
        {
            id: 'tag',
            header: 'Tag',
            enableSorting: false,
            cell: ({ row }) => <Badge variant="outline">{row.original.tag}</Badge>,
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
            id: 'published_at',
            header: 'Tanggal terbit',
            enableSorting: false,
            cell: ({ row }) => {
                const post = row.original

                if (!post.is_published || !post.published_at) {
                    return <span className="text-muted-foreground">—</span>
                }

                return (
                    <span className="inline-flex items-center gap-1 text-muted-foreground tabular-nums">
                        <HugeiconsIcon icon={Calendar03Icon} size={14} aria-hidden />
                        {formatDate(post.published_at)}
                    </span>
                )
            },
        },
    ]

    if (canWrite) {
        columns.push({
            id: 'actions',
            header: '',
            enableSorting: false,
            cell: ({ row }) => {
                const post = row.original

                return (
                    <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon-sm" asChild>
                            <Link to={`/posts/${post.id}/edit`} aria-label={`Ubah ${post.title}`}>
                                <HugeiconsIcon icon={PencilEdit01Icon} size={15} />
                            </Link>
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-destructive hover:text-destructive"
                            aria-label={`Hapus ${post.title}`}
                            onClick={() => onDelete(post)}
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
