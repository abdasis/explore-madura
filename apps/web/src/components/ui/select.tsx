import * as React from 'react'

import { cn } from '@/lib/utils'

function Select({ className, children, ...props }: React.ComponentProps<'select'>) {
    return (
        <select
            data-slot="select"
            className={cn(
                'h-8 w-full min-w-0 rounded-[6px] border border-input bg-transparent px-2.5 text-base transition-colors duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] outline-none',
                'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
                'aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40',
                'disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 dark:bg-input/30 dark:disabled:bg-input/80',
                'md:text-sm',
                className
            )}
            {...props}
        >
            {children}
        </select>
    )
}

export { Select }
