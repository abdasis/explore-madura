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
import type { AdminPost } from '@/types/post'

type DeletePostDialogProps = {
    post: AdminPost | null
    onClose: () => void
    onDeleted: () => void
}

export function DeletePostDialog({ post, onClose, onDeleted }: DeletePostDialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (post) {
            setIsSubmitting(false)
            setError(null)
        }
    }, [post])

    const handleDelete = async () => {
        if (!post || isSubmitting) return

        setIsSubmitting(true)
        setError(null)

        try {
            await api.del<void>(`/posts/${post.id}`)
            onDeleted()
        } catch (requestError) {
            setError(apiErrorMessage(requestError, 'Gagal menghapus artikel. Coba lagi ya.'))
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog
            open={post !== null}
            onOpenChange={(open) => {
                if (!open && !isSubmitting) onClose()
            }}
        >
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Hapus artikel?</DialogTitle>
                    <DialogDescription>
                        {post
                            ? `${post.title} beserta cover-nya akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.`
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
                        {isSubmitting ? 'Menghapus...' : 'Hapus artikel'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
