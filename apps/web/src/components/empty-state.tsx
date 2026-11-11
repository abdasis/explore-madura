import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/utils'

type EmptyStateProps = {
    title: string
    description?: string
    icon?: ReactNode
    action?: ReactNode
    className?: ComponentProps<'div'>['className']
}

export function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
    return (
        <div className={cn('flex flex-col items-center justify-center gap-1.5 px-4 py-10 text-center', className)}>
            {icon ? <div className="mb-1 text-muted-foreground">{icon}</div> : null}
            <p className="text-sm font-medium">{title}</p>
            {description ? <p className="max-w-sm text-sm text-muted-foreground">{description}</p> : null}
            {action ? <div className="pt-2">{action}</div> : null}
        </div>
    )
}
