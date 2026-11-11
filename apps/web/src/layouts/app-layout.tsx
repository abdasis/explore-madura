import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowRight01Icon, Moon02Icon, Sun03Icon } from '@hugeicons/core-free-icons'
import type { PropsWithChildren } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { AppSidebar } from '@/components/app-sidebar'
import { GlobalSearch } from '@/components/global-search'
import { PageActionsProvider, PageActionsSlot } from '@/components/page-actions'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'
import { usePermissions } from '@/hooks/use-permissions'
import { useTheme } from '@/hooks/use-theme'
import { useAuth } from '@/lib/auth'
import { initialsOf } from '@/lib/initials'
import { breadcrumbFor, findNavItem, navItems } from '@/lib/navigation'
import { cn } from '@/lib/utils'

// Visual 28px, hit area 40px (44px on touch).
const iconButtonClass =
    "relative size-7 shrink-0 rounded-[6px] after:absolute after:-inset-1.5 after:content-[''] max-md:after:-inset-2"

export function AppLayout({ children }: PropsWithChildren) {
    const { pathname } = useLocation()
    const navigate = useNavigate()
    const { theme, toggleTheme } = useTheme()
    const { user, logout } = useAuth()
    const { hasPermission } = usePermissions()

    const crumbs = breadcrumbFor(pathname)
    const activeItem = findNavItem(pathname)
    const visibleNavItems = navItems.filter((item) => !item.permission || hasPermission(item.permission))

    const handleLogout = async () => {
        await logout()
        navigate('/login', { replace: true })
    }

    return (
        <TooltipProvider>
            <SidebarProvider>
                <PageActionsProvider>
                    <div className="flex h-svh w-full flex-col bg-muted dark:bg-background">
                        {/* Tiga zona: identitas kiri, pencarian tepat di tengah, aksi kanan. */}
                        <header className="grid h-10 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 px-2">
                            <div className="flex min-w-0 items-center gap-1">
                                <SidebarTrigger
                                    className={iconButtonClass}
                                    aria-label="Buka atau tutup navigasi"
                                />
                                <span className="truncate text-[13px] font-medium text-muted-foreground">
                                    Jelajah Bangkalan
                                </span>
                            </div>

                            <GlobalSearch
                                theme={theme}
                                onToggleTheme={toggleTheme}
                                onLogout={handleLogout}
                            />

                            <div className="flex min-w-0 items-center justify-end gap-1">
                                <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    className={iconButtonClass}
                                    onClick={toggleTheme}
                                    aria-label="Ganti tema"
                                >
                                    <HugeiconsIcon
                                        icon={theme === 'dark' ? Sun03Icon : Moon02Icon}
                                        size={16}
                                        strokeWidth={1.6}
                                    />
                                </Button>
                                {user ? (
                                    <span className="ml-0.5 shrink-0" title={user.name}>
                                        <Avatar className="size-6 rounded-md">
                                            <AvatarFallback className="rounded-md text-[10px] font-medium">
                                                {initialsOf(user.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className="sr-only">{user.name}</span>
                                    </span>
                                ) : null}
                            </div>
                        </header>

                        <nav
                            aria-label="Navigasi utama"
                            className="scrollbar-none flex gap-1 overflow-x-auto px-2 pb-1 md:hidden"
                        >
                            {visibleNavItems.map((item) => (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={cn(
                                        'flex min-h-11 shrink-0 items-center rounded-[6px] px-2.5 text-sm font-medium text-muted-foreground transition-colors duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]',
                                        'hover:bg-muted hover:text-foreground aria-[current=page]:bg-muted aria-[current=page]:text-foreground',
                                        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
                                    )}
                                    aria-current={activeItem.path === item.path ? 'page' : undefined}
                                >
                                    {item.label}
                                </Link>
                            ))}
                        </nav>

                        {/* One framed panel: header stays on canvas, panel is inset 8px on left/right/bottom. */}
                        <div className="flex min-h-0 flex-1 px-2 pb-2">
                            <div className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden rounded-md border border-border bg-card">
                                <AppSidebar className="md:absolute md:inset-y-0 md:h-full" />

                                <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                                    <div className="flex h-10 shrink-0 items-center justify-between gap-3 border-b border-border px-5">
                                        <nav
                                            aria-label="Breadcrumb"
                                            className="flex min-w-0 items-center"
                                        >
                                            <ol className="flex min-w-0 flex-nowrap items-center gap-1.5 text-[13px] font-normal leading-[1.54] text-muted-foreground">
                                                {crumbs.map((crumb, index) => {
                                                    const isLast = index === crumbs.length - 1

                                                    return (
                                                        <li
                                                            key={`${crumb.label}-${crumb.to ?? 'active'}`}
                                                            className="flex min-w-0 items-center gap-1.5"
                                                        >
                                                            {index > 0 ? (
                                                                <span aria-hidden className="shrink-0 text-muted-foreground/60">
                                                                    <HugeiconsIcon
                                                                        icon={ArrowRight01Icon}
                                                                        size={12}
                                                                        strokeWidth={2}
                                                                    />
                                                                </span>
                                                            ) : null}
                                                            {crumb.to && !isLast ? (
                                                                <Link
                                                                    to={crumb.to}
                                                                    className="shrink-0 rounded-[3px] transition-colors duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                                                                >
                                                                    {crumb.label}
                                                                </Link>
                                                            ) : (
                                                                <span
                                                                    aria-current={isLast ? 'page' : undefined}
                                                                    className={cn(
                                                                        'truncate',
                                                                        isLast && 'font-medium text-foreground'
                                                                    )}
                                                                >
                                                                    {crumb.label}
                                                                </span>
                                                            )}
                                                        </li>
                                                    )
                                                })}
                                            </ol>
                                        </nav>
                                        <PageActionsSlot />
                                    </div>

                                    <main className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                                        {children}
                                    </main>
                                </div>
                            </div>
                        </div>
                    </div>
                </PageActionsProvider>
            </SidebarProvider>
        </TooltipProvider>
    )
}
