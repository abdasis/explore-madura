export type PublicPost = {
    id: number
    title: string
    slug: string
    excerpt: string
    cover_url: string
    tag: string
    published_at: string
}

export type PublicPostDetail = PublicPost & {
    content: string
}

export type AdminPost = PublicPost & {
    content: string
    is_published: boolean
    published_at: string | null
    created_at: string
    updated_at: string
}

export type PostInput = {
    title: string
    tag: string
    excerpt: string
    content: string
    is_published: boolean
}
