import type { PropsWithChildren } from 'react'
import { Link } from 'react-router-dom'

import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { usePermissions } from '@/hooks/use-permissions'

/** Route guard that renders a denial view instead of the page without its permission. */
export function RequirePermission({
    permission,
    children,
}: PropsWithChildren<{ permission: string | string[] }>) {
    const { hasPermission, hasAny } = usePermissions()
    const allowed = Array.isArray(permission) ? hasAny(permission) : hasPermission(permission)

    if (allowed) return <>{children}</>

    return (
        <div className="space-y-6">
            <PageHeader
                title="Akses ditolak"
                description="Halaman ini memerlukan hak akses yang tidak dimiliki akun ini."
            />
            <EmptyState
                title="Tidak punya izin"
                description="Hubungi admin bila akses ini memang dibutuhkan."
                action={
                    <Button asChild variant="outline" size="sm">
                        <Link to="/dashboard">Kembali ke beranda</Link>
                    </Button>
                }
            />
        </div>
    )
}
