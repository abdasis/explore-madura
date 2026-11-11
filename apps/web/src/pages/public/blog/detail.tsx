import { AlertCircleIcon, ArrowLeft01Icon, Calendar03Icon, Image01Icon, Search01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Link, useParams } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/date'
import { useDocumentMeta } from '@/lib/use-document-meta'
import { PostSidebar } from '@/pages/public/blog/post-sidebar'
import { PublicFooter } from '@/pages/public/components/public-footer'
import { PublicHeader } from '@/pages/public/components/public-header'
import { usePublicPost } from '@/pages/public/use-public-post'
import { usePublicPosts } from '@/pages/public/use-public-posts'

const backLinkClass =
    'inline-flex min-h-11 items-center gap-2 rounded-full px-3 font-playful-heading text-sm font-semibold text-playful-indigo transition-colors duration-150 hover:bg-playful-surface focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-playful-indigo/70'

const PublicBlogDetailPage = () => {
    const { slug = '' } = useParams<{ slug: string }>()
    const { post, isLoading, error, notFound, reload } = usePublicPost(slug)
    const { posts, isLoading: isSidebarLoading } = usePublicPosts()

    useDocumentMeta({
        title: post ? `${post.title} — Jelajah Bangkalan` : 'Memuat artikel — Jelajah Bangkalan',
        description: post?.excerpt,
        path: `/blog/${slug}`,
        image: post?.cover_url || null,
        type: post ? 'article' : 'website',
        publishedAt: post?.published_at ?? null,
    })

    const paragraphs = post
        ? post.content
              .split('\n')
              .map((line) => line.trim())
              .filter((line) => line !== '')
        : []

    return (
        <div className="public-playful min-h-svh bg-playful-canvas text-playful-ink">
            <PublicHeader />

            <main className="mx-auto w-full max-w-6xl px-4 pt-6 pb-16">
                <Link to="/blog" className={backLinkClass}>
                    <HugeiconsIcon icon={ArrowLeft01Icon} size={16} strokeWidth={2} aria-hidden />
                    Kembali ke Blog
                </Link>

                {isLoading ? (
                    <div className="mt-5 max-w-3xl space-y-4">
                        <Skeleton className="aspect-video w-full rounded-playful-card bg-playful-line/70" />
                        <Skeleton className="h-6 w-24 rounded-full bg-playful-line/70" />
                        <Skeleton className="h-9 w-3/4 bg-playful-line/70" />
                        <Skeleton className="h-4 w-40 bg-playful-line/70" />
                        <div className="space-y-2 pt-2">
                            <Skeleton className="h-4 w-full bg-playful-line/70" />
                            <Skeleton className="h-4 w-full bg-playful-line/70" />
                            <Skeleton className="h-4 w-2/3 bg-playful-line/70" />
                        </div>
                    </div>
                ) : error ? (
                    <div role="alert" className="playful-card mt-5 max-w-3xl p-6 text-center">
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
                ) : notFound || !post ? (
                    <div className="playful-card mt-5 max-w-3xl p-8 text-center">
                        <HugeiconsIcon
                            icon={Search01Icon}
                            size={40}
                            strokeWidth={1.5}
                            className="mx-auto text-playful-indigo/60"
                            aria-hidden
                        />
                        <p className="mt-3 font-playful-heading text-base font-semibold">
                            Artikel tidak ditemukan
                        </p>
                        <p className="mt-1 text-sm text-playful-ink/70">
                            Tautan mungkin sudah berubah atau artikel telah dihapus.
                        </p>
                        <Button className="playful-button playful-button-secondary mt-4" asChild>
                            <Link to="/blog">Lihat semua artikel</Link>
                        </Button>
                    </div>
                ) : (
                    <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
                        <article className="space-y-5">
                            <div className="overflow-hidden rounded-playful-card bg-playful-surface">
                                {post.cover_url ? (
                                    <img
                                        src={post.cover_url}
                                        alt={post.title}
                                        className="aspect-video w-full object-cover"
                                    />
                                ) : (
                                    <div className="grid aspect-video w-full place-items-center bg-playful-canvas text-playful-indigo/50">
                                        <HugeiconsIcon
                                            icon={Image01Icon}
                                            size={48}
                                            strokeWidth={1.5}
                                            aria-hidden
                                        />
                                    </div>
                                )}
                            </div>

                            <header className="space-y-2">
                                <ul aria-label="Tag artikel" className="flex flex-wrap gap-2">
                                    <li>
                                        <span className="playful-badge">{post.tag}</span>
                                    </li>
                                </ul>
                                <h1 className="font-playful-heading text-3xl leading-tight font-semibold tracking-tight text-balance">
                                    {post.title}
                                </h1>
                                <p className="flex items-center gap-1.5 text-xs font-semibold text-playful-ink/55">
                                    <HugeiconsIcon
                                        icon={Calendar03Icon}
                                        size={14}
                                        strokeWidth={1.8}
                                        aria-hidden
                                    />
                                    <time dateTime={post.published_at}>
                                        {formatDate(post.published_at)}
                                    </time>
                                </p>
                            </header>

                            <div className="space-y-4 text-[17px] leading-[1.75] text-playful-ink/85">
                                {paragraphs.map((paragraph, index) => (
                                    <p key={`${index}-${paragraph.slice(0, 24)}`}>{paragraph}</p>
                                ))}
                            </div>
                        </article>

                        <PostSidebar
                            posts={posts}
                            activeSlug={slug}
                            isLoading={isSidebarLoading}
                        />
                    </div>
                )}
            </main>

            <PublicFooter />
        </div>
    )
}

export default PublicBlogDetailPage
