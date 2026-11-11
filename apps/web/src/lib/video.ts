const YOUTUBE_HOSTS = new Set([
    'youtube.com',
    'www.youtube.com',
    'm.youtube.com',
    'youtube-nocookie.com',
    'www.youtube-nocookie.com',
])

const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]+$/

/**
 * Mengubah tautan tonton YouTube menjadi URL embed. URL embed yang sudah benar
 * dan tautan non-YouTube dikembalikan apa adanya.
 */
export function normalizeVideoEmbedUrl(raw: string): string {
    const value = raw.trim()
    if (value === '') return ''

    let parsed: URL
    try {
        parsed = new URL(value)
    } catch {
        return value
    }

    const host = parsed.hostname.toLowerCase()
    const isYoutube = host === 'youtu.be' || YOUTUBE_HOSTS.has(host)
    if (!isYoutube) return value

    let videoId: string | null = null

    if (host === 'youtu.be') {
        videoId = parsed.pathname.split('/').filter(Boolean)[0] ?? null
    } else if (parsed.pathname === '/watch') {
        videoId = parsed.searchParams.get('v')
    } else if (parsed.pathname.startsWith('/shorts/')) {
        videoId = parsed.pathname.split('/')[2] ?? null
    } else if (parsed.pathname.startsWith('/embed/')) {
        return value
    }

    if (!videoId || !YOUTUBE_ID_PATTERN.test(videoId)) return value

    return `https://www.youtube.com/embed/${videoId}`
}
