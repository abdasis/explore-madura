import { setWorkerUrl, type StyleSpecification } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'

// MapLibre v6 butuh URL worker eksplisit saat dipakai lewat bundler.
setWorkerUrl(workerUrl)

export const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty'

export const TERRAIN_SOURCE_ID = 'terrain-dem'

export const TERRAIN_TILE_URL =
    'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'

export type MapMode = 'street' | 'satellite'

export const SATELLITE_TILE_URL =
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'

/** Gaya satelit minimal: citra Esri + bangunan 3D dari OpenFreeMap. */
export const SATELLITE_STYLE: StyleSpecification = {
    version: 8,
    sources: {
        satellite: {
            type: 'raster',
            tiles: [SATELLITE_TILE_URL],
            tileSize: 256,
            maxzoom: 19,
            attribution: 'Esri, Maxar, Earthstar Geographics',
        },
        openmaptiles: {
            type: 'vector',
            url: 'https://tiles.openfreemap.org/planet',
        },
    },
    layers: [
        {
            id: 'satellite',
            type: 'raster',
            source: 'satellite',
        },
        {
            id: 'building-3d',
            type: 'fill-extrusion',
            source: 'openmaptiles',
            'source-layer': 'building',
            minzoom: 14,
            filter: ['!', ['has', 'hide_3d']],
            paint: {
                'fill-extrusion-base': ['get', 'render_min_height'],
                'fill-extrusion-color': '#e8e2d9',
                'fill-extrusion-height': ['get', 'render_height'],
                'fill-extrusion-opacity': 0.75,
            },
        },
    ],
}

export const BANGKALAN_CENTER: [number, number] = [112.7425, -7.0455]

export const INITIAL_CAMERA = {
    center: BANGKALAN_CENTER,
    zoom: 11.5,
    pitch: 60,
    bearing: -20,
}
