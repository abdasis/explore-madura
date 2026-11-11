import { Link } from 'react-router-dom'

import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export default function DashboardPage() {
    return (
        <div className="space-y-5">
            <PageHeader
                title="Beranda"
                description="Kelola informasi wisata Kabupaten Bangkalan dari satu tempat."
                actions={
                    <Button variant="outline" size="sm" asChild>
                        <Link to="/">Lihat peta publik</Link>
                    </Button>
                }
            />

            <Card className="gap-0 overflow-hidden py-0">
                <EmptyState
                    title="Destinasi belum tersedia"
                    description="Tambahkan destinasi pertama supaya titik wisata muncul di peta publik."
                    action={
                        <Button size="sm" asChild>
                            <Link to="/destinations/new">Tambah destinasi</Link>
                        </Button>
                    }
                />
            </Card>
        </div>
    )
}
