import { useCallback, useEffect, useState } from 'react'

import { api, ApiError, apiErrorMessage } from '@/lib/api'
import type { ApiEnvelope } from '@/types/api'
import type { PublicPostDetail } from '@/types/post'

type PublicPostState = {
    post: PublicPostDetail | null
    isLoading: boolean
    error: string | null
    notFound: boolean
}

export function usePublicPost(slug: string) {
    const [state, setState] = useState<PublicPostState>({
        post: null,
        isLoading: true,
        error: null,
        notFound: false,
    })
    const [reloadKey, setReloadKey] = useState(0)

    useEffect(() => {
        if (slug === '') {
            setState({ post: null, isLoading: false, error: null, notFound: true })
            return
        }

        let cancelled = false
        setState({ post: null, isLoading: true, error: null, notFound: false })

        api.get<ApiEnvelope<PublicPostDetail>>(`/public/posts/${encodeURIComponent(slug)}`)
            .then((response) => {
                if (cancelled) return

                setState({ post: response.data, isLoading: false, error: null, notFound: false })
            })
            .catch((requestError: unknown) => {
                if (cancelled) return

                if (requestError instanceof ApiError && requestError.status === 404) {
                    setState({ post: null, isLoading: false, error: null, notFound: true })
                    return
                }

                setState({
                    post: null,
                    isLoading: false,
                    notFound: false,
                    error: apiErrorMessage(
                        requestError,
                        'Gagal memuat artikel. Periksa koneksi lalu coba lagi.'
                    ),
                })
            })

        return () => {
            cancelled = true
        }
    }, [slug, reloadKey])

    const reload = useCallback(() => setReloadKey((key) => key + 1), [])

    return { ...state, reload }
}
