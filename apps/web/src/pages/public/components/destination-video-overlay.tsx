import { useCallback, useEffect, useRef, useState } from 'react'

import { Cancel01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { Button } from '@/components/ui/button'
import { destinationIcon } from '@/lib/destination-icons'
import { normalizeVideoEmbedUrl } from '@/lib/video'
import type { PublicDestination } from '@/types/destination'

const ENTER_DURATION_MS = 240
const EXIT_DURATION_MS = 180

const FOCUSABLE_SELECTOR =
    'a[href], button:not([disabled]), iframe, video, [tabindex]:not([tabindex="-1"])'

type DestinationVideoOverlayProps = {
    destination: PublicDestination
    returnFocusTo: HTMLElement | null
    onClose: () => void
}

export function DestinationVideoOverlay({
    destination,
    returnFocusTo,
    onClose,
}: DestinationVideoOverlayProps) {
    const dialogRef = useRef<HTMLDivElement>(null)
    const [isEntered, setIsEntered] = useState(false)
    const [isLeaving, setIsLeaving] = useState(false)
    const [reducedMotion] = useState(
        () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )

    // Fokus masuk ke dialog, lalu kembali ke marker pemicu saat overlay ditutup.
    useEffect(() => {
        const previous =
            document.activeElement instanceof HTMLElement ? document.activeElement : null
        dialogRef.current?.focus()

        return () => {
            const target = returnFocusTo ?? previous
            target?.focus()
        }
    }, [returnFocusTo])

    useEffect(() => {
        if (reducedMotion) {
            setIsEntered(true)
            return
        }

        const frame = requestAnimationFrame(() => setIsEntered(true))
        return () => cancelAnimationFrame(frame)
    }, [reducedMotion])

    const requestClose = useCallback(() => {
        if (isLeaving) return

        if (reducedMotion) {
            onClose()
            return
        }

        setIsLeaving(true)
    }, [isLeaving, reducedMotion, onClose])

    useEffect(() => {
        if (!isLeaving) return

        const timer = window.setTimeout(onClose, EXIT_DURATION_MS)
        return () => window.clearTimeout(timer)
    }, [isLeaving, onClose])

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault()
                requestClose()
                return
            }

            if (event.key !== 'Tab') return

            const node = dialogRef.current
            if (!node) return

            const focusable = Array.from(
                node.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
            ).filter((element) => element.offsetParent !== null)
            if (focusable.length === 0) return

            const first = focusable[0]
            const last = focusable[focusable.length - 1]
            const active = document.activeElement

            if (event.shiftKey && (active === first || active === node)) {
                event.preventDefault()
                last.focus()
            } else if (!event.shiftKey && active === last) {
                event.preventDefault()
                first.focus()
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [requestClose])

    const video = destination.video
    if (!video) return null

    const isOpen = isEntered && !isLeaving
    const duration = isLeaving ? EXIT_DURATION_MS : ENTER_DURATION_MS

    return (
        <div
            className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center bg-playful-ink/80 p-4"
            style={{
                opacity: reducedMotion ? 1 : isOpen ? 1 : 0,
                transition: reducedMotion ? undefined : `opacity ${duration}ms ease-out`,
            }}
            onClick={requestClose}
        >
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-label={`Video ${destination.name}`}
                tabIndex={-1}
                onClick={(event) => event.stopPropagation()}
                className="playful-panel w-full max-w-3xl overflow-hidden focus-visible:outline-none"
                style={{
                    transform: reducedMotion ? undefined : `scale(${isOpen ? 1 : 0.96})`,
                    transition: reducedMotion ? undefined : `transform ${duration}ms ease-out`,
                }}
            >
                <div className="flex items-center gap-3 p-4">
                    <div className="min-w-0 flex-1 space-y-1">
                        <h2 className="truncate font-playful-heading text-lg leading-tight font-semibold text-playful-ink">
                            {destination.name}
                        </h2>
                        <span className="playful-badge">
                            <HugeiconsIcon
                                icon={destinationIcon(destination.category.slug)}
                                size={13}
                                strokeWidth={1.8}
                                aria-hidden
                            />
                            {destination.category.name}
                        </span>
                    </div>

                    <Button
                        variant="secondary"
                        size="icon"
                        className="playful-icon-button shrink-0"
                        onClick={requestClose}
                        aria-label="Tutup video"
                    >
                        <HugeiconsIcon icon={Cancel01Icon} size={18} strokeWidth={2} />
                    </Button>
                </div>

                {video.kind === 'file' ? (
                    <video
                        src={video.url}
                        controls
                        autoPlay
                        muted
                        playsInline
                        loop
                        aria-label={`Video ${destination.name}`}
                        className="aspect-video w-full bg-playful-ink object-contain"
                    />
                ) : (
                    <div className="aspect-video w-full bg-playful-ink">
                        <iframe
                            src={normalizeVideoEmbedUrl(video.url)}
                            title={`Video ${destination.name}`}
                            className="size-full"
                            allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                            allowFullScreen
                        />
                    </div>
                )}
            </div>
        </div>
    )
}
