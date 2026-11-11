import {
    Beach02Icon,
    Castle01Icon,
    Location01Icon,
    Mosque01Icon,
    Restaurant01Icon,
    TreesIcon,
} from '@hugeicons/core-free-icons'
import type { IconSvgElement } from '@hugeicons/react'

const categoryIcons: Record<string, IconSvgElement> = {
    beach: Beach02Icon,
    religious: Mosque01Icon,
    nature: TreesIcon,
    culture: Castle01Icon,
    culinary: Restaurant01Icon,
}

export const fallbackDestinationIcon: IconSvgElement = Location01Icon

export function destinationIcon(categorySlug: string): IconSvgElement {
    return categoryIcons[categorySlug] ?? fallbackDestinationIcon
}
