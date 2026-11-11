import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type PropsWithChildren,
} from 'react'

import { api, ApiError, getStoredToken, setStoredToken, setUnauthorizedHandler } from '@/lib/api'
import type { LoginResponse, MeResponse, User } from '@/types/api'

export type AuthStatus = 'loading' | 'ready' | 'error'

type AuthContextValue = {
    user: User | null
    status: AuthStatus
    hasPermission: (code: string) => boolean
    login: (email: string, password: string) => Promise<void>
    logout: () => Promise<void>
    refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: PropsWithChildren) {
    const [user, setUser] = useState<User | null>(null)
    const [status, setStatus] = useState<AuthStatus>(() => (getStoredToken() ? 'loading' : 'ready'))

    const refresh = useCallback(async () => {
        if (!getStoredToken()) {
            setUser(null)
            setStatus('ready')
            return
        }

        setStatus('loading')

        try {
            const response = await api.get<MeResponse>('/auth/me')
            setUser(response.data.user)
            setStatus('ready')
        } catch (error) {
            if (error instanceof ApiError && error.status === 401) {
                setStoredToken(null)
                setUser(null)
                setStatus('ready')
                return
            }

            setStatus('error')
        }
    }, [])

    const login = useCallback(async (email: string, password: string) => {
        const response = await api.post<LoginResponse>(
            '/auth/login',
            { email, password },
            { skipUnauthorizedHandler: true }
        )

        setStoredToken(response.data.token)
        setUser(response.data.user)
        setStatus('ready')
    }, [])

    const logout = useCallback(async () => {
        try {
            await api.post<void>('/auth/logout', undefined, { skipUnauthorizedHandler: true })
        } catch {
            // Token tetap dibersihkan di klien walaupun server tidak dapat dihubungi.
        }

        setStoredToken(null)
        setUser(null)
        setStatus('ready')
    }, [])

    const hasPermission = useCallback(
        (code: string) => user?.permissions.includes(code) ?? false,
        [user]
    )

    useEffect(() => {
        setUnauthorizedHandler(() => {
            setStoredToken(null)
            setUser(null)
            setStatus('ready')
        })
        return () => setUnauthorizedHandler(null)
    }, [])

    useEffect(() => {
        void refresh()
    }, [refresh])

    const value = useMemo<AuthContextValue>(
        () => ({ user, status, hasPermission, login, logout, refresh }),
        [user, status, hasPermission, login, logout, refresh]
    )

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
    const context = useContext(AuthContext)
    if (!context) throw new Error('useAuth must be used inside AuthProvider')
    return context
}
