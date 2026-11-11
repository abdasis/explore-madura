import type { PropsWithChildren } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { ErrorState } from '@/components/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/lib/auth'

function AuthLoading() {
    return (
        <div className="space-y-6 px-4 py-6 md:px-6">
            <div className="space-y-2">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-72" />
            </div>
            <Skeleton className="h-40 w-full rounded-xl" />
        </div>
    )
}

export function RequireAuth({ children }: PropsWithChildren) {
    const { status, user, refresh } = useAuth()
    const { pathname } = useLocation()

    if (status === 'loading') return <AuthLoading />

    if (status === 'error') {
        return (
            <main className="grid min-h-full place-items-center px-4">
                <ErrorState
                    title="Gagal memeriksa sesi"
                    description="Server tidak dapat dihubungi. Periksa koneksi lalu coba lagi."
                    onRetry={() => void refresh()}
                />
            </main>
        )
    }

    if (!user) return <Navigate to="/login" replace state={{ from: pathname }} />

    return <>{children}</>
}
