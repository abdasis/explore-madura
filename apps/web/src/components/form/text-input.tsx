import { useId } from 'react'

import { Field, fieldDescriptionId } from '@/components/form/field'
import { Input } from '@/components/ui/input'

type TextInputProps = {
    id?: string
    label: string
    value: string
    onChange: (value: string) => void
    type?: 'text' | 'tel' | 'email' | 'password'
    placeholder?: string
    hint?: string
    error?: string
    disabled?: boolean
    required?: boolean
    name?: string
    inputMode?: 'text' | 'numeric' | 'decimal' | 'tel' | 'email'
    autoComplete?: string
    maxLength?: number
    className?: string
    testId?: string
}

export function TextInput({
    id,
    label,
    value,
    onChange,
    type = 'text',
    placeholder,
    hint,
    error,
    disabled,
    required,
    name,
    inputMode,
    autoComplete,
    maxLength,
    className,
    testId,
}: TextInputProps) {
    const generatedId = useId()
    const inputId = id ?? generatedId
    const describedBy = error || hint ? fieldDescriptionId(inputId) : undefined

    return (
        <Field id={inputId} label={label} hint={hint} error={error} className={className}>
            <Input
                id={inputId}
                name={name}
                data-testid={testId}
                type={type}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                inputMode={inputMode}
                autoComplete={autoComplete}
                maxLength={maxLength}
                aria-invalid={error ? true : undefined}
                aria-describedby={describedBy}
                disabled={disabled}
                required={required}
            />
        </Field>
    )
}
