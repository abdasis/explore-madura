/** Two-letter initials for avatars; `?` keeps the fallback visible for unnamed users. */
export function initialsOf(name: string): string {
    return (
        name
            .split(' ')
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part.charAt(0).toUpperCase())
            .join('') || '?'
    )
}
