import { HugeiconsIcon } from '@hugeicons/react'
import { AlertCircleIcon } from '@hugeicons/core-free-icons'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type ErrorStateProps = {
    title?: string
    description?: string
    onRetry?: () => void
    retryLabel?: string
    className?: string
}

export function ErrorState({
    title = 'Gagal memuat data',
    description = 'Terjadi kendala saat mengambil data. Coba lagi ya.',
    onRetry,
    retryLabel = 'Coba lagi',
    className,
}: ErrorStateProps) {
    return (
        <div
            role="alert"
            className={cn('flex flex-col items-center justify-center gap-2 px-4 py-10 text-center', className)}
        >
            <HugeiconsIcon icon={AlertCircleIcon} size={22} className="text-destructive" />
            <p className="text-sm font-medium">{title}</p>
            <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
            {onRetry ? (
                <Button variant="outline" size="sm" className="mt-1" onClick={onRetry}>
                    {retryLabel}
                </Button>
            ) : null}
        </div>
    )
}
