import { useCallback, useEffect, useState } from 'react'

import { api, apiErrorMessage } from '@/lib/api'
import type { ApiEnvelope } from '@/types/api'
import type { PublicDestination } from '@/types/destination'

type PublicDestinationsState = {
    destinations: PublicDestination[]
    isLoading: boolean
    error: string | null
}

export function usePublicDestinations() {
    const [state, setState] = useState<PublicDestinationsState>({
        destinations: [],
        isLoading: true,
        error: null,
    })
    const [reloadKey, setReloadKey] = useState(0)

    useEffect(() => {
        let cancelled = false
        setState((previous) => ({ ...previous, isLoading: true, error: null }))

        api.get<ApiEnvelope<PublicDestination[]>>('/public/destinations')
            .then((response) => {
                if (cancelled) return

                setState({ destinations: response.data, isLoading: false, error: null })
            })
            .catch((error: unknown) => {
                if (cancelled) return

                setState({
                    destinations: [],
                    isLoading: false,
                    error: apiErrorMessage(
                        error,
                        'Gagal memuat destinasi. Periksa koneksi lalu coba lagi.'
                    ),
                })
            })

        return () => {
            cancelled = true
        }
    }, [reloadKey])

    const reload = useCallback(() => setReloadKey((key) => key + 1), [])

    return { ...state, reload }
}
