import { AlertCircleIcon, Location01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

type MapStatusProps = {
    isLoading: boolean
    error: string | null
    onRetry: () => void
    isEmptyResult: boolean
    onResetFilters: () => void
}

export function MapStatus({
    isLoading,
    error,
    onRetry,
    isEmptyResult,
    onResetFilters,
}: MapStatusProps) {
    if (isLoading) {
        return (
            <div className="playful-card pointer-events-none absolute bottom-6 left-1/2 w-64 -translate-x-1/2 p-4">
                <div role="status" className="space-y-2">
                    <span className="sr-only">Memuat destinasi</span>
                    <Skeleton className="h-4 w-32 bg-playful-line/70" />
                    <Skeleton className="h-3.5 w-full bg-playful-line/70" />
                    <Skeleton className="h-3.5 w-3/4 bg-playful-line/70" />
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div
                role="alert"
                className="playful-card pointer-events-auto absolute top-1/2 left-1/2 w-[min(21rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 p-5 text-center"
            >
                <HugeiconsIcon
                    icon={AlertCircleIcon}
                    size={28}
                    className="mx-auto text-playful-coral"
                />
                <p className="mt-2 font-playful-heading text-base font-semibold text-playful-ink">
                    Gagal memuat destinasi
                </p>
                <p className="mt-1 text-sm text-playful-ink/70">{error}</p>
                <Button
                    className="playful-button playful-button-secondary mt-4"
                    onClick={onRetry}
                >
                    Coba lagi
                </Button>
            </div>
        )
    }

    if (isEmptyResult) {
        return (
            <div
                role="status"
                className="playful-card pointer-events-auto absolute top-1/2 left-1/2 w-[min(21rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 p-5 text-center"
            >
                <HugeiconsIcon
                    icon={Location01Icon}
                    size={30}
                    strokeWidth={1.6}
                    className="mx-auto text-playful-indigo"
                />
                <p className="mt-2 font-playful-heading text-base font-semibold text-playful-ink">
                    Destinasi tidak ditemukan
                </p>
                <p className="mt-1 text-sm text-playful-ink/70">
                    Coba kata kunci lain atau hapus filter kategori yang aktif.
                </p>
                <Button
                    className="playful-button playful-button-secondary mt-4"
                    onClick={onResetFilters}
                >
                    Atur ulang filter
                </Button>
            </div>
        )
    }

    return null
}
