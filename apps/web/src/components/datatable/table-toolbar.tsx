import { HugeiconsIcon } from '@hugeicons/react'
import { Loading03Icon, Search01Icon } from '@hugeicons/core-free-icons'
import type { ReactNode } from 'react'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type TableToolbarProps = {
    search: string
    onSearchChange: (value: string) => void
    isRefreshing: boolean
    toolbar?: ReactNode
    searchable?: boolean
}

export function TableToolbar({
    search,
    onSearchChange,
    isRefreshing,
    toolbar,
    searchable = true,
}: TableToolbarProps) {
    return (
        <div
            className={cn(
                'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
                !searchable && 'sm:justify-end'
            )}
        >
            {searchable ? (
                <div className="relative w-full sm:max-w-xs">
                    <HugeiconsIcon
                        icon={Search01Icon}
                        size={16}
                        className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground"
                    />
                    <Input
                        type="search"
                        aria-label="Cari"
                        placeholder="Cari data"
                        value={search}
                        onChange={(event) => onSearchChange(event.target.value)}
                        className="pl-8"
                    />
                </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
                {toolbar}
                {isRefreshing ? (
                    <span role="status" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <HugeiconsIcon
                            icon={Loading03Icon}
                            size={14}
                            className="animate-spin motion-reduce:animate-none"
                        />
                        Memuat
                    </span>
                ) : null}
            </div>
        </div>
    )
}
