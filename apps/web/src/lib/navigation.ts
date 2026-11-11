import { DashboardSquare01Icon, Location01Icon, News01Icon } from '@hugeicons/core-free-icons'

export type NavItem = {
    label: string
    path: string
    icon: typeof DashboardSquare01Icon
    permission?: string
    matchPrefix?: string
    children?: {
        label: string
        path: string
        permission?: string
    }[]
}

export type BreadcrumbItem = {
    label: string
    to?: string
}

export const navItems: NavItem[] = [
    { label: 'Beranda', path: '/dashboard', icon: DashboardSquare01Icon },
    { label: 'Destinasi', path: '/destinations', icon: Location01Icon, permission: 'destination:read' },
    { label: 'Blog', path: '/posts', icon: News01Icon, permission: 'blog:read' },
]

/** Sidebar section labels, rendered in this order. */
export type NavGroupLabel = 'Umum' | 'Konten'

export const navGroupOrder: NavGroupLabel[] = ['Umum', 'Konten']

const navGroupByPath: Record<string, NavGroupLabel> = {
    '/dashboard': 'Umum',
    '/destinations': 'Konten',
    '/posts': 'Konten',
}

export function navGroupFor(path: string): NavGroupLabel {
    return navGroupByPath[path] ?? 'Umum'
}

const staticBreadcrumbs: Record<string, BreadcrumbItem[]> = {
    '/dashboard': [{ label: 'Beranda' }],
    '/destinations': [{ label: 'Destinasi' }],
    '/posts': [{ label: 'Blog' }],
}

/** Exact/owned path beats a broader matchPrefix so sibling pages do not swallow each other. */
function navMatchScore(item: NavItem, pathname: string): number {
    if (pathname === item.path || pathname.startsWith(`${item.path}/`)) {
        return item.path.length + 1000
    }
    if (
        item.matchPrefix &&
        (pathname === item.matchPrefix || pathname.startsWith(`${item.matchPrefix}/`))
    ) {
        return item.matchPrefix.length
    }
    return -1
}

export function findNavItem(pathname: string): NavItem {
    const match = navItems
        .map((item) => ({ item, score: navMatchScore(item, pathname) }))
        .filter(({ score }) => score >= 0)
        .sort((first, second) => second.score - first.score)[0]

    return match?.item ?? navItems[0]
}

export function breadcrumbFor(pathname: string): BreadcrumbItem[] {
    if (pathname === '/dashboard') return [{ label: 'Beranda' }]

    if (pathname === '/destinations/new') {
        return [
            { label: 'Beranda', to: '/dashboard' },
            { label: 'Destinasi', to: '/destinations' },
            { label: 'Tambah destinasi' },
        ]
    }

    if (/^\/destinations\/[^/]+\/edit$/.test(pathname)) {
        return [
            { label: 'Beranda', to: '/dashboard' },
            { label: 'Destinasi', to: '/destinations' },
            { label: 'Ubah destinasi' },
        ]
    }

    if (pathname === '/posts/new') {
        return [
            { label: 'Beranda', to: '/dashboard' },
            { label: 'Blog', to: '/posts' },
            { label: 'Tulis artikel' },
        ]
    }

    if (/^\/posts\/[^/]+\/edit$/.test(pathname)) {
        return [
            { label: 'Beranda', to: '/dashboard' },
            { label: 'Blog', to: '/posts' },
            { label: 'Ubah artikel' },
        ]
    }

    const tail = staticBreadcrumbs[pathname] ?? [{ label: findNavItem(pathname).label }]

    return [{ label: 'Beranda', to: '/dashboard' }, ...tail]
}
