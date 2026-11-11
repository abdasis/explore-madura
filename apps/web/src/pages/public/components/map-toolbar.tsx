import { HugeiconsIcon } from '@hugeicons/react'
import { Search01Icon } from '@hugeicons/core-free-icons'

import { Input } from '@/components/ui/input'
import { destinationIcon } from '@/lib/destination-icons'
import type { DestinationCategory } from '@/types/destination'

type MapToolbarProps = {
    search: string
    onSearchChange: (value: string) => void
    categories: DestinationCategory[]
    activeCategory: string
    onCategoryChange: (slug: string) => void
}

export function MapToolbar({
    search,
    onSearchChange,
    categories,
    activeCategory,
    onCategoryChange,
}: MapToolbarProps) {
    return (
        <div className="playful-card w-full space-y-3 p-4 sm:w-80">
            <div className="relative">
                <HugeiconsIcon
                    icon={Search01Icon}
                    size={18}
                    className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-playful-indigo/70"
                    aria-hidden
                />
                <Input
                    type="search"
                    aria-label="Cari destinasi"
                    placeholder="Cari destinasi"
                    value={search}
                    onChange={(event) => onSearchChange(event.target.value)}
                    className="playful-input pr-3 pl-10"
                />
            </div>

            <div className="scrollbar-none flex gap-1.5 overflow-x-auto pb-0.5">
                <button
                    type="button"
                    onClick={() => onCategoryChange('')}
                    aria-pressed={activeCategory === ''}
                    className="playful-chip"
                >
                    Semua
                </button>
                {categories.map((category) => (
                    <button
                        key={category.slug}
                        type="button"
                        onClick={() => onCategoryChange(category.slug)}
                        aria-pressed={activeCategory === category.slug}
                        className="playful-chip"
                    >
                        <HugeiconsIcon
                            icon={destinationIcon(category.slug)}
                            size={14}
                            strokeWidth={1.8}
                            aria-hidden
                        />
                        {category.name}
                    </button>
                ))}
            </div>
        </div>
    )
}
