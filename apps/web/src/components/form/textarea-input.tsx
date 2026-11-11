import { useId } from 'react'

import { Field, fieldDescriptionId } from '@/components/form/field'
import { Textarea } from '@/components/ui/textarea'

type TextareaInputProps = {
    id?: string
    label: string
    value: string
    onChange: (value: string) => void
    placeholder?: string
    hint?: string
    error?: string
    disabled?: boolean
    required?: boolean
    name?: string
    rows?: number
    maxLength?: number
    testId?: string
    className?: string
}

export function TextareaInput({
    id,
    label,
    value,
    onChange,
    placeholder,
    hint,
    error,
    disabled,
    required,
    name,
    rows,
    maxLength,
    testId,
    className,
}: TextareaInputProps) {
    const generatedId = useId()
    const inputId = id ?? generatedId
    const describedBy = error || hint ? fieldDescriptionId(inputId) : undefined

    return (
        <Field id={inputId} label={label} hint={hint} error={error} className={className}>
            <Textarea
                id={inputId}
                name={name}
                data-testid={testId}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                aria-invalid={error ? true : undefined}
                aria-describedby={describedBy}
                disabled={disabled}
                required={required}
                rows={rows}
                maxLength={maxLength}
            />
        </Field>
    )
}
