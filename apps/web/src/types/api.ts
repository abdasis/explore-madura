export type PaginationMeta = {
    page: number
    per_page: number
    total: number
    total_pages: number
}

export type ApiEnvelope<TData> = {
    data: TData
}

export type Paginated<TData> = {
    data: TData[]
    meta: PaginationMeta
}

export type ApiFieldErrors = Record<string, string>

export type ApiErrorBody = {
    error: {
        code: string
        message: string
        fields?: ApiFieldErrors
    }
}

export type User = {
    id: number
    name: string
    email: string
    permissions: string[]
}

export type LoginResponse = {
    data: {
        token: string
        user: User
    }
}

export type MeResponse = {
    data: {
        user: User
    }
}

export type Note = {
    id: number
    title: string
    body: string
    created_at: string
    updated_at: string
}

export type NoteInput = {
    title: string
    body: string
}
