import { useEffect, useRef, useState } from 'react'

import { Cancel01Icon, Compass01Icon, Menu01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Link, useLocation } from 'react-router-dom'

import { cn } from '@/lib/utils'

type PublicHeaderProps = {
    /** Absolute overlay di atas kanvas peta; selain itu sticky di atas konten. */
    overlay?: boolean
}

const links = [
    { label: 'Peta', to: '/' },
    { label: 'Blog', to: '/blog' },
]

function isActive(pathname: string, to: string): boolean {
    return to === '/' ? pathname === '/' : pathname === to || pathname.startsWith(`${to}/`)
}

const focusRing =
    'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-playful-indigo/70'

export function PublicHeader({ overlay = false }: PublicHeaderProps) {
    const { pathname } = useLocation()
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const menuButtonRef = useRef<HTMLButtonElement>(null)

    useEffect(() => {
        setIsMenuOpen(false)
    }, [pathname])

    useEffect(() => {
        if (!isMenuOpen) return

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return

            setIsMenuOpen(false)
            menuButtonRef.current?.focus()
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isMenuOpen])

    return (
        <header
            className={cn(
                'inset-x-0 top-0 z-30 border-b border-playful-line bg-playful-surface',
                overlay ? 'absolute' : 'sticky'
            )}
        >
            <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4">
                <Link
                    to="/"
                    aria-label="Jelajah Bangkalan, buka peta"
                    className={cn('flex min-h-11 items-center gap-2.5 rounded-xl', focusRing)}
                >
                    <span
                        aria-hidden
                        className="grid size-9 shrink-0 place-items-center rounded-xl bg-playful-indigo text-white"
                    >
                        <HugeiconsIcon icon={Compass01Icon} size={20} strokeWidth={1.8} />
                    </span>
                    <span className="font-playful-heading text-lg font-semibold tracking-tight text-playful-ink">
                        Jelajah Bangkalan
                    </span>
                </Link>

                <nav aria-label="Navigasi publik" className="hidden items-center gap-1 sm:flex">
                    {links.map((link) => {
                        const active = isActive(pathname, link.to)

                        return (
                            <Link
                                key={link.to}
                                to={link.to}
                                aria-current={active ? 'page' : undefined}
                                className={cn(
                                    'inline-flex min-h-10 items-center rounded-full px-4 font-playful-heading text-sm font-semibold transition-colors duration-150',
                                    focusRing,
                                    active
                                        ? 'bg-playful-indigo/12 text-playful-indigo'
                                        : 'text-playful-ink/70 hover:bg-playful-canvas hover:text-playful-ink'
                                )}
                            >
                                {link.label}
                            </Link>
                        )
                    })}
                </nav>

                <button
                    ref={menuButtonRef}
                    type="button"
                    className="playful-icon-button sm:hidden"
                    aria-label={isMenuOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
                    aria-expanded={isMenuOpen}
                    aria-controls="public-nav-menu"
                    onClick={() => setIsMenuOpen((open) => !open)}
                >
                    <HugeiconsIcon
                        icon={isMenuOpen ? Cancel01Icon : Menu01Icon}
                        size={20}
                        strokeWidth={2}
                    />
                </button>
            </div>

            {isMenuOpen ? (
                <div id="public-nav-menu" className="absolute inset-x-3 top-[72px] z-40 sm:hidden">
                    <nav
                        aria-label="Navigasi publik mobile"
                        className="playful-card flex flex-col gap-1 p-2"
                    >
                        {links.map((link) => {
                            const active = isActive(pathname, link.to)

                            return (
                                <Link
                                    key={link.to}
                                    to={link.to}
                                    aria-current={active ? 'page' : undefined}
                                    className={cn(
                                        'inline-flex min-h-11 items-center rounded-[16px] px-4 font-playful-heading text-sm font-semibold transition-colors duration-150',
                                        focusRing,
                                        active
                                            ? 'bg-playful-indigo/12 text-playful-indigo'
                                            : 'text-playful-ink/70 hover:bg-playful-canvas hover:text-playful-ink'
                                    )}
                                >
                                    {link.label}
                                </Link>
                            )
                        })}
                    </nav>
                </div>
            ) : null}
        </header>
    )
}
