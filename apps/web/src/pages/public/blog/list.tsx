import { AlertCircleIcon, Calendar03Icon, Image01Icon, News01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/date'
import { useDocumentMeta } from '@/lib/use-document-meta'
import { PublicFooter } from '@/pages/public/components/public-footer'
import { PublicHeader } from '@/pages/public/components/public-header'
import { usePublicPosts } from '@/pages/public/use-public-posts'
import type { PublicPost } from '@/types/post'

const SKELETON_COUNT = 6

function PostCard({ post }: { post: PublicPost }) {
    return (
        <Link
            to={`/blog/${post.slug}`}
            className="playful-card group flex flex-col overflow-hidden transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-playful-indigo/70"
        >
            <div className="aspect-video w-full overflow-hidden bg-playful-canvas">
                {post.cover_url ? (
                    <img
                        src={post.cover_url}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover"
                    />
                ) : (
                    <div className="grid h-full w-full place-items-center text-playful-indigo/50">
                        <HugeiconsIcon icon={Image01Icon} size={40} strokeWidth={1.5} aria-hidden />
                    </div>
                )}
            </div>

            <div className="flex flex-1 flex-col gap-2 p-5">
                <span className="playful-badge self-start">{post.tag}</span>
                <h2 className="font-playful-heading text-lg leading-snug font-semibold text-balance text-playful-ink">
                    {post.title}
                </h2>
                <p className="line-clamp-3 text-sm text-playful-ink/70">{post.excerpt}</p>
                <p className="mt-auto flex items-center gap-1.5 pt-2 text-xs font-semibold text-playful-ink/55">
                    <HugeiconsIcon icon={Calendar03Icon} size={14} strokeWidth={1.8} aria-hidden />
                    {formatDate(post.published_at)}
                </p>
            </div>
        </Link>
    )
}

const PublicBlogListPage = () => {
    const { posts, isLoading, error, reload } = usePublicPosts()

    useDocumentMeta({
        title: 'Blog Fakta Unik Madura — Jelajah Bangkalan',
        description:
            'Catatan ringan tentang budaya, kuliner, dan tempat yang membuat Madura istimewa.',
        path: '/blog',
        type: 'website',
    })

    return (
        <div className="public-playful min-h-svh bg-playful-canvas text-playful-ink">
            <PublicHeader />

            <main className="mx-auto w-full max-w-6xl px-4 pt-8 pb-16">
                <header className="max-w-2xl space-y-2">
                    <span className="playful-badge">Fakta unik Madura</span>
                    <h1 className="font-playful-heading text-3xl font-semibold tracking-tight text-balance">
                        Cerita dari Bangkalan
                    </h1>
                    <p className="text-[15px] text-playful-ink/70">
                        Catatan ringan tentang budaya, kuliner, dan tempat yang membuat Madura
                        istimewa.
                    </p>
                </header>

                <section className="mt-8" aria-label="Daftar artikel">
                    {isLoading ? (
                        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                            {Array.from({ length: SKELETON_COUNT }, (_, index) => (
                                <div key={index} className="playful-card overflow-hidden">
                                    <Skeleton className="aspect-video w-full rounded-none bg-playful-line/70" />
                                    <div className="space-y-2 p-5">
                                        <Skeleton className="h-5 w-20 rounded-full bg-playful-line/70" />
                                        <Skeleton className="h-5 w-full bg-playful-line/70" />
                                        <Skeleton className="h-3.5 w-3/4 bg-playful-line/70" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : error ? (
                        <div
                            role="alert"
                            className="playful-card mx-auto max-w-md p-6 text-center"
                        >
                            <HugeiconsIcon
                                icon={AlertCircleIcon}
                                size={32}
                                className="mx-auto text-playful-coral"
                                aria-hidden
                            />
                            <p className="mt-2 font-playful-heading text-base font-semibold">
                                Gagal memuat artikel
                            </p>
                            <p className="mt-1 text-sm text-playful-ink/70">{error}</p>
                            <Button className="playful-button playful-button-secondary mt-4" onClick={reload}>
                                Coba lagi
                            </Button>
                        </div>
                    ) : posts.length === 0 ? (
                        <div className="playful-card mx-auto max-w-md p-8 text-center">
                            <HugeiconsIcon
                                icon={News01Icon}
                                size={40}
                                strokeWidth={1.5}
                                className="mx-auto text-playful-indigo/60"
                                aria-hidden
                            />
                            <p className="mt-3 font-playful-heading text-base font-semibold">
                                Belum ada artikel
                            </p>
                            <p className="mt-1 text-sm text-playful-ink/70">
                                Artikel fakta unik Madura akan tampil di sini setelah diterbitkan
                                admin.
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                            {posts.map((post) => (
                                <PostCard key={post.id} post={post} />
                            ))}
                        </div>
                    )}
                </section>
            </main>

            <PublicFooter />
        </div>
    )
}

export default PublicBlogListPage
