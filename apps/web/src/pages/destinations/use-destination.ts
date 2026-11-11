import { useCallback, useEffect, useState } from 'react'

import { api, apiErrorMessage } from '@/lib/api'
import type { ApiEnvelope } from '@/types/api'
import type { AdminDestinationDetail } from '@/types/destination'

export function useDestination(id: number | null) {
    const [destination, setDestination] = useState<AdminDestinationDetail | null>(null)
    const [isLoading, setIsLoading] = useState(id !== null)
    const [error, setError] = useState<string | null>(null)
    const [reloadKey, setReloadKey] = useState(0)

    useEffect(() => {
        if (id === null) {
            setDestination(null)
            setIsLoading(false)
            setError(null)
            return
        }

        let cancelled = false
        setIsLoading(true)
        setError(null)

        api.get<ApiEnvelope<AdminDestinationDetail>>(`/destinations/${id}`)
            .then((response) => {
                if (cancelled) return

                setDestination(response.data)
            })
            .catch((requestError: unknown) => {
                if (cancelled) return

                setError(
                    apiErrorMessage(
                        requestError,
                        'Gagal memuat detail destinasi. Periksa koneksi lalu coba lagi.'
                    )
                )
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false)
            })

        return () => {
            cancelled = true
        }
    }, [id, reloadKey])

    const reload = useCallback(() => setReloadKey((key) => key + 1), [])

    return { destination, isLoading, error, reload }
}
