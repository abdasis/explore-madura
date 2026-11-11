import { useCallback, useEffect, useState } from 'react'

import type { TableQuery } from '@/components/datatable/types'
import { api, apiErrorMessage, buildQuery } from '@/lib/api'
import type { Paginated, PaginationMeta } from '@/types/api'
import type { AdminDestination } from '@/types/destination'

const INITIAL_META: PaginationMeta = {
    page: 1,
    per_page: 10,
    total: 0,
    total_pages: 0,
}

export function useDestinations(query: TableQuery) {
    const [data, setData] = useState<AdminDestination[]>([])
    const [meta, setMeta] = useState<PaginationMeta>(INITIAL_META)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [reloadKey, setReloadKey] = useState(0)

    useEffect(() => {
        let cancelled = false
        setIsLoading(true)
        setError(null)

        const path = `/destinations${buildQuery({
            page: query.page,
            per_page: query.per_page,
            q: query.q,
            category: query.filters.category,
        })}`

        api.get<Paginated<AdminDestination>>(path)
            .then((response) => {
                if (cancelled) return

                setData(response.data)
                setMeta(response.meta)
            })
            .catch((requestError: unknown) => {
                if (cancelled) return

                setError(
                    apiErrorMessage(
                        requestError,
                        'Gagal memuat daftar destinasi. Periksa koneksi lalu coba lagi.'
                    )
                )
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false)
            })

        return () => {
            cancelled = true
        }
    }, [query, reloadKey])

    const reload = useCallback(() => setReloadKey((key) => key + 1), [])

    return { data, meta, isLoading, error, reload }
}
