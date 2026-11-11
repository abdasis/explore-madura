import { useCallback, useEffect, useState } from 'react'

import { api, apiErrorMessage } from '@/lib/api'
import type { ApiEnvelope } from '@/types/api'
import type { DestinationCategoryOption } from '@/types/destination'

export function useDestinationCategories() {
    const [categories, setCategories] = useState<DestinationCategoryOption[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [reloadKey, setReloadKey] = useState(0)

    useEffect(() => {
        let cancelled = false
        setIsLoading(true)
        setError(null)

        api.get<ApiEnvelope<DestinationCategoryOption[]>>('/public/categories')
            .then((response) => {
                if (cancelled) return

                setCategories(response.data)
            })
            .catch((requestError: unknown) => {
                if (cancelled) return

                setError(
                    apiErrorMessage(
                        requestError,
                        'Gagal memuat kategori destinasi. Periksa koneksi lalu coba lagi.'
                    )
                )
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false)
            })

        return () => {
            cancelled = true
        }
    }, [reloadKey])

    const reload = useCallback(() => setReloadKey((key) => key + 1), [])

    return { categories, isLoading, error, reload }
}
