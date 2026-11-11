import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
} from '@/components/ui/sidebar'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowRight01Icon } from '@hugeicons/core-free-icons'

export type NavMainItem = {
    title: string
    url: string
    icon?: ReactNode
    isActive?: boolean
    items?: {
        title: string
        url: string
        isActive?: boolean
    }[]
}

const touchTarget = 'h-8 max-md:h-11 text-[13px]'
const subTouchTarget = 'h-7 max-md:h-11 text-[13px]'

function NavGroup({ item }: { item: NavMainItem }) {
    const children = item.items ?? []
    const hasActiveChild = children.some((child) => child.isActive)
    const [open, setOpen] = useState(item.isActive === true || hasActiveChild)

    // Rute aktif membuka grupnya sendiri tanpa menutup grup lain.
    useEffect(() => {
        if (hasActiveChild) setOpen(true)
    }, [hasActiveChild])

    return (
        <Collapsible open={open} onOpenChange={setOpen} asChild className="group/collapsible">
            <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                        tooltip={item.title}
                        isActive={item.isActive || hasActiveChild}
                        className={touchTarget}
                    >
                        {item.icon}
                        <span>{item.title}</span>
                        <HugeiconsIcon
                            icon={ArrowRight01Icon}
                            size={16}
                            strokeWidth={1.6}
                            className="ml-auto text-muted-foreground transition-transform duration-200 ease-out group-data-[state=open]/collapsible:rotate-90 group-data-[collapsible=icon]:hidden motion-reduce:transition-none"
                        />
                    </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <SidebarMenuSub>
                        {children.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.url}>
                                <SidebarMenuSubButton
                                    asChild
                                    isActive={subItem.isActive}
                                    className={subTouchTarget}
                                >
                                    <Link
                                        to={subItem.url}
                                        aria-current={subItem.isActive ? 'page' : undefined}
                                    >
                                        <span>{subItem.title}</span>
                                    </Link>
                                </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                        ))}
                    </SidebarMenuSub>
                </CollapsibleContent>
            </SidebarMenuItem>
        </Collapsible>
    )
}

export type NavMainGroup = {
    label: string
    items: NavMainItem[]
}

function NavGroupItems({ items }: { items: NavMainItem[] }) {
    return (
        <>
            {items.map((item) =>
                item.items && item.items.length > 0 ? (
                    <NavGroup key={item.url} item={item} />
                ) : (
                    <SidebarMenuItem key={item.url}>
                        <SidebarMenuButton
                            asChild
                            tooltip={item.title}
                            isActive={item.isActive}
                            className={touchTarget}
                        >
                            <Link to={item.url} aria-current={item.isActive ? 'page' : undefined}>
                                {item.icon}
                                <span>{item.title}</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                )
            )}
        </>
    )
}

export function NavMain({ groups }: { groups: NavMainGroup[] }) {
    return (
        <nav aria-label="Navigasi samping" className="flex flex-col gap-0.5 py-0.5">
            {groups.map((group) => (
                <SidebarGroup key={group.label} className="py-0.5">
                    <SidebarGroupLabel className="h-6 px-1.5 text-[11px] font-semibold text-muted-foreground">
                        {group.label}
                    </SidebarGroupLabel>
                    <SidebarMenu className="gap-0.5">
                        <NavGroupItems items={group.items} />
                    </SidebarMenu>
                </SidebarGroup>
            ))}
        </nav>
    )
}
