import { useEffect, useState } from 'react'

import { AlertCircleIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { api, apiErrorMessage } from '@/lib/api'
import type { AdminDestination } from '@/types/destination'

type DeleteDestinationDialogProps = {
    destination: AdminDestination | null
    onClose: () => void
    onDeleted: () => void
}

export function DeleteDestinationDialog({
    destination,
    onClose,
    onDeleted,
}: DeleteDestinationDialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (destination) {
            setIsSubmitting(false)
            setError(null)
        }
    }, [destination])

    const handleDelete = async () => {
        if (!destination || isSubmitting) return

        setIsSubmitting(true)
        setError(null)

        try {
            await api.del<void>(`/destinations/${destination.id}`)
            onDeleted()
        } catch (requestError) {
            setError(
                apiErrorMessage(requestError, 'Gagal menghapus destinasi. Coba lagi ya.')
            )
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog
            open={destination !== null}
            onOpenChange={(open) => {
                if (!open && !isSubmitting) onClose()
            }}
        >
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Hapus destinasi?</DialogTitle>
                    <DialogDescription>
                        {destination
                            ? `${destination.name} beserta seluruh fotonya akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.`
                            : ''}
                    </DialogDescription>
                </DialogHeader>

                {error ? (
                    <p role="alert" className="flex items-start gap-1.5 text-xs text-destructive">
                        <HugeiconsIcon
                            icon={AlertCircleIcon}
                            size={14}
                            className="mt-0.5 shrink-0"
                            aria-hidden
                        />
                        {error}
                    </p>
                ) : null}

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
                        Batal
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={() => void handleDelete()}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Menghapus...' : 'Hapus destinasi'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
