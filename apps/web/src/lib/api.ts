import type { ApiErrorBody, ApiFieldErrors } from '@/types/api'

const API_BASE = '/api/v1'
const TOKEN_STORAGE_KEY = 'bangkalan_token'

let unauthorizedHandler: (() => void) | null = null

export function getStoredToken(): string | null {
    try {
        return localStorage.getItem(TOKEN_STORAGE_KEY)
    } catch {
        return null
    }
}

export function setStoredToken(token: string | null) {
    try {
        if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token)
        else localStorage.removeItem(TOKEN_STORAGE_KEY)
    } catch {
        // Penyimpanan token bersifat opsional; sesi tetap berjalan selama halaman terbuka.
    }
}

export function setUnauthorizedHandler(handler: (() => void) | null) {
    unauthorizedHandler = handler
}

export class ApiError extends Error {
    readonly code: string
    readonly fields?: ApiFieldErrors
    readonly status: number

    constructor(status: number, code: string, message: string, fields?: ApiFieldErrors) {
        super(message)
        this.name = 'ApiError'
        this.status = status
        this.code = code
        this.fields = fields
    }
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

type RequestOptions = {
    method?: HttpMethod
    body?: unknown
    signal?: AbortSignal
    headers?: Record<string, string>
    skipUnauthorizedHandler?: boolean
}

async function readJson(response: Response): Promise<unknown> {
    const contentType = response.headers.get('content-type') ?? ''
    if (!contentType.includes('application/json')) return null
    return response.json() as Promise<unknown>
}

function toApiError(status: number, payload: unknown): ApiError {
    const detail = (payload as ApiErrorBody | null)?.error
    return new ApiError(
        status,
        detail?.code ?? 'internal_error',
        detail?.message ?? 'Terjadi kesalahan. Coba lagi ya.',
        detail?.fields
    )
}

export function apiErrorMessage(error: unknown, fallback = 'Terjadi kesalahan. Coba lagi ya.'): string {
    return error instanceof ApiError ? error.message : fallback
}

export async function apiRequest<TData>(path: string, options: RequestOptions = {}): Promise<TData> {
    const method = options.method ?? 'GET'
    const headers: Record<string, string> = { Accept: 'application/json', ...options.headers }
    const token = getStoredToken()

    if (options.body !== undefined) headers['Content-Type'] = 'application/json'
    if (token) headers.Authorization = `Bearer ${token}`

    const response = await fetch(`${API_BASE}${path}`, {
        method,
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: options.signal,
    })

    if (
        response.status === 401 &&
        !options.skipUnauthorizedHandler &&
        !path.startsWith('/auth/login')
    ) {
        unauthorizedHandler?.()
    }

    const payload = await readJson(response)

    if (!response.ok) throw toApiError(response.status, payload)
    if (response.status === 204) return undefined as TData

    return payload as TData
}

export async function apiUpload<TData>(path: string, formData: FormData): Promise<TData> {
    const headers: Record<string, string> = { Accept: 'application/json' }
    const token = getStoredToken()
    if (token) headers.Authorization = `Bearer ${token}`

    const response = await fetch(`${API_BASE}${path}`, {
        method: 'POST',
        headers,
        body: formData,
    })

    if (response.status === 401) unauthorizedHandler?.()

    const payload = await readJson(response)

    if (!response.ok) throw toApiError(response.status, payload)
    if (response.status === 204) return undefined as TData

    return payload as TData
}

export const api = {
    get: <TData>(path: string, signal?: AbortSignal) =>
        apiRequest<TData>(path, { signal }),
    post: <TData>(path: string, body?: unknown, options?: Pick<RequestOptions, 'skipUnauthorizedHandler'>) =>
        apiRequest<TData>(path, { method: 'POST', body, ...options }),
    put: <TData>(path: string, body?: unknown) =>
        apiRequest<TData>(path, { method: 'PUT', body }),
    del: <TData>(path: string) => apiRequest<TData>(path, { method: 'DELETE' }),
    upload: <TData>(path: string, formData: FormData) => apiUpload<TData>(path, formData),
}

export function buildQuery(params: Record<string, string | number | null | undefined>): string {
    const search = new URLSearchParams()

    for (const [key, value] of Object.entries(params)) {
        if (value === null || value === undefined || value === '') continue
        search.set(key, String(value))
    }

    const query = search.toString()
    return query ? `?${query}` : ''
}
