import { createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'

import type { IconSvgElement } from '@hugeicons/react'
import { MarkerHoverCard, type MarkerPreview } from '@/lib/marker-hover-card'

export type { MarkerPreview }

export type IconMarkerElement = {
    element: HTMLButtonElement
    root: Root
}

export function createIconMarker(
    icon: IconSvgElement,
    label: string,
    className: string,
    preview: MarkerPreview | null = null
): IconMarkerElement {
    const element = document.createElement('button')
    element.type = 'button'
    element.className = className
    element.setAttribute('aria-label', label)
    element.setAttribute('aria-pressed', 'false')

    const root = createRoot(element)
    root.render(createElement(MarkerHoverCard, { icon, preview }))

    return { element, root }
}
