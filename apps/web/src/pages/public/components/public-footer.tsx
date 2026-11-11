import { Compass01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Link } from 'react-router-dom'

const focusRing =
    'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-playful-indigo/70'

const linkClass = `inline-flex min-h-11 items-center rounded-full px-3 text-sm font-semibold text-playful-ink/75 transition-colors duration-150 hover:bg-playful-canvas hover:text-playful-ink ${focusRing}`

export function PublicFooter() {
    const year = new Date().getFullYear()

    return (
        <footer className="border-t border-playful-line bg-playful-surface">
            <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr]">
                <div className="space-y-2">
                    <p className="flex items-center gap-2.5 font-playful-heading text-lg font-semibold text-playful-ink">
                        <span
                            aria-hidden
                            className="grid size-9 shrink-0 place-items-center rounded-xl bg-playful-indigo text-white"
                        >
                            <HugeiconsIcon icon={Compass01Icon} size={20} strokeWidth={1.8} />
                        </span>
                        Explore Madura
                    </p>
                    <p className="max-w-sm text-sm text-playful-ink/65">
                        Peta wisata dan cerita fakta unik Madura, dari pantai sampai kuliner khas
                        Bangkalan.
                    </p>
                </div>

                <nav aria-label="Jelajahi" className="space-y-2">
                    <h2 className="px-3 font-playful-heading text-sm font-semibold text-playful-ink">
                        Jelajahi
                    </h2>
                    <ul>
                        <li>
                            <Link to="/" className={linkClass}>
                                Peta
                            </Link>
                        </li>
                        <li>
                            <Link to="/blog" className={linkClass}>
                                Blog
                            </Link>
                        </li>
                    </ul>
                </nav>

                <nav aria-label="Tentang" className="space-y-2">
                    <h2 className="px-3 font-playful-heading text-sm font-semibold text-playful-ink">
                        Tentang
                    </h2>
                    <ul>
                        <li>
                            <Link to="/" className={linkClass}>
                                Bangkalan, Madura
                            </Link>
                        </li>
                    </ul>
                </nav>
            </div>

            <div className="border-t border-playful-line">
                <p className="mx-auto w-full max-w-6xl px-4 py-5 text-xs font-semibold text-playful-ink/55">
                    © {year} Explore Madura
                </p>
            </div>
        </footer>
    )
}
