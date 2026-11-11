const dateFormatter = new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
})

const dateTimeFormatter = new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
})

/** Format an ISO date (`YYYY-MM-DD`) as a readable Indonesian date. */
export function formatDate(value: string | null | undefined): string {
    if (!value) return '—'

    const [year, month, day] = value.slice(0, 10).split('-').map(Number)
    if (!year || !month || !day) return '—'

    return dateFormatter.format(new Date(year, month - 1, day))
}

/** Format an RFC 3339 timestamp in the browser's local timezone. */
export function formatDateTime(value: string | null | undefined): string {
    if (!value) return '—'

    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '—'

    return dateTimeFormatter.format(date)
}

/** Local calendar date as `YYYY-MM-DD`, without UTC shifting. */
export function todayIsoDate(): string {
    return toLocalIsoDate(new Date())
}

/** Calendar date of a timestamp in the browser's local timezone, as `YYYY-MM-DD`. */
export function toLocalIsoDate(value: Date | string): string {
    const date = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(date.getTime())) return ''

    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    return local.toISOString().slice(0, 10)
}
