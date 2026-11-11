import type { ReactNode } from 'react'

import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

type FieldProps = {
    id: string
    label: string
    hint?: string
    error?: string
    className?: string
    children: ReactNode
}

export function fieldDescriptionId(id: string): string {
    return `${id}-description`
}

export function Field({ id, label, hint, error, className, children }: FieldProps) {
    const descriptionId = fieldDescriptionId(id)

    return (
        <div className={cn('space-y-1.5', className)}>
            <Label htmlFor={id} className="text-[13px] font-medium">{label}</Label>
            {children}
            {error ? (
                <p id={descriptionId} role="alert" className="text-xs text-destructive">
                    {error}
                </p>
            ) : hint ? (
                <p id={descriptionId} className="text-xs text-muted-foreground">
                    {hint}
                </p>
            ) : null}
        </div>
    )
}
