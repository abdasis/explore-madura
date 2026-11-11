import { useRef, useState } from 'react'

import {
    Delete02Icon,
    Image01Icon,
    ImageAdd01Icon,
    Tick02Icon,
    Upload01Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { api, apiErrorMessage } from '@/lib/api'
import type { DestinationPhoto } from '@/types/destination'

type PhotoGalleryProps = {
    destinationId: number
    photos: DestinationPhoto[]
    onChanged: () => void
}

export function PhotoGallery({ destinationId, photos, onChanged }: PhotoGalleryProps) {
    const inputRef = useRef<HTMLInputElement>(null)
    const [isUploading, setIsUploading] = useState(false)
    const [progress, setProgress] = useState<string | null>(null)
    const [busyPhotoId, setBusyPhotoId] = useState<number | null>(null)
    const [error, setError] = useState<string | null>(null)

    const handleFiles = async (fileList: FileList | null) => {
        if (!fileList || fileList.length === 0) return

        const files = Array.from(fileList)
        setIsUploading(true)
        setError(null)
        let uploadedCount = 0

        try {
            for (const [index, file] of files.entries()) {
                setProgress(`Mengunggah ${index + 1} dari ${files.length}`)
                const formData = new FormData()
                formData.append('file', file)
                await api.upload<unknown>(`/destinations/${destinationId}/photos`, formData)
                uploadedCount += 1
            }
            onChanged()
        } catch (requestError) {
            setError(apiErrorMessage(requestError, 'Gagal mengunggah foto. Coba lagi ya.'))
            if (uploadedCount > 0) onChanged()
        } finally {
            setIsUploading(false)
            setProgress(null)
            if (inputRef.current) inputRef.current.value = ''
        }
    }

    const handleDelete = async (photo: DestinationPhoto) => {
        if (busyPhotoId !== null) return

        setBusyPhotoId(photo.id)
        setError(null)

        try {
            await api.del<void>(`/destinations/${destinationId}/photos/${photo.id}`)
            onChanged()
        } catch (requestError) {
            setError(apiErrorMessage(requestError, 'Gagal menghapus foto. Coba lagi ya.'))
        } finally {
            setBusyPhotoId(null)
        }
    }

    const handleSetCover = async (photo: DestinationPhoto) => {
        if (busyPhotoId !== null) return

        setBusyPhotoId(photo.id)
        setError(null)

        try {
            await api.put<unknown>(`/destinations/${destinationId}/photos/${photo.id}/cover`)
            onChanged()
        } catch (requestError) {
            setError(apiErrorMessage(requestError, 'Gagal menjadikan cover. Coba lagi ya.'))
        } finally {
            setBusyPhotoId(null)
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Galeri foto</CardTitle>
                <CardDescription>
                    Unggah banyak foto sekaligus, lalu pilih satu sebagai cover. JPEG, PNG, atau WebP
                    maksimal 5 MB per foto.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                    <input
                        ref={inputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        className="sr-only"
                        onChange={(event) => void handleFiles(event.target.files)}
                    />
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => inputRef.current?.click()}
                        disabled={isUploading}
                    >
                        <HugeiconsIcon
                            icon={Upload01Icon}
                            size={15}
                            strokeWidth={1.8}
                        />
                        {isUploading ? 'Mengunggah...' : 'Unggah foto'}
                    </Button>
                    {progress ? (
                        <span role="status" className="text-xs text-muted-foreground">
                            {progress}
                        </span>
                    ) : null}
                </div>

                {error ? (
                    <p role="alert" className="text-xs text-destructive">
                        {error}
                    </p>
                ) : null}

                {photos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/60 px-4 py-10 text-center">
                        <HugeiconsIcon
                            icon={Image01Icon}
                            size={30}
                            strokeWidth={1.6}
                            className="text-muted-foreground"
                        />
                        <p className="text-[13px] font-medium">Belum ada foto</p>
                        <p className="max-w-xs text-xs text-muted-foreground">
                            Peta dan panel publik akan memakai placeholder sampai foto pertama
                            diunggah.
                        </p>
                    </div>
                ) : (
                    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {photos.map((photo) => {
                            const isBusy = busyPhotoId === photo.id

                            return (
                                <li
                                    key={photo.id}
                                    className="overflow-hidden rounded-xl border border-border/60 bg-background"
                                >
                                    <img
                                        src={photo.url}
                                        alt={photo.caption || 'Foto destinasi'}
                                        loading="lazy"
                                        className="aspect-[4/3] w-full object-cover"
                                    />
                                    <div className="space-y-2 p-2">
                                        <div className="flex min-h-5 items-center justify-between gap-2">
                                            <p className="truncate text-xs text-muted-foreground">
                                                {photo.caption || 'Tanpa keterangan'}
                                            </p>
                                            {photo.is_cover ? (
                                                <Badge variant="success">Cover</Badge>
                                            ) : null}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-1">
                                            {photo.is_cover ? null : (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="xs"
                                                    disabled={isBusy}
                                                    onClick={() => void handleSetCover(photo)}
                                                    aria-label={`Jadikan cover foto ${photo.caption || photo.id}`}
                                                >
                                                    <HugeiconsIcon
                                                        icon={Tick02Icon}
                                                        size={13}
                                                        strokeWidth={2}
                                                    />
                                                    Jadikan cover
                                                </Button>
                                            )}
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="xs"
                                                className="text-destructive hover:text-destructive"
                                                disabled={isBusy}
                                                onClick={() => void handleDelete(photo)}
                                                aria-label={`Hapus foto ${photo.caption || photo.id}`}
                                            >
                                                <HugeiconsIcon
                                                    icon={Delete02Icon}
                                                    size={13}
                                                    strokeWidth={2}
                                                />
                                                Hapus
                                            </Button>
                                        </div>
                                    </div>
                                </li>
                            )
                        })}
                    </ul>
                )}

                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <HugeiconsIcon icon={ImageAdd01Icon} size={14} strokeWidth={1.8} aria-hidden />
                    Foto disimpan apa adanya, tanpa konversi atau thumbnail.
                </p>
            </CardContent>
        </Card>
    )
}
