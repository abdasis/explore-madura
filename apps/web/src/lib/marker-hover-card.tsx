import type { IconSvgElement } from '@hugeicons/react'
import { HugeiconsIcon } from '@hugeicons/react'

const PHOTO_SLOT_COUNT = 3

export type MarkerPreview = {
    name: string
    photoUrls: string[]
    fallbackIcon: IconSvgElement
}

type MarkerHoverCardProps = {
    icon: IconSvgElement
    preview: MarkerPreview | null
}

/**
 * Isi marker peta publik: ikon marker + kartu preview yang muncul saat marker
 * di-hover atau difokuskan lewat keyboard. Kartu murni visual (aria-hidden,
 * pointer-events-none) agar tidak mengganggu klik dan flyTo.
 */
export const MarkerHoverCard = ({ icon, preview }: MarkerHoverCardProps) => (
    <>
        <HugeiconsIcon icon={icon} size={18} strokeWidth={1.8} aria-hidden />

        {preview ? (
            <span className="marker-hover-card" aria-hidden="true">
                <span className="marker-hover-card-surface">
                    <span className="marker-hover-card-name">{preview.name}</span>
                    <span className="marker-hover-card-photos">
                        {Array.from({ length: PHOTO_SLOT_COUNT }, (_, slot) => {
                            const url = preview.photoUrls[slot]

                            return (
                                <span
                                    className="marker-hover-card-photo"
                                    data-slot={slot}
                                    key={url ?? `slot-${slot}`}
                                >
                                    {url ? (
                                        <img src={url} alt="" loading="lazy" />
                                    ) : (
                                        <span className="marker-hover-card-photo-fallback">
                                            <HugeiconsIcon
                                                icon={preview.fallbackIcon}
                                                size={22}
                                                strokeWidth={1.8}
                                                aria-hidden
                                            />
                                        </span>
                                    )}
                                </span>
                            )
                        })}
                    </span>
                </span>
            </span>
        ) : null}
    </>
)
