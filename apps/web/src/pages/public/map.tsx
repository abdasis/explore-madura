import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { Compass01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { Button } from '@/components/ui/button'
import { DestinationDetailPanel } from '@/pages/public/components/destination-detail-panel'
import { DestinationVideoOverlay } from '@/pages/public/components/destination-video-overlay'
import { MapCanvas, type MapCanvasHandle } from '@/pages/public/components/map-canvas'
import { MapStatus } from '@/pages/public/components/map-status'
import { MapToolbar } from '@/pages/public/components/map-toolbar'
import { PublicHeader } from '@/pages/public/components/public-header'
import { usePublicDestinations } from '@/pages/public/use-public-destinations'
import type { MapMode } from '@/lib/map-config'
import type { DestinationCategory, PublicDestination } from '@/types/destination'

const PublicMapPage = () => {
    const { destinations, isLoading, error, reload } = usePublicDestinations()
    const mapRef = useRef<MapCanvasHandle>(null)

    const [search, setSearch] = useState('')
    const [activeCategory, setActiveCategory] = useState('')
    const [selectedId, setSelectedId] = useState<number | null>(null)
    const [videoId, setVideoId] = useState<number | null>(null)
    const [isVideoOpen, setIsVideoOpen] = useState(false)
    const [videoTrigger, setVideoTrigger] = useState<HTMLElement | null>(null)
    const [mapMode, setMapMode] = useState<MapMode>('street')

    const categories = useMemo(() => {
        const unique = new Map<string, DestinationCategory>()

        for (const destination of destinations) {
            if (!unique.has(destination.category.slug)) {
                unique.set(destination.category.slug, destination.category)
            }
        }

        return [...unique.values()]
    }, [destinations])

    const filtered = useMemo(() => {
        const query = search.trim().toLowerCase()

        return destinations.filter((destination) => {
            const matchesCategory =
                activeCategory === '' || destination.category.slug === activeCategory
            if (!matchesCategory) return false
            if (query === '') return true

            return (
                destination.name.toLowerCase().includes(query) ||
                destination.address.toLowerCase().includes(query) ||
                destination.facilities.toLowerCase().includes(query)
            )
        })
    }, [destinations, search, activeCategory])

    const selectedDestination =
        filtered.find((destination) => destination.id === selectedId) ?? null

    const videoDestination = filtered.find((destination) => destination.id === videoId) ?? null

    const isEmptyResult =
        !isLoading && error === null && destinations.length > 0 && filtered.length === 0

    useEffect(() => {
        if (selectedId === null) return
        if (filtered.some((destination) => destination.id === selectedId)) return

        setSelectedId(null)
    }, [filtered, selectedId])

    useEffect(() => {
        if (videoId === null) return
        if (filtered.some((destination) => destination.id === videoId)) return

        setVideoId(null)
        setIsVideoOpen(false)
    }, [filtered, videoId])

    useEffect(() => {
        if (selectedId === null) return

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setSelectedId(null)
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [selectedId])

    const handleSelect = useCallback((destination: PublicDestination) => {
        setSelectedId(null)
        setIsVideoOpen(false)

        if (destination.video) {
            setVideoTrigger(mapRef.current?.getMarkerElement(destination.id) ?? null)
            setVideoId(destination.id)
            mapRef.current?.flyToDestination(destination, () => setIsVideoOpen(true))
            return
        }

        setVideoId(null)
        setVideoTrigger(null)
        setSelectedId(destination.id)
        mapRef.current?.flyToDestination(destination)
    }, [])

    const handleCloseVideo = useCallback(() => {
        setIsVideoOpen(false)
        setVideoId(null)
        setVideoTrigger(null)
    }, [])

    const handleMapClick = useCallback(() => setSelectedId(null), [])

    const resetFilters = useCallback(() => {
        setSearch('')
        setActiveCategory('')
    }, [])

    const resetCamera = useCallback(() => mapRef.current?.resetCamera(), [])

    return (
        <main className="public-playful fixed inset-0 overflow-hidden bg-playful-canvas text-playful-ink">
            <PublicHeader overlay />

            <MapCanvas
                ref={mapRef}
                destinations={filtered}
                selectedId={videoId ?? selectedId}
                mapMode={mapMode}
                onMapModeChange={setMapMode}
                onSelect={handleSelect}
                onMapClick={handleMapClick}
            />

            <div className="pointer-events-none absolute inset-0">
                <div className="pointer-events-auto absolute top-20 left-3 max-md:right-16">
                    <MapToolbar
                        search={search}
                        onSearchChange={setSearch}
                        categories={categories}
                        activeCategory={activeCategory}
                        onCategoryChange={setActiveCategory}
                    />
                </div>

                <div className="pointer-events-auto absolute top-20 right-3">
                    <Button
                        size="icon"
                        className="playful-icon-button"
                        onClick={resetCamera}
                        aria-label="Kembalikan kamera ke tampilan awal"
                    >
                        <HugeiconsIcon icon={Compass01Icon} size={20} strokeWidth={1.8} />
                    </Button>
                </div>

                <MapStatus
                    isLoading={isLoading}
                    error={error}
                    onRetry={reload}
                    isEmptyResult={isEmptyResult}
                    onResetFilters={resetFilters}
                />

                <DestinationDetailPanel
                    destination={videoDestination ? null : selectedDestination}
                    onClose={() => setSelectedId(null)}
                />

                {videoDestination && isVideoOpen ? (
                    <DestinationVideoOverlay
                        destination={videoDestination}
                        returnFocusTo={videoTrigger}
                        onClose={handleCloseVideo}
                    />
                ) : null}
            </div>
        </main>
    )
}

export default PublicMapPage
