import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { MapsIcon, Satellite01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { Button } from '@/components/ui/button'
import { destinationIcon } from '@/lib/destination-icons'
import {
    INITIAL_CAMERA,
    MAP_STYLE_URL,
    SATELLITE_STYLE,
    TERRAIN_SOURCE_ID,
    TERRAIN_TILE_URL,
    type MapMode,
} from '@/lib/map-config'
import { createIconMarker } from '@/lib/map-marker'
import { Map as MapLibreMap, Marker, NavigationControl } from 'maplibre-gl'
import type { Root } from 'react-dom/client'
import type { PublicDestination } from '@/types/destination'

const STYLE_LOAD_TIMEOUT_MS = 12_000

function prefersReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function attachTerrain(map: MapLibreMap): void {
    try {
        if (!map.getSource(TERRAIN_SOURCE_ID)) {
            map.addSource(TERRAIN_SOURCE_ID, {
                type: 'raster-dem',
                tiles: [TERRAIN_TILE_URL],
                tileSize: 256,
                encoding: 'terrarium',
                maxzoom: 15,
            })
        }
        map.setTerrain({ source: TERRAIN_SOURCE_ID, exaggeration: 1.35 })
    } catch {
        // Terrain bersifat opsional; peta tetap tampil tanpa relief.
    }
}

type MarkerEntry = {
    marker: Marker
    root: Root
    element: HTMLButtonElement
}

export type MapCanvasHandle = {
    flyToDestination: (destination: PublicDestination, onArrive?: () => void) => void
    getMarkerElement: (destinationId: number) => HTMLElement | null
    resetCamera: () => void
}

type MapCanvasProps = {
    destinations: PublicDestination[]
    selectedId: number | null
    mapMode: MapMode
    onMapModeChange: (mode: MapMode) => void
    onSelect: (destination: PublicDestination) => void
    onMapClick: () => void
}

export const MapCanvas = forwardRef<MapCanvasHandle, MapCanvasProps>((props, ref) => {
    const { destinations, selectedId, mapMode, onMapModeChange, onSelect, onMapClick } = props

    const containerRef = useRef<HTMLDivElement>(null)
    const mapRef = useRef<MapLibreMap | null>(null)
    const markersRef = useRef(new Map<number, MarkerEntry>())
    const destinationsRef = useRef(destinations)
    const onSelectRef = useRef(onSelect)
    const onMapClickRef = useRef(onMapClick)
    const selectedIdRef = useRef(selectedId)
    const mapModeRef = useRef(mapMode)

    const [isReady, setIsReady] = useState(false)
    const [failure, setFailure] = useState<'webgl2' | 'style' | null>(null)
    const [attempt, setAttempt] = useState(0)
    const [modeControlHost, setModeControlHost] = useState<HTMLElement | null>(null)

    useEffect(() => {
        destinationsRef.current = destinations
    }, [destinations])

    useEffect(() => {
        onSelectRef.current = onSelect
    }, [onSelect])

    useEffect(() => {
        onMapClickRef.current = onMapClick
    }, [onMapClick])

    useEffect(() => {
        selectedIdRef.current = selectedId
    }, [selectedId])

    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        const canvas = document.createElement('canvas')
        if (!canvas.getContext('webgl2')) {
            setFailure('webgl2')
            return
        }

        setFailure(null)
        setIsReady(false)

        let map: MapLibreMap

        try {
            map = new MapLibreMap({
                container,
                style: mapModeRef.current === 'satellite' ? SATELLITE_STYLE : MAP_STYLE_URL,
                center: INITIAL_CAMERA.center,
                zoom: INITIAL_CAMERA.zoom,
                pitch: INITIAL_CAMERA.pitch,
                bearing: INITIAL_CAMERA.bearing,
                maxPitch: 85,
                attributionControl: { compact: true },
                maplibreLogo: false,
            })
        } catch {
            setFailure('style')
            return
        }

        mapRef.current = map

        map.addControl(new NavigationControl({ visualizePitch: true }), 'bottom-right')

        // Portal ke grup kontrol zoom agar toggle menumpuk rapi di bawah plus/minus.
        const navGroup = map
            .getContainer()
            .querySelector<HTMLElement>('.maplibregl-ctrl-bottom-right .maplibregl-ctrl-group')
        setModeControlHost(navGroup)

        const resizeObserver = new ResizeObserver(() => map.resize())
        resizeObserver.observe(container)

        map.on('click', () => onMapClickRef.current())

        map.on('error', (event) => {
            const status = (event.error as Error & { status?: number }).status
            if (!map.isStyleLoaded() && status !== undefined && status >= 400) {
                setFailure('style')
            }
        })

        const styleTimer = window.setTimeout(() => {
            if (!map.isStyleLoaded()) setFailure('style')
        }, STYLE_LOAD_TIMEOUT_MS)

        map.on('load', () => {
            window.clearTimeout(styleTimer)

            attachTerrain(map)
            map.resize()
            setIsReady(true)
        })

        return () => {
            window.clearTimeout(styleTimer)
            resizeObserver.disconnect()

            for (const entry of markersRef.current.values()) {
                entry.marker.remove()
                queueMicrotask(() => entry.root.unmount())
            }
            markersRef.current.clear()

            map.remove()
            mapRef.current = null
        }
    }, [attempt])

    useEffect(() => {
        const map = mapRef.current
        if (!map || !isReady) return
        if (mapModeRef.current === mapMode) return

        mapModeRef.current = mapMode
        setFailure(null)
        map.setStyle(mapMode === 'satellite' ? SATELLITE_STYLE : MAP_STYLE_URL, {
            diff: false,
        })
        map.once('style.load', () => {
            attachTerrain(map)
            map.resize()
        })
    }, [mapMode, isReady])

    useEffect(() => {
        const map = mapRef.current
        if (!map || !isReady) return

        const nextIds = new Set(destinations.map((destination) => destination.id))

        for (const [id, entry] of markersRef.current) {
            if (nextIds.has(id)) continue

            entry.marker.remove()
            queueMicrotask(() => entry.root.unmount())
            markersRef.current.delete(id)
        }

        for (const destination of destinations) {
            if (markersRef.current.has(destination.id)) continue

            const markerIcon = destinationIcon(destination.category.slug)
            const photoUrls = [...destination.photos]
                .sort((a, b) => Number(b.is_cover) - Number(a.is_cover))
                .slice(0, 3)
                .map((photo) => photo.url)

            const { element, root } = createIconMarker(
                markerIcon,
                destination.name,
                'destination-marker',
                {
                    name: destination.name,
                    photoUrls,
                    fallbackIcon: markerIcon,
                }
            )

            element.addEventListener('click', (event) => {
                event.stopPropagation()

                const current = destinationsRef.current.find(
                    (item) => item.id === destination.id
                )
                if (current) onSelectRef.current(current)
            })

            if (selectedIdRef.current === destination.id) {
                element.dataset.active = 'true'
                element.setAttribute('aria-pressed', 'true')
            }

            const marker = new Marker({ element, anchor: 'center' })
                .setLngLat([destination.longitude, destination.latitude])
                .addTo(map)

            markersRef.current.set(destination.id, { marker, root, element })
        }
    }, [destinations, isReady])

    useEffect(() => {
        for (const [id, entry] of markersRef.current) {
            const active = id === selectedId
            entry.element.dataset.active = active ? 'true' : 'false'
            entry.element.setAttribute('aria-pressed', active ? 'true' : 'false')
        }
    }, [selectedId, destinations, isReady])

    useImperativeHandle(
        ref,
        () => ({
            flyToDestination(destination: PublicDestination, onArrive?: () => void) {
                const map = mapRef.current
                if (!map) {
                    onArrive?.()
                    return
                }

                const center: [number, number] = [destination.longitude, destination.latitude]

                if (prefersReducedMotion()) {
                    map.jumpTo({ center, zoom: 15.5, pitch: 65 })
                    onArrive?.()
                    return
                }

                map.once('moveend', () => onArrive?.())
                map.flyTo({
                    center,
                    zoom: 15.5,
                    pitch: 65,
                    bearing: map.getBearing(),
                    speed: 0.8,
                    curve: 1.42,
                    essential: true,
                })
            },
            getMarkerElement(destinationId: number) {
                return markersRef.current.get(destinationId)?.element ?? null
            },
            resetCamera() {
                const map = mapRef.current
                if (!map) return

                if (prefersReducedMotion()) {
                    map.jumpTo(INITIAL_CAMERA)
                    return
                }

                map.flyTo({
                    ...INITIAL_CAMERA,
                    speed: 0.9,
                    curve: 1.4,
                    essential: true,
                })
            },
        }),
        []
    )

    return (
        <div className="absolute inset-0">
            <div ref={containerRef} className="h-full w-full" />

            {modeControlHost
                ? createPortal(
                      <>
                          <button
                              type="button"
                              onClick={() => onMapModeChange('street')}
                              aria-label="Tampilkan peta jalan"
                              aria-pressed={mapMode === 'street'}
                              className="playful-mode-button"
                          >
                              <HugeiconsIcon
                                  icon={MapsIcon}
                                  size={16}
                                  strokeWidth={1.8}
                                  aria-hidden
                              />
                          </button>
                          <button
                              type="button"
                              onClick={() => onMapModeChange('satellite')}
                              aria-label="Tampilkan citra satelit"
                              aria-pressed={mapMode === 'satellite'}
                              className="playful-mode-button"
                          >
                              <HugeiconsIcon
                                  icon={Satellite01Icon}
                                  size={16}
                                  strokeWidth={1.8}
                                  aria-hidden
                              />
                          </button>
                      </>,
                      modeControlHost
                  )
                : null}

            {failure ? (
                <div className="absolute inset-0 z-10 grid place-items-center bg-playful-canvas p-6">
                    <div className="playful-card max-w-sm space-y-3 p-5 text-center">
                        <p className="font-playful-heading text-base font-semibold text-playful-ink">
                            {failure === 'webgl2'
                                ? 'Peta 3D tidak dapat ditampilkan'
                                : 'Peta gagal dimuat'}
                        </p>
                        <p className="text-sm leading-relaxed text-playful-ink/70">
                            {failure === 'webgl2'
                                ? 'Peramban ini belum mendukung WebGL2. Coba peramban lain atau aktifkan akselerasi perangkat keras.'
                                : 'Gaya peta tidak berhasil dimuat. Periksa koneksi lalu coba lagi.'}
                        </p>
                        {failure === 'style' ? (
                            <Button
                                className="playful-button playful-button-secondary"
                                onClick={() => setAttempt((value) => value + 1)}
                            >
                                Coba lagi
                            </Button>
                        ) : null}
                    </div>
                </div>
            ) : null}
        </div>
    )
})

MapCanvas.displayName = 'MapCanvas'
