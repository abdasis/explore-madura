import { ArrowRight01Icon, Calendar03Icon, Image01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Link } from 'react-router-dom'

import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/date'
import type { PublicPost } from '@/types/post'

const RECENT_LIMIT = 4
const RECENT_SKELETON_COUNT = 3

const focusRing =
    'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-playful-indigo/70'

type PostSidebarProps = {
    posts: PublicPost[]
    activeSlug: string
    isLoading: boolean
}

export function PostSidebar({ posts, activeSlug, isLoading }: PostSidebarProps) {
    const recentPosts = posts.filter((post) => post.slug !== activeSlug).slice(0, RECENT_LIMIT)
    const tags = [...new Set(posts.map((post) => post.tag).filter(Boolean))]

    return (
        <aside aria-label="Artikel terkait" className="space-y-5 lg:sticky lg:top-24">
            <section aria-labelledby="sidebar-recent-heading" className="playful-card p-5">
                <h2
                    id="sidebar-recent-heading"
                    className="font-playful-heading text-base font-semibold text-playful-ink"
                >
                    Artikel terbaru
                </h2>

                {isLoading ? (
                    <div className="mt-4 space-y-4">
                        {Array.from({ length: RECENT_SKELETON_COUNT }, (_, index) => (
                            <div key={index} className="flex gap-3">
                                <Skeleton className="size-14 shrink-0 rounded-playful-control bg-playful-line/70" />
                                <div className="flex-1 space-y-2 pt-1">
                                    <Skeleton className="h-3.5 w-full bg-playful-line/70" />
                                    <Skeleton className="h-3 w-2/3 bg-playful-line/70" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : recentPosts.length === 0 ? (
                    <p className="mt-3 text-sm text-playful-ink/65">
                        Belum ada artikel lain untuk ditampilkan.
                    </p>
                ) : (
                    <ul className="mt-4 space-y-4">
                        {recentPosts.map((post) => (
                            <li key={post.id}>
                                <Link
                                    to={`/blog/${post.slug}`}
                                    className={`group flex gap-3 rounded-playful-control ${focusRing}`}
                                >
                                    <span className="size-14 shrink-0 overflow-hidden rounded-playful-control bg-playful-canvas">
                                        {post.cover_url ? (
                                            <img
                                                src={post.cover_url}
                                                alt=""
                                                loading="lazy"
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <span className="grid h-full w-full place-items-center text-playful-indigo/50">
                                                <HugeiconsIcon
                                                    icon={Image01Icon}
                                                    size={22}
                                                    strokeWidth={1.5}
                                                    aria-hidden
                                                />
                                            </span>
                                        )}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="line-clamp-2 font-playful-heading text-sm leading-snug font-semibold text-playful-ink transition-colors duration-150 group-hover:text-playful-indigo">
                                            {post.title}
                                        </span>
                                        <span className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-playful-ink/55">
                                            <HugeiconsIcon
                                                icon={Calendar03Icon}
                                                size={12}
                                                strokeWidth={1.8}
                                                aria-hidden
                                            />
                                            {formatDate(post.published_at)}
                                        </span>
                                    </span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            <section aria-labelledby="sidebar-tags-heading" className="playful-card p-5">
                <h2
                    id="sidebar-tags-heading"
                    className="font-playful-heading text-base font-semibold text-playful-ink"
                >
                    Jelajahi
                </h2>

                {tags.length === 0 ? (
                    <p className="mt-3 text-sm text-playful-ink/65">Belum ada tag artikel.</p>
                ) : (
                    <ul className="mt-3 flex flex-wrap gap-2">
                        {tags.map((tag) => (
                            <li key={tag}>
                                <span className="playful-badge">{tag}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            <section
                aria-labelledby="sidebar-cta-heading"
                className="playful-card p-5 text-white"
                style={{ background: 'var(--playful-indigo)' }}
            >
                <h2
                    id="sidebar-cta-heading"
                    className="font-playful-heading text-base font-semibold"
                >
                    Lihat peta wisata
                </h2>
                <p className="mt-1.5 text-sm text-white/80">
                    Temukan pantai, kuliner, dan tempat menarik Bangkalan langsung di peta.
                </p>
                <Link
                    to="/"
                    className={`mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-4 font-playful-heading text-sm font-semibold text-playful-indigo ${focusRing}`}
                >
                    Buka peta
                    <HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={2} aria-hidden />
                </Link>
            </section>
        </aside>
    )
}
