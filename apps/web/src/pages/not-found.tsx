import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'

export default function NotFoundPage() {
    return (
        <div className="grid min-h-[60svh] place-items-center px-4 text-center">
            <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground">404</p>
                <h1 className="text-xl font-semibold tracking-tight">Halaman tidak ditemukan</h1>
                <p className="max-w-sm text-sm text-muted-foreground">
                    Alamat yang kamu buka tidak tersedia atau sudah dipindahkan.
                </p>
                <Button size="sm" asChild>
                    <Link to="/dashboard">Kembali ke beranda</Link>
                </Button>
            </div>
        </div>
    )
}
