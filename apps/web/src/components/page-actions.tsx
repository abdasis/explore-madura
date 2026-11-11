import { createContext, useContext, useMemo, useState, type PropsWithChildren } from 'react'

type PageActionsStore = {
    element: HTMLElement | null
    setElement: (element: HTMLElement | null) => void
}

const PageActionsContext = createContext<PageActionsStore | null>(null)

export function PageActionsProvider({ children }: PropsWithChildren) {
    const [element, setElement] = useState<HTMLElement | null>(null)
    const store = useMemo(() => ({ element, setElement }), [element])

    return <PageActionsContext.Provider value={store}>{children}</PageActionsContext.Provider>
}

/** Slot toolbar di baris breadcrumb. Null saat dipakai di luar AppLayout. */
export function usePageActions(): PageActionsStore | null {
    return useContext(PageActionsContext)
}

export function PageActionsSlot() {
    const store = usePageActions()

    return (
        <div
            ref={(element) => {
                store?.setElement(element)
            }}
            role="toolbar"
            aria-label="Aksi halaman"
            className="scrollbar-none -mx-1 ml-auto flex shrink-0 items-center gap-1.5 overflow-x-auto px-1"
        />
    )
}
