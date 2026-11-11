import { useEffect, useRef, useState } from 'react'

import {
    CallIcon,
    Cancel01Icon,
    Clock01Icon,
    Image01Icon,
    MapPinIcon,
    StarIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { Button } from '@/components/ui/button'
import { destinationIcon } from '@/lib/destination-icons'
import { formatPrice, formatRating } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { PublicDestination } from '@/types/destination'

const STAR_POSITIONS = [0, 1, 2, 3, 4]

type DestinationDetailPanelProps = {
    destination: PublicDestination | null
    onClose: () => void
}

export function DestinationDetailPanel({
    destination,
    onClose,
}: DestinationDetailPanelProps) {
    const panelRef = useRef<HTMLElement>(null)
    const [activePhotoId, setActivePhotoId] = useState<number | null>(null)

    useEffect(() => {
        if (!destination) {
            setActivePhotoId(null)
            return
        }

        const previous =
            document.activeElement instanceof HTMLElement ? document.activeElement : null

        const cover =
            destination.photos.find((photo) => photo.is_cover) ??
            destination.photos[0] ??
            null
        setActivePhotoId(cover ? cover.id : null)
        panelRef.current?.focus()

        return () => previous?.focus()
    }, [destination])

    if (!destination) return null

    const activePhoto =
        destination.photos.find((photo) => photo.id === activePhotoId) ??
        destination.photos.find((photo) => photo.is_cover) ??
        destination.photos[0] ??
        null

    return (
        <aside
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-label={`Detail ${destination.name}`}
            className="playful-panel pointer-events-auto absolute inset-x-0 bottom-0 z-20 flex max-md:max-h-[70vh] flex-col overflow-hidden focus-visible:outline-none md:top-20 md:right-4 md:bottom-4 md:left-auto md:w-[420px]"
        >
            <div className="relative shrink-0 bg-playful-canvas">
                {activePhoto ? (
                    <img
                        src={activePhoto.url}
                        alt={activePhoto.caption || destination.name}
                        className="aspect-[16/10] w-full object-cover"
                    />
                ) : (
                    <div className="flex aspect-[16/10] w-full flex-col items-center justify-center gap-2 text-playful-indigo/60">
                        <HugeiconsIcon
                            icon={Image01Icon}
                            size={34}
                            strokeWidth={1.6}
                            aria-hidden
                        />
                        <span className="font-playful-heading text-sm font-semibold">
                            Belum ada foto
                        </span>
                    </div>
                )}

                <Button
                    variant="secondary"
                    size="icon"
                    className="playful-icon-button absolute top-3 right-3"
                    onClick={onClose}
                    aria-label="Tutup detail destinasi"
                >
                    <HugeiconsIcon icon={Cancel01Icon} size={18} strokeWidth={2} />
                </Button>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
                {destination.photos.length > 1 ? (
                    <div className="scrollbar-none flex gap-2 overflow-x-auto pb-1">
                        {destination.photos.map((photo, index) => (
                            <button
                                key={photo.id}
                                type="button"
                                onClick={() => setActivePhotoId(photo.id)}
                                aria-label={`Lihat foto ${index + 1}`}
                                aria-pressed={activePhoto?.id === photo.id}
                                className={cn(
                                    'h-14 w-20 shrink-0 overflow-hidden rounded-playful-control border-2 transition-opacity duration-150',
                                    activePhoto?.id === photo.id
                                        ? 'border-playful-indigo opacity-100'
                                        : 'border-playful-line opacity-75 hover:opacity-100'
                                )}
                            >
                                <img
                                    src={photo.url}
                                    alt=""
                                    loading="lazy"
                                    className="size-full object-cover"
                                />
                            </button>
                        ))}
                    </div>
                ) : null}

                {activePhoto?.caption ? (
                    <p className="text-sm text-playful-ink/60">{activePhoto.caption}</p>
                ) : null}

                <div className="space-y-2">
                    <h2 className="font-playful-heading text-2xl leading-tight font-semibold tracking-tight text-playful-ink">
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

                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <span
                        role="img"
                        aria-label={`Rating ${formatRating(destination.rating)} dari 5`}
                        className="inline-flex items-center gap-0.5"
                    >
                        {STAR_POSITIONS.map((position) => (
                            <HugeiconsIcon
                                key={`star-${position}`}
                                icon={StarIcon}
                                size={16}
                                className={
                                    position < Math.round(destination.rating)
                                        ? 'text-playful-sunshine'
                                        : 'text-playful-ink/15'
                                }
                                aria-hidden
                            />
                        ))}
                        <span className="ml-1 font-playful-heading text-[15px] font-semibold tabular-nums text-playful-ink">
                            {formatRating(destination.rating)}
                        </span>
                    </span>

                    <span
                        className={cn(
                            'font-playful-heading text-lg font-semibold tabular-nums',
                            destination.is_free ? 'text-playful-green' : 'text-playful-ink'
                        )}
                    >
                        {formatPrice(destination)}
                    </span>
                </div>

                <div className="space-y-3 text-[15px] leading-[1.6] text-playful-ink">
                    {destination.address ? (
                        <div className="flex items-start gap-2.5">
                            <HugeiconsIcon
                                icon={MapPinIcon}
                                size={16}
                                strokeWidth={2}
                                className="mt-0.5 shrink-0 text-playful-indigo"
                                aria-hidden
                            />
                            <div>
                                <p className="text-xs font-semibold tracking-wide text-playful-ink/60">
                                    Alamat
                                </p>
                                <p>{destination.address}</p>
                            </div>
                        </div>
                    ) : null}

                    {destination.latitude != null && destination.longitude != null ? (
                        <a
                            href={`https://www.google.com/maps/search/?api=1&query=${destination.latitude},${destination.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-full bg-playful-indigo/10 px-3 py-1.5 text-xs font-semibold text-playful-indigo transition hover:bg-playful-indigo/20"
                        >
                            <HugeiconsIcon
                                icon={MapPinIcon}
                                size={14}
                                strokeWidth={2}
                                aria-hidden
                            />
                            Lihat di Google Maps
                        </a>
                    ) : null}

                    {destination.opening_hours ? (
                        <div className="flex items-start gap-2.5">
                            <HugeiconsIcon
                                icon={Clock01Icon}
                                size={16}
                                strokeWidth={2}
                                className="mt-0.5 shrink-0 text-playful-indigo"
                                aria-hidden
                            />
                            <div>
                                <p className="text-xs font-semibold tracking-wide text-playful-ink/60">
                                    Jam buka
                                </p>
                                <p>{destination.opening_hours}</p>
                            </div>
                        </div>
                    ) : null}

                    {destination.contact ? (
                        <div className="flex items-start gap-2.5">
                            <HugeiconsIcon
                                icon={CallIcon}
                                size={16}
                                strokeWidth={2}
                                className="mt-0.5 shrink-0 text-playful-indigo"
                                aria-hidden
                            />
                            <div>
                                <p className="text-xs font-semibold tracking-wide text-playful-ink/60">
                                    Kontak
                                </p>
                                <p>{destination.contact}</p>
                            </div>
                        </div>
                    ) : null}
                </div>

                {destination.facilities ? (
                    <div className="space-y-1">
                        <p className="text-xs font-semibold tracking-wide text-playful-ink/60">
                            Fasilitas
                        </p>
                        <p className="text-[15px] leading-[1.6] text-playful-ink">
                            {destination.facilities}
                        </p>
                    </div>
                ) : null}

                {destination.description ? (
                    <div className="space-y-1">
                        <p className="text-xs font-semibold tracking-wide text-playful-ink/60">
                            Tentang destinasi
                        </p>
                        <p className="text-[15px] leading-[1.6] whitespace-pre-line text-playful-ink">
                            {destination.description}
                        </p>
                    </div>
                ) : null}
            </div>
        </aside>
    )
}
