import { useEffect, useRef, useState } from 'react'

import { nextSortValue, type TableQuery } from '@/components/datatable/types'

const SEARCH_DEBOUNCE_MS = 300

type UseTableQueryOptions = {
    query: TableQuery
    onQueryChange: (next: TableQuery) => void
}

export function useTableQuery({ query, onQueryChange }: UseTableQueryOptions) {
    const [search, setSearch] = useState(query.q)
    const queryRef = useRef(query)

    useEffect(() => {
        queryRef.current = query
    }, [query])

    useEffect(() => {
        setSearch(query.q)
    }, [query.q])

    useEffect(() => {
        if (search === queryRef.current.q) return

        const timer = window.setTimeout(() => {
            onQueryChange({ ...queryRef.current, q: search, page: 1 })
        }, SEARCH_DEBOUNCE_MS)

        return () => window.clearTimeout(timer)
    }, [search, onQueryChange])

    const handleSort = (field: string) => {
        onQueryChange({ ...query, sort: nextSortValue(query.sort, field), page: 1 })
    }

    const handlePageChange = (page: number) => {
        if (page === query.page) return
        onQueryChange({ ...query, page })
    }

    const handlePerPageChange = (perPage: number) => {
        if (perPage === query.per_page) return
        onQueryChange({ ...query, per_page: perPage, page: 1 })
    }

    const resetFilters = () => {
        setSearch('')
        onQueryChange({ ...query, q: '', filters: {}, page: 1 })
    }

    return {
        search,
        setSearch,
        handleSort,
        handlePageChange,
        handlePerPageChange,
        resetFilters,
    }
}
