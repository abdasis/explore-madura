export type DestinationCategory = {
    id: number
    slug: string
    name: string
    icon: string
}

export type DestinationCategoryOption = DestinationCategory

export type DestinationPhoto = {
    id: number
    url: string
    caption: string
    is_cover: boolean
}

export type DestinationVideo = {
    kind: 'file' | 'embed'
    url: string
}

type DestinationBase = {
    id: number
    category_id: number
    category: DestinationCategory
    name: string
    slug: string
    description: string
    address: string
    latitude: number
    longitude: number
    rating: number
    is_free: boolean
    price_min: number | null
    price_max: number | null
    opening_hours: string
    contact: string
    facilities: string
}

export type PublicDestination = DestinationBase & {
    photos: DestinationPhoto[]
    video: DestinationVideo | null
}

/** Baris daftar admin: membawa cover tunggal dan jumlah foto, tanpa daftar foto penuh. */
export type AdminDestinationSummary = DestinationBase & {
    is_published: boolean
    cover: DestinationPhoto | null
    photo_count: number
}

/** Detail admin: seluruh foto, tanpa cover tunggal maupun photo_count. */
export type AdminDestinationDetail = DestinationBase & {
    is_published: boolean
    photos: DestinationPhoto[]
    video: DestinationVideo | null
}

export type AdminDestination = AdminDestinationSummary

export type DestinationInput = {
    name: string
    category_id: number
    description: string
    address: string
    latitude: number
    longitude: number
    rating: number
    is_free: boolean
    price_min: number | null
    price_max: number | null
    opening_hours: string
    contact: string
    facilities: string
    is_published: boolean
    /**
     * Kind `file` hanya diatur lewat endpoint unggah video. Field dihilangkan
     * (undefined) untuk mempertahankan video file yang sudah ada.
     */
    video_kind?: '' | 'embed'
    video_url?: string
}
