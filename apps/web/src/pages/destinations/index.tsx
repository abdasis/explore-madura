import { useMemo, useState } from 'react'

import { Location01Icon, PlusSignIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Link } from 'react-router-dom'

import { DataTable } from '@/components/datatable/data-table'
import type { TableQuery } from '@/components/datatable/types'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { usePermissions } from '@/hooks/use-permissions'
import { DeleteDestinationDialog } from '@/pages/destinations/delete-destination-dialog'
import { destinationColumns } from '@/pages/destinations/destination-columns'
import { useDestinationCategories } from '@/pages/destinations/use-destination-categories'
import { useDestinations } from '@/pages/destinations/use-destinations'
import type { AdminDestination } from '@/types/destination'

const INITIAL_QUERY: TableQuery = {
    page: 1,
    per_page: 10,
    q: '',
    sort: null,
    filters: {},
}

const DestinationsPage = () => {
    const { hasPermission } = usePermissions()
    const canWrite = hasPermission('destination:write')

    const [query, setQuery] = useState<TableQuery>(INITIAL_QUERY)
    const [deleteTarget, setDeleteTarget] = useState<AdminDestination | null>(null)

    const { data, meta, isLoading, error, reload } = useDestinations(query)
    const { categories } = useDestinationCategories()

    const columns = useMemo(
        () => destinationColumns({ canWrite, onDelete: setDeleteTarget }),
        [canWrite]
    )

    const activeCategory = query.filters.category ?? ''

    return (
        <div className="space-y-5">
            <PageHeader
                title="Destinasi"
                description="Kelola titik wisata yang tampil di peta publik Jelajah Bangkalan."
                actions={
                    canWrite ? (
                        <Button size="sm" asChild>
                            <Link to="/destinations/new">
                                <HugeiconsIcon
                                    icon={PlusSignIcon}
                                    size={15}
                                    strokeWidth={2}
                                />
                                Tambah destinasi
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
                toolbar={
                    <Select
                        aria-label="Filter kategori"
                        value={activeCategory}
                        onChange={(event) => {
                            const category = event.target.value
                            setQuery((previous) => ({
                                ...previous,
                                page: 1,
                                filters: {
                                    ...previous.filters,
                                    category,
                                },
                            }))
                        }}
                        className="w-40"
                    >
                        <option value="">Semua kategori</option>
                        {categories.map((category) => (
                            <option key={category.slug} value={category.slug}>
                                {category.name}
                            </option>
                        ))}
                    </Select>
                }
                emptyState={
                    <EmptyState
                        icon={<HugeiconsIcon icon={Location01Icon} size={30} strokeWidth={1.6} />}
                        title="Belum ada destinasi"
                        description="Tambahkan destinasi pertama supaya titik wisata muncul di peta publik."
                        action={
                            canWrite ? (
                                <Button size="sm" asChild>
                                    <Link to="/destinations/new">Tambah destinasi</Link>
                                </Button>
                            ) : null
                        }
                    />
                }
            />

            <DeleteDestinationDialog
                destination={deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onDeleted={() => {
                    setDeleteTarget(null)
                    reload()
                }}
            />
        </div>
    )
}

export default DestinationsPage
