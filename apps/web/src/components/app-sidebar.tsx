import { HugeiconsIcon } from '@hugeicons/react'
import { Link, useLocation } from 'react-router-dom'

import { NavMain, type NavMainGroup, type NavMainItem } from '@/components/nav-main'
import { NavUser } from '@/components/nav-user'
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
} from '@/components/ui/sidebar'
import { usePermissions } from '@/hooks/use-permissions'
import { navGroupFor, navGroupOrder, navItems } from '@/lib/navigation'

export function AppSidebar({ className }: { className?: string }) {
    const { pathname } = useLocation()
    const { hasPermission } = usePermissions()

    const items: NavMainItem[] = navItems
        .filter((item) => !item.permission || hasPermission(item.permission))
        .map((item) => ({
            title: item.label,
            url: item.path,
            icon: (
                <HugeiconsIcon
                    icon={item.icon}
                    size={16}
                    strokeWidth={1.6}
                    className="size-4!"
                />
            ),
            isActive:
                item.path === '/'
                    ? pathname === '/'
                    : pathname === item.path || pathname.startsWith(`${item.path}/`),
        }))

    const groupedItems = new Map<string, NavMainItem[]>()
    for (const item of items) {
        const label = navGroupFor(item.url)
        groupedItems.set(label, [...(groupedItems.get(label) ?? []), item])
    }

    const groups: NavMainGroup[] = navGroupOrder
        .filter((label) => groupedItems.has(label))
        .map((label) => ({ label, items: groupedItems.get(label) ?? [] }))

    return (
        <Sidebar
            collapsible="icon"
            className={`[&_[data-slot=sidebar-inner]]:bg-card ${className ?? ''}`}
        >
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild size="lg" tooltip="Explore Madura">
                            <Link to="/dashboard" aria-label="Explore Madura, buka beranda">
                                <div className="grid aspect-square size-8 shrink-0 place-items-center rounded-md bg-primary text-xs font-semibold tracking-wide text-primary-foreground">
                                    EM
                                </div>
                                <div className="grid flex-1 gap-0.5 text-left leading-tight">
                                    <span className="truncate text-sm font-semibold tracking-tight">
                                        Explore Madura
                                    </span>
                                    <span className="truncate text-xs text-muted-foreground">
                                        Admin wisata
                                    </span>
                                </div>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                <NavMain groups={groups} />
            </SidebarContent>
            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    )
}
