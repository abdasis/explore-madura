import { useCallback, useEffect, useState } from 'react'

import { api, apiErrorMessage } from '@/lib/api'
import type { ApiEnvelope } from '@/types/api'
import type { AdminPost } from '@/types/post'

export function usePost(id: number | null) {
    const [post, setPost] = useState<AdminPost | null>(null)
    const [isLoading, setIsLoading] = useState(id !== null)
    const [error, setError] = useState<string | null>(null)
    const [reloadKey, setReloadKey] = useState(0)

    useEffect(() => {
        if (id === null) {
            setPost(null)
            setIsLoading(false)
            setError(null)
            return
        }

        let cancelled = false
        setIsLoading(true)
        setError(null)

        api.get<ApiEnvelope<AdminPost>>(`/posts/${id}`)
            .then((response) => {
                if (cancelled) return

                setPost(response.data)
            })
            .catch((requestError: unknown) => {
                if (cancelled) return

                setError(
                    apiErrorMessage(
                        requestError,
                        'Gagal memuat detail artikel. Periksa koneksi lalu coba lagi.'
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

    return { post, isLoading, error, reload }
}
