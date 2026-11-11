import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'

import { usePageActions } from '@/components/page-actions'

/**
 * Flat section grouping: title + description, no card wrapper.
 * Actions dirender ke slot header AppLayout bila tersedia; selain itu inline.
 */
export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
    const pageActions = usePageActions()

    let renderedActions = actions
    if (actions && pageActions) {
        renderedActions = pageActions.element ? createPortal(actions, pageActions.element) : null
    }

    return (
        <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight text-balance">{title}</h1>
                {description ? (
                    <p className="text-[13px] leading-[1.54] text-muted-foreground text-pretty">
                        {description}
                    </p>
                ) : null}
            </div>
            {renderedActions}
        </div>
    )
}
