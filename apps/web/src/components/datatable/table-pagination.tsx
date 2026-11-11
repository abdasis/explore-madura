import { useId } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
    ArrowLeft01Icon,
    ArrowLeftDoubleIcon,
    ArrowRight01Icon,
    ArrowRightDoubleIcon,
} from '@hugeicons/core-free-icons'

import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import type { PaginationMeta } from '@/types/api'

const PAGE_SIZES = [10, 25, 50, 100]

type TablePaginationProps = {
    meta: PaginationMeta
    disabled: boolean
    onPageChange: (page: number) => void
    onPerPageChange: (perPage: number) => void
}

export function TablePagination({ meta, disabled, onPageChange, onPerPageChange }: TablePaginationProps) {
    const sizeId = useId()
    const lastPage = Math.max(meta.total_pages, 1)
    const start = meta.total === 0 ? 0 : (meta.page - 1) * meta.per_page + 1
    const end = Math.min(meta.page * meta.per_page, meta.total)

    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
                Menampilkan <span className="tabular-nums">{start}</span>–<span className="tabular-nums">{end}</span>{' '}
                dari <span className="tabular-nums">{meta.total}</span> baris
            </p>

            <div className="flex flex-wrap items-center gap-2">
                <label htmlFor={sizeId} className="text-sm text-muted-foreground">
                    Baris
                </label>
                <Select
                    id={sizeId}
                    aria-label="Jumlah baris per halaman"
                    value={String(meta.per_page)}
                    onChange={(event) => onPerPageChange(Number(event.target.value))}
                    className="w-20"
                    disabled={disabled}
                >
                    {PAGE_SIZES.map((size) => (
                        <option key={size} value={size}>
                            {size}
                        </option>
                    ))}
                </Select>

                <div className="flex items-center gap-1">
                    <Button
                        variant="outline"
                        size="icon"
                        className="size-11 md:size-10"
                        aria-label="Halaman pertama"
                        disabled={disabled || meta.page <= 1}
                        onClick={() => onPageChange(1)}
                    >
                        <HugeiconsIcon icon={ArrowLeftDoubleIcon} size={16} />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        className="size-11 md:size-10"
                        aria-label="Halaman sebelumnya"
                        disabled={disabled || meta.page <= 1}
                        onClick={() => onPageChange(meta.page - 1)}
                    >
                        <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
                    </Button>

                    <p className="px-1 text-sm text-muted-foreground tabular-nums" aria-live="polite">
                        {meta.page} / {lastPage}
                    </p>

                    <Button
                        variant="outline"
                        size="icon"
                        className="size-11 md:size-10"
                        aria-label="Halaman berikutnya"
                        disabled={disabled || meta.page >= lastPage}
                        onClick={() => onPageChange(meta.page + 1)}
                    >
                        <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        className="size-11 md:size-10"
                        aria-label="Halaman terakhir"
                        disabled={disabled || meta.page >= lastPage}
                        onClick={() => onPageChange(lastPage)}
                    >
                        <HugeiconsIcon icon={ArrowRightDoubleIcon} size={16} />
                    </Button>
                </div>
            </div>
        </div>
    )
}
