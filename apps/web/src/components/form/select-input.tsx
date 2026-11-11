import { useId } from 'react'

import { Field, fieldDescriptionId } from '@/components/form/field'
import { Select } from '@/components/ui/select'

type SelectOption = {
    value: string
    label: string
}

type SelectInputProps = {
    id?: string
    label: string
    value: string
    onChange: (value: string) => void
    options: SelectOption[]
    placeholder?: string
    hint?: string
    error?: string
    disabled?: boolean
    required?: boolean
    name?: string
    className?: string
}

export function SelectInput({
    id,
    label,
    value,
    onChange,
    options,
    placeholder,
    hint,
    error,
    disabled,
    required,
    name,
    className,
}: SelectInputProps) {
    const generatedId = useId()
    const inputId = id ?? generatedId
    const describedBy = error || hint ? fieldDescriptionId(inputId) : undefined

    return (
        <Field id={inputId} label={label} hint={hint} error={error} className={className}>
            <Select
                id={inputId}
                name={name}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                aria-invalid={error ? true : undefined}
                aria-describedby={describedBy}
                disabled={disabled}
                required={required}
            >
                {placeholder ? <option value="">{placeholder}</option> : null}
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </Select>
        </Field>
    )
}
