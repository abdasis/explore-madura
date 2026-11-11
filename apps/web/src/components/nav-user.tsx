import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/components/ui/sidebar'
import { HugeiconsIcon } from '@hugeicons/react'
import { LogoutIcon, UnfoldMoreIcon } from '@hugeicons/core-free-icons'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '@/lib/auth'
import { initialsOf } from '@/lib/initials'

export function NavUser() {
    const { isMobile } = useSidebar()
    const { user, logout } = useAuth()
    const navigate = useNavigate()

    if (!user) return null

    const initials = initialsOf(user.name)

    const handleLogout = async () => {
        await logout()
        navigate('/login', { replace: true })
    }

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            size="lg"
                            tooltip={user.name}
                            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                        >
                            <Avatar className="size-8 rounded-md">
                                <AvatarFallback className="rounded-md text-xs font-medium">
                                    {initials}
                                </AvatarFallback>
                            </Avatar>
                            <div className="grid flex-1 gap-0.5 text-left leading-tight">
                                <span className="truncate text-sm font-medium">{user.name}</span>
                                <span className="truncate text-xs text-muted-foreground">
                                    {user.email}
                                </span>
                            </div>
                            <HugeiconsIcon
                                icon={UnfoldMoreIcon}
                                size={16}
                                strokeWidth={1.6}
                                className="ml-auto text-muted-foreground group-data-[collapsible=icon]:hidden"
                            />
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="min-w-56"
                        side={isMobile ? 'bottom' : 'right'}
                        align="end"
                        sideOffset={6}
                    >
                        <DropdownMenuLabel className="p-0 font-normal">
                            <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                                <Avatar className="size-8 rounded-md">
                                    <AvatarFallback className="rounded-md text-xs font-medium">
                                        {initials}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="grid flex-1 gap-0.5 text-left leading-tight">
                                    <span className="truncate font-medium">{user.name}</span>
                                    <span className="truncate text-xs text-muted-foreground">
                                        {user.email}
                                    </span>
                                </div>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => void handleLogout()}>
                            <HugeiconsIcon icon={LogoutIcon} strokeWidth={1.6} />
                            Keluar
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    )
}
