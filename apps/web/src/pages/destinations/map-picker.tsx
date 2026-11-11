import { useEffect, useRef, useState } from 'react'

import { MapPinIcon } from '@hugeicons/core-free-icons'
import { Map as MapLibreMap, Marker, NavigationControl } from 'maplibre-gl'

import { BANGKALAN_CENTER, MAP_STYLE_URL } from '@/lib/map-config'
import { createIconMarker, type IconMarkerElement } from '@/lib/map-marker'

type MapPickerProps = {
    latitude: number | null
    longitude: number | null
    onPick: (latitude: number, longitude: number) => void
}

type PickerMarker = IconMarkerElement & {
    marker: Marker | null
}

export function MapPicker({ latitude, longitude, onPick }: MapPickerProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const mapRef = useRef<MapLibreMap | null>(null)
    const markerRef = useRef<PickerMarker | null>(null)
    const onPickRef = useRef(onPick)
    const [isReady, setIsReady] = useState(false)
    const [failure, setFailure] = useState(false)

    useEffect(() => {
        onPickRef.current = onPick
    }, [onPick])

    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        const canvas = document.createElement('canvas')
        if (!canvas.getContext('webgl2')) {
            setFailure(true)
            return
        }

        const map = new MapLibreMap({
            container,
            style: MAP_STYLE_URL,
            center: BANGKALAN_CENTER,
            zoom: 11,
            pitch: 25,
            attributionControl: { compact: true },
            maplibreLogo: false,
        })

        mapRef.current = map
        map.addControl(new NavigationControl({ showCompass: false }), 'bottom-right')

        map.on('click', (event) => {
            onPickRef.current(
                Number(event.lngLat.lat.toFixed(6)),
                Number(event.lngLat.lng.toFixed(6))
            )
        })

        map.on('load', () => setIsReady(true))

        const entry = createIconMarker(MapPinIcon, 'Lokasi destinasi', 'map-picker-marker')
        markerRef.current = { ...entry, marker: null }

        return () => {
            markerRef.current?.marker?.remove()
            markerRef.current?.root.unmount()
            markerRef.current = null
            map.remove()
            mapRef.current = null
        }
    }, [])

    useEffect(() => {
        const map = mapRef.current
        const markerEntry = markerRef.current
        if (!map || !markerEntry || !isReady) return

        if (latitude === null || longitude === null) {
            markerEntry.marker?.remove()
            markerEntry.marker = null
            return
        }

        if (!markerEntry.marker) {
            markerEntry.marker = new Marker({
                element: markerEntry.element,
                anchor: 'bottom',
            }).addTo(map)
        }

        markerEntry.marker.setLngLat([longitude, latitude])

        map.easeTo({
            center: [longitude, latitude],
            zoom: Math.max(map.getZoom(), 13),
            duration: 450,
        })
    }, [latitude, longitude, isReady])

    return (
        <div className="space-y-1.5">
            <div className="relative h-56 overflow-hidden rounded-xl border border-border/60 bg-muted">
                <div ref={containerRef} className="h-full w-full" />
                {failure ? (
                    <div className="absolute inset-0 grid place-items-center bg-background/95 p-3 text-center text-xs text-muted-foreground">
                        Peta tidak dapat ditampilkan di peramban ini. Isi koordinat secara manual.
                    </div>
                ) : null}
            </div>
            <p className="text-xs text-muted-foreground">
                Klik peta untuk mengisi koordinat, atau isi manual di kolom latitude dan longitude.
            </p>
        </div>
    )
}
