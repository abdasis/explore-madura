import { useMemo, useState } from 'react'

import { News01Icon, PlusSignIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Link } from 'react-router-dom'

import { DataTable } from '@/components/datatable/data-table'
import type { TableQuery } from '@/components/datatable/types'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { usePermissions } from '@/hooks/use-permissions'
import { postColumns } from '@/pages/posts/columns'
import { DeletePostDialog } from '@/pages/posts/delete-dialog'
import { usePosts } from '@/pages/posts/use-posts'
import type { AdminPost } from '@/types/post'

const INITIAL_QUERY: TableQuery = {
    page: 1,
    per_page: 10,
    q: '',
    sort: null,
    filters: {},
}

const PostsPage = () => {
    const { hasPermission } = usePermissions()
    const canWrite = hasPermission('blog:write')

    const [query, setQuery] = useState<TableQuery>(INITIAL_QUERY)
    const [deleteTarget, setDeleteTarget] = useState<AdminPost | null>(null)

    const { data, meta, isLoading, error, reload } = usePosts(query)

    const columns = useMemo(
        () => postColumns({ canWrite, onDelete: setDeleteTarget }),
        [canWrite]
    )

    return (
        <div className="space-y-5">
            <PageHeader
                title="Blog"
                description="Kelola artikel fakta unik Madura yang tampil di halaman blog publik."
                actions={
                    canWrite ? (
                        <Button size="sm" asChild>
                            <Link to="/posts/new">
                                <HugeiconsIcon icon={PlusSignIcon} size={15} strokeWidth={2} />
                                Tulis artikel
                            </Link>
                        </Button>
                    ) : null
                }
            />

            <DataTable
                columns={columns}
                data={data}
                meta={meta}
                query={query}
                onQueryChange={setQuery}
                isLoading={isLoading}
                error={error}
                onRetry={reload}
                emptyState={
                    <EmptyState
                        icon={<HugeiconsIcon icon={News01Icon} size={30} strokeWidth={1.6} />}
                        title="Belum ada artikel"
                        description="Tulis artikel pertama supaya cerita fakta unik Madura muncul di halaman blog publik."
                        action={
                            canWrite ? (
                                <Button size="sm" asChild>
                                    <Link to="/posts/new">Tulis artikel</Link>
                                </Button>
                            ) : null
                        }
                    />
                }
            />

            <DeletePostDialog
                post={deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onDeleted={() => {
                    setDeleteTarget(null)
                    reload()
                }}
            />
        </div>
    )
}

export default PostsPage
