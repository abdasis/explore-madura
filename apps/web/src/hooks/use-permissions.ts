import { useCallback } from 'react'

import { useAuth } from '@/lib/auth'

export function usePermissions() {
    const { hasPermission } = useAuth()

    const hasAny = useCallback(
        (codes: string[]) => codes.length === 0 || codes.some((code) => hasPermission(code)),
        [hasPermission]
    )

    return { hasPermission, hasAny }
}
