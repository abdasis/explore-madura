import { useCallback, useEffect, useState } from 'react'

import { api, apiErrorMessage } from '@/lib/api'
import type { ApiEnvelope } from '@/types/api'
import type { PublicPost } from '@/types/post'

type PublicPostsState = {
    posts: PublicPost[]
    isLoading: boolean
    error: string | null
}

export function usePublicPosts() {
    const [state, setState] = useState<PublicPostsState>({
        posts: [],
        isLoading: true,
        error: null,
    })
    const [reloadKey, setReloadKey] = useState(0)

    useEffect(() => {
        let cancelled = false
        setState((previous) => ({ ...previous, isLoading: true, error: null }))

        api.get<ApiEnvelope<PublicPost[]>>('/public/posts')
            .then((response) => {
                if (cancelled) return

                setState({ posts: response.data, isLoading: false, error: null })
            })
            .catch((error: unknown) => {
                if (cancelled) return

                setState({
                    posts: [],
                    isLoading: false,
                    error: apiErrorMessage(
                        error,
                        'Gagal memuat artikel. Periksa koneksi lalu coba lagi.'
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
