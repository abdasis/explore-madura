import { useId } from 'react'

import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

type CheckboxInputProps = {
    id?: string
    label: string
    description?: string
    checked: boolean
    onChange: (checked: boolean) => void
    disabled?: boolean
    className?: string
}

export function CheckboxInput({
    id,
    label,
    description,
    checked,
    onChange,
    disabled,
    className,
}: CheckboxInputProps) {
    const generatedId = useId()
    const inputId = id ?? generatedId

    return (
        <div className={cn('flex items-start gap-2.5', className)}>
            <Checkbox
                id={inputId}
                checked={checked}
                onCheckedChange={(value) => onChange(value === true)}
                disabled={disabled}
                className="mt-0.5"
            />
            <div className="space-y-0.5">
                <Label htmlFor={inputId} className="text-[13px] font-medium">
                    {label}
                </Label>
                {description ? (
                    <p className="text-xs leading-[1.5] text-muted-foreground">{description}</p>
                ) : null}
            </div>
        </div>
    )
}
