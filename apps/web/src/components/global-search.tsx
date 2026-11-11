import { HugeiconsIcon } from '@hugeicons/react'
import { Logout01Icon, Moon02Icon, SearchIcon, Sun03Icon } from '@hugeicons/core-free-icons'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command'
import { Kbd } from '@/components/ui/kbd'
import { usePermissions } from '@/hooks/use-permissions'
import {
    navGroupFor,
    navGroupOrder,
    navItems,
    type NavGroupLabel,
    type NavItem,
} from '@/lib/navigation'
import type { Theme } from '@/hooks/use-theme'

type PaletteEntry = {
    label: string
    path: string
    icon: NavItem['icon']
}

type PaletteGroup = {
    label: NavGroupLabel
    items: PaletteEntry[]
}

const isApplePlatform =
    typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.userAgent)
const shortcutLabel = isApplePlatform ? '⌘K' : 'Ctrl K'

/** Navigasi sidebar di-flatten, lalu dikelompokkan ulang mengikuti label grup sidebar. */
function buildNavigationGroups(hasPermission: (code: string) => boolean): PaletteGroup[] {
    const grouped = new Map<NavGroupLabel, PaletteEntry[]>()
    const seenPaths = new Set<string>()

    const push = (group: NavGroupLabel, entry: PaletteEntry) => {
        if (seenPaths.has(entry.path)) return
        seenPaths.add(entry.path)
        grouped.set(group, [...(grouped.get(group) ?? []), entry])
    }

    for (const item of navItems) {
        if (item.permission && !hasPermission(item.permission)) continue

        const group = navGroupFor(item.path)
        push(group, { label: item.label, path: item.path, icon: item.icon })

        for (const child of item.children ?? []) {
            if (child.permission && !hasPermission(child.permission)) continue
            push(group, { label: child.label, path: child.path, icon: item.icon })
        }
    }

    return navGroupOrder
        .filter((label) => grouped.has(label))
        .map((label) => ({ label, items: grouped.get(label) ?? [] }))
}

type GlobalSearchProps = {
    theme: Theme
    onToggleTheme: () => void
    onLogout: () => void | Promise<void>
}

export function GlobalSearch({ theme, onToggleTheme, onLogout }: GlobalSearchProps) {
    const navigate = useNavigate()
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState('')
    const triggerRef = useRef<HTMLButtonElement>(null)

    const { hasPermission } = usePermissions()

    const handleOpenChange = useCallback((next: boolean) => {
        setOpen(next)
        if (!next) setQuery('')
    }, [])

    const runAction = useCallback(
        (action: () => void | Promise<void>) => {
            setOpen(false)
            void action()
        },
        []
    )

    useEffect(() => {
        const handleShortcut = (event: KeyboardEvent) => {
            if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'k') return

            event.preventDefault()
            // Fokus ke trigger dulu supaya Radix mengembalikan fokus ke sana saat dialog ditutup.
            triggerRef.current?.focus()
            setOpen(true)
        }

        window.addEventListener('keydown', handleShortcut)
        return () => window.removeEventListener('keydown', handleShortcut)
    }, [])

    const groups = buildNavigationGroups(hasPermission)

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                aria-label="Cari halaman atau aksi"
                aria-keyshortcuts={isApplePlatform ? 'Meta+K' : 'Control+K'}
                onClick={() => setOpen(true)}
                className="relative inline-flex h-7 w-7 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-2 text-[13px] font-normal text-muted-foreground transition-colors duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] after:absolute after:-inset-1.5 after:content-[''] hover:bg-muted/50 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none md:w-60 md:justify-start"
            >
                <HugeiconsIcon icon={SearchIcon} size={14} strokeWidth={1.8} className="shrink-0" />
                <span className="hidden md:inline">Cari</span>
                <Kbd className="ml-auto hidden h-5 rounded-[4px] border border-border bg-background/60 px-1.5 text-[11px] font-normal md:inline-flex">
                    {shortcutLabel}
                </Kbd>
            </button>

            <CommandDialog
                open={open}
                onOpenChange={handleOpenChange}
                title="Pencarian"
                description="Cari halaman atau jalankan aksi."
                className="rounded-[12px]! border border-border ring-0 sm:max-w-[574px] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.96] data-[state=open]:[animation-duration:200ms] data-[state=open]:[animation-timing-function:cubic-bezier(0.23,1,0.32,1)] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:[animation-duration:150ms] data-[state=closed]:[animation-timing-function:cubic-bezier(0.23,1,0.32,1)] motion-reduce:data-[state=open]:animate-none motion-reduce:data-[state=closed]:animate-none"
            >
                <CommandInput
                    placeholder="Cari halaman atau aksi..."
                    value={query}
                    onValueChange={setQuery}
                />
                <CommandList>
                    <CommandEmpty className="px-3 py-6 text-[13px] text-muted-foreground">
                        Tidak ada hasil untuk "{query}".
                        <span className="mt-1 block text-xs">
                            Coba kata kunci lain atau telusuri lewat sidebar.
                        </span>
                    </CommandEmpty>

                    {groups.map((group) => (
                        <CommandGroup key={group.label} heading={group.label}>
                            {group.items.map((entry) => (
                                <CommandItem
                                    key={entry.path}
                                    value={`${entry.label} ${entry.path}`}
                                    onSelect={() => {
                                        setOpen(false)
                                        navigate(entry.path)
                                    }}
                                    className="py-2 text-[14px] font-[450] transition-colors duration-150 ease-out"
                                >
                                    <HugeiconsIcon
                                        icon={entry.icon}
                                        size={16}
                                        strokeWidth={1.6}
                                        className="text-muted-foreground"
                                    />
                                    <span className="truncate">{entry.label}</span>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    ))}

                    <CommandGroup heading="Aksi">
                        <CommandItem
                            value="ganti tema"
                            onSelect={() => runAction(onToggleTheme)}
                            className="py-2 text-[14px] font-[450] transition-colors duration-150 ease-out"
                        >
                            <HugeiconsIcon
                                icon={theme === 'dark' ? Sun03Icon : Moon02Icon}
                                size={16}
                                strokeWidth={1.6}
                                className="text-muted-foreground"
                            />
                            <span>Ganti tema</span>
                        </CommandItem>
                        <CommandItem
                            value="keluar"
                            onSelect={() => runAction(onLogout)}
                            className="py-2 text-[14px] font-[450] transition-colors duration-150 ease-out"
                        >
                            <HugeiconsIcon
                                icon={Logout01Icon}
                                size={16}
                                strokeWidth={1.6}
                                className="text-muted-foreground"
                            />
                            <span>Keluar</span>
                        </CommandItem>
                    </CommandGroup>
                </CommandList>
            </CommandDialog>
        </>
    )
}
