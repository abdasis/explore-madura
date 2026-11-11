import type { PublicDestination } from '@/types/destination'

const rupiah = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
})

export function formatRupiah(value: number): string {
    return rupiah.format(value)
}

type PriceDestination = Pick<PublicDestination, 'is_free' | 'price_min' | 'price_max'>

export function formatPrice({ is_free, price_min, price_max }: PriceDestination): string {
    if (is_free) return 'Gratis'

    if (price_min === null) {
        return price_max === null ? 'Belum diatur' : formatRupiah(price_max)
    }
    if (price_max === null) return `Mulai ${formatRupiah(price_min)}`
    if (price_max === price_min) return formatRupiah(price_min)

    return `${formatRupiah(price_min)} - ${formatRupiah(price_max)}`
}

export function formatRating(value: number): string {
    return value.toFixed(1)
}
