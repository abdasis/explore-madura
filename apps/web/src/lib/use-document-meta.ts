import { useEffect } from 'react'

const SITE_NAME = 'Explore Madura'

export type DocumentMeta = {
    title: string
    description?: string
    /** Path absolut situs, mis. `/blog/karapan-sapi`. Default: pathname saat ini. */
    path?: string
    /** Gambar sampul, boleh relatif terhadap origin. */
    image?: string | null
    type?: 'website' | 'article'
    publishedAt?: string | null
}

type TrackedTag = {
    restore: () => void
}

function trackMeta(attribute: 'name' | 'property', key: string, content: string, tracked: TrackedTag[]): void {
    const element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`)

    if (element) {
        if (element.dataset.pageMeta === undefined) {
            const previous = element.getAttribute('content')
            element.dataset.pageMeta = ''
            tracked.push({
                restore: () => {
                    if (previous === null) {
                        element.removeAttribute('content')
                    } else {
                        element.setAttribute('content', previous)
                    }
                    delete element.dataset.pageMeta
                },
            })
        }

        element.setAttribute('content', content)
        return
    }

    const created = document.createElement('meta')
    created.setAttribute(attribute, key)
    created.setAttribute('content', content)
    created.dataset.pageMeta = ''
    tracked.push({ restore: () => created.remove() })
    document.head.appendChild(created)
}

function trackCanonical(href: string, tracked: TrackedTag[]): void {
    const element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')

    if (element) {
        const previous = element.getAttribute('href')
        const alreadyTracked = element.dataset.pageMeta !== undefined
        element.href = href

        if (!alreadyTracked) {
            element.dataset.pageMeta = ''
            tracked.push({
                restore: () => {
                    if (previous === null) {
                        element.removeAttribute('href')
                    } else {
                        element.setAttribute('href', previous)
                    }
                    delete element.dataset.pageMeta
                },
            })
        }
        return
    }

    const created = document.createElement('link')
    created.rel = 'canonical'
    created.href = href
    created.dataset.pageMeta = ''
    tracked.push({ restore: () => created.remove() })
    document.head.appendChild(created)
}

function trackJsonLd(data: Record<string, unknown>, tracked: TrackedTag[]): void {
    const element = document.head.querySelector<HTMLScriptElement>('script[type="application/ld+json"]')

    if (element) {
        if (element.dataset.pageMeta === undefined) {
            const previous = element.textContent
            element.dataset.pageMeta = ''
            tracked.push({
                restore: () => {
                    element.textContent = previous
                    delete element.dataset.pageMeta
                },
            })
        }

        element.textContent = JSON.stringify(data)
        return
    }

    const created = document.createElement('script')
    created.type = 'application/ld+json'
    created.textContent = JSON.stringify(data)
    created.dataset.pageMeta = ''
    tracked.push({ restore: () => created.remove() })
    document.head.appendChild(created)
}

function absoluteUrl(value: string, origin: string): string {
    if (/^https?:\/\//i.test(value)) return value
    return new URL(value, origin).toString()
}

/**
 * Atur title, meta description, canonical, Open Graph, Twitter card, dan
 * JSON-LD BlogPosting untuk halaman. Tag dikembalikan ke kondisi semula saat
 * unmount atau saat dependensi berubah.
 */
export function useDocumentMeta({
    title,
    description,
    path,
    image,
    type = 'website',
    publishedAt,
}: DocumentMeta): void {
    useEffect(() => {
        const origin = window.location.origin
        const url = absoluteUrl(path ?? window.location.pathname, origin)
        const imageUrl = image ? absoluteUrl(image, origin) : null
        const previousTitle = document.title
        const tracked: TrackedTag[] = []

        document.title = title
        if (description) trackMeta('name', 'description', description, tracked)
        trackCanonical(url, tracked)

        trackMeta('property', 'og:title', title, tracked)
        if (description) trackMeta('property', 'og:description', description, tracked)
        trackMeta('property', 'og:type', type, tracked)
        trackMeta('property', 'og:url', url, tracked)
        if (imageUrl) trackMeta('property', 'og:image', imageUrl, tracked)

        trackMeta('name', 'twitter:card', imageUrl ? 'summary_large_image' : 'summary', tracked)
        trackMeta('name', 'twitter:title', title, tracked)
        if (description) trackMeta('name', 'twitter:description', description, tracked)
        if (imageUrl) trackMeta('name', 'twitter:image', imageUrl, tracked)

        if (type === 'article') {
            trackJsonLd(
                {
                    '@context': 'https://schema.org',
                    '@type': 'BlogPosting',
                    headline: title,
                    ...(description ? { description } : {}),
                    ...(publishedAt ? { datePublished: publishedAt } : {}),
                    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
                    ...(imageUrl ? { image: imageUrl } : {}),
                    author: { '@type': 'Organization', name: SITE_NAME },
                    publisher: { '@type': 'Organization', name: SITE_NAME },
                },
                tracked
            )
        }

        return () => {
            document.title = previousTitle
            for (const tag of tracked) tag.restore()
        }
    }, [title, description, path, image, type, publishedAt])
}
