import { useEffect, useRef, useState, type ChangeEvent } from 'react'

import {
    AlertCircleIcon,
    ArrowLeft01Icon,
    Delete02Icon,
    Image01Icon,
    Tick02Icon,
    Upload01Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { CheckboxInput } from '@/components/form/checkbox-input'
import { TextInput } from '@/components/form/text-input'
import { TextareaInput } from '@/components/form/textarea-input'
import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { api, ApiError, apiErrorMessage } from '@/lib/api'
import { usePost } from '@/pages/posts/use-post'
import type { ApiEnvelope } from '@/types/api'
import type { AdminPost, PostInput } from '@/types/post'

const MAX_COVER_BYTES = 5 * 1024 * 1024
const COVER_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']

type FormValues = {
    title: string
    tag: string
    excerpt: string
    content: string
    isPublished: boolean
}

const EMPTY_FORM: FormValues = {
    title: '',
    tag: '',
    excerpt: '',
    content: '',
    isPublished: false,
}

const FIELD_IDS: Record<string, string> = {
    title: 'post-title',
    tag: 'post-tag',
    excerpt: 'post-excerpt',
    content: 'post-content',
}

const SERVER_FIELD_MAP: Record<string, string> = {
    title: 'title',
    tag: 'tag',
    excerpt: 'excerpt',
    content: 'content',
    is_published: 'isPublished',
}

function validate(values: FormValues): Record<string, string> {
    const errors: Record<string, string> = {}
    const title = values.title.trim()
    const tag = values.tag.trim()

    if (!title) errors.title = 'Judul artikel wajib diisi.'
    else if (title.length > 200) errors.title = 'Judul artikel maksimal 200 karakter.'

    if (!tag) errors.tag = 'Tag artikel wajib diisi.'
    else if (tag.length > 50) errors.tag = 'Tag artikel maksimal 50 karakter.'

    if (!values.excerpt.trim()) errors.excerpt = 'Ringkasan artikel wajib diisi.'
    else if (values.excerpt.length > 500) {
        errors.excerpt = 'Ringkasan maksimal 500 karakter.'
    }

    if (!values.content.trim()) errors.content = 'Isi artikel wajib diisi.'

    return errors
}

function buildInput(values: FormValues): PostInput {
    return {
        title: values.title.trim(),
        tag: values.tag.trim(),
        excerpt: values.excerpt.trim(),
        content: values.content.trim(),
        is_published: values.isPublished,
    }
}

const PostFormPage = () => {
    const params = useParams<{ id: string }>()
    const navigate = useNavigate()

    const isEdit = params.id !== undefined
    const postId = params.id && /^\d+$/.test(params.id) ? Number(params.id) : null

    const { post, isLoading, error, reload } = usePost(isEdit ? postId : null)

    const [values, setValues] = useState<FormValues>(EMPTY_FORM)
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
    const [formError, setFormError] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [coverFile, setCoverFile] = useState<File | null>(null)
    const [isDeletingCover, setIsDeletingCover] = useState(false)
    const [createdId, setCreatedId] = useState<number | null>(null)
    const hydratedIdRef = useRef<number | null>(null)
    const coverInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (!post) return
        if (hydratedIdRef.current === post.id) return

        setValues({
            title: post.title,
            tag: post.tag,
            excerpt: post.excerpt,
            content: post.content,
            isPublished: post.is_published,
        })
        setCoverFile(null)
        hydratedIdRef.current = post.id
    }, [post])

    const existingCover = post?.cover_url ?? ''
    const isFormUnavailable = isEdit && !post
    const isCoverBusy = isSubmitting || isDeletingCover

    const updateValue = <TKey extends keyof FormValues>(
        key: TKey,
        value: FormValues[TKey]
    ) => {
        setValues((previous) => ({ ...previous, [key]: value }))
    }

    const handleCoverChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] ?? null

        if (!file) {
            setCoverFile(null)
            return
        }

        if (!COVER_MIME_TYPES.includes(file.type)) {
            setCoverFile(null)
            event.target.value = ''
            setFieldErrors((previous) => ({
                ...previous,
                cover: 'Format cover harus JPEG, PNG, atau WebP.',
            }))
            return
        }

        if (file.size > MAX_COVER_BYTES) {
            setCoverFile(null)
            event.target.value = ''
            setFieldErrors((previous) => ({
                ...previous,
                cover: 'Ukuran cover maksimal 5 MB.',
            }))
            return
        }

        setCoverFile(file)
        setFieldErrors((previous) => ({ ...previous, cover: '' }))
    }

    const handleDeleteCover = async () => {
        if (isCoverBusy || !post) return

        setIsDeletingCover(true)
        setFormError(null)

        try {
            await api.del<void>(`/posts/${post.id}/cover`)
            setCoverFile(null)
            reload()
        } catch (requestError) {
            setFormError(apiErrorMessage(requestError, 'Gagal menghapus cover. Coba lagi ya.'))
        } finally {
            setIsDeletingCover(false)
        }
    }

    const handleSubmit = async () => {
        if (isSubmitting || isFormUnavailable) return

        const errors = validate(values)
        setFieldErrors(errors)
        setFormError(null)

        if (Object.keys(errors).length > 0) {
            const firstField = FIELD_IDS[Object.keys(errors)[0]]
            if (firstField) document.getElementById(firstField)?.focus()
            return
        }

        setIsSubmitting(true)

        try {
            const input = buildInput(values)
            let targetId: number

            if (isEdit && post) {
                const response = await api.put<ApiEnvelope<AdminPost>>(
                    `/posts/${post.id}`,
                    input
                )
                targetId = response.data.id
            } else if (createdId !== null) {
                const response = await api.put<ApiEnvelope<AdminPost>>(
                    `/posts/${createdId}`,
                    input
                )
                targetId = response.data.id
            } else {
                const response = await api.post<ApiEnvelope<AdminPost>>('/posts', input)
                targetId = response.data.id
                setCreatedId(response.data.id)
            }

            if (coverFile) {
                const formData = new FormData()
                formData.append('file', coverFile)
                await api.upload<unknown>(`/posts/${targetId}/cover`, formData)
            }

            navigate('/posts', { replace: true })
        } catch (requestError) {
            if (requestError instanceof ApiError && requestError.fields) {
                const mapped: Record<string, string> = {}
                const unmapped: string[] = []

                for (const [serverField, message] of Object.entries(requestError.fields)) {
                    const formField = SERVER_FIELD_MAP[serverField]

                    if (formField && FIELD_IDS[formField]) mapped[formField] = message
                    else unmapped.push(message)
                }

                setFieldErrors(mapped)
                setFormError(
                    unmapped.length > 0
                        ? unmapped.join(' ')
                        : 'Periksa kembali isian yang ditandai.'
                )

                const firstKey = Object.keys(mapped)[0]
                if (firstKey) document.getElementById(FIELD_IDS[firstKey])?.focus()
            } else {
                setFormError(
                    apiErrorMessage(requestError, 'Gagal menyimpan artikel. Coba lagi ya.')
                )
            }
        } finally {
            setIsSubmitting(false)
        }
    }

    const pageTitle = isEdit ? 'Ubah artikel' : 'Tulis artikel'
    const pageDescription = isEdit
        ? 'Perbarui judul, tag, ringkasan, isi, dan cover artikel.'
        : 'Lengkapi artikel fakta unik Madura lalu terbitkan supaya tampil di halaman blog publik.'

    return (
        <div className="space-y-5">
            <PageHeader
                title={pageTitle}
                description={pageDescription}
                actions={
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" asChild>
                            <Link to="/posts">
                                <HugeiconsIcon icon={ArrowLeft01Icon} size={15} strokeWidth={1.8} />
                                Batal
                            </Link>
                        </Button>
                        <Button
                            type="submit"
                            form="post-form"
                            size="sm"
                            disabled={isSubmitting || isFormUnavailable}
                        >
                            <HugeiconsIcon icon={Tick02Icon} size={15} strokeWidth={2} />
                            {isSubmitting ? 'Menyimpan...' : 'Simpan'}
                        </Button>
                    </div>
                }
            />

            {isEdit && isLoading && !post ? (
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
                    <Skeleton className="h-[560px] rounded-xl" />
                    <Skeleton className="h-[320px] rounded-xl" />
                </div>
            ) : null}

            {isEdit && error && !post ? (
                <Card>
                    <ErrorState description={error} onRetry={reload} />
                </Card>
            ) : null}

            {isEdit && error && post ? (
                <div
                    role="alert"
                    className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-[13px] text-destructive"
                >
                    {error}
                </div>
            ) : null}

            {isEdit && !isLoading && !error && !post ? (
                <Card>
                    <EmptyState
                        icon={
                            <HugeiconsIcon icon={AlertCircleIcon} size={30} strokeWidth={1.6} />
                        }
                        title="Artikel tidak ditemukan"
                        description="Data mungkin sudah dihapus. Kembali ke daftar artikel untuk memilih data lain."
                        action={
                            <Button variant="outline" size="sm" asChild>
                                <Link to="/posts">Kembali ke daftar</Link>
                            </Button>
                        }
                    />
                </Card>
            ) : null}

            {!isEdit || post ? (
                <form
                    id="post-form"
                    className="space-y-4"
                    onSubmit={(event) => {
                        event.preventDefault()
                        void handleSubmit()
                    }}
                >
                    {formError ? (
                        <div
                            role="alert"
                            className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-[13px] text-destructive"
                        >
                            {formError}
                        </div>
                    ) : null}

                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
                        <Card>
                            <CardHeader>
                                <CardTitle>Informasi artikel</CardTitle>
                                <CardDescription>
                                    Judul dan tag tampil di kartu blog. Isi artikel dirender per
                                    paragraf, pisahkan tiap paragraf dengan baris baru.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <TextInput
                                    id="post-title"
                                    label="Judul"
                                    value={values.title}
                                    onChange={(value) => updateValue('title', value)}
                                    placeholder="Contoh: Karapan Sapi, Tradisi Cepat dari Madura"
                                    hint="Maksimal 200 karakter."
                                    error={fieldErrors.title}
                                    maxLength={200}
                                    disabled={isSubmitting}
                                    required
                                />

                                <TextInput
                                    id="post-tag"
                                    label="Tag"
                                    value={values.tag}
                                    onChange={(value) => updateValue('tag', value)}
                                    placeholder="Contoh: Budaya"
                                    hint="Satu label pendek, maksimal 50 karakter."
                                    error={fieldErrors.tag}
                                    maxLength={50}
                                    disabled={isSubmitting}
                                    required
                                />

                                <TextareaInput
                                    id="post-excerpt"
                                    label="Ringkasan"
                                    value={values.excerpt}
                                    onChange={(value) => updateValue('excerpt', value)}
                                    placeholder="Ringkasan singkat yang tampil di kartu blog."
                                    hint="Maksimal 500 karakter."
                                    error={fieldErrors.excerpt}
                                    rows={4}
                                    maxLength={500}
                                    disabled={isSubmitting}
                                    required
                                />

                                <TextareaInput
                                    id="post-content"
                                    label="Isi artikel"
                                    value={values.content}
                                    onChange={(value) => updateValue('content', value)}
                                    placeholder="Tulis isi artikel. Pisahkan paragraf dengan baris baru."
                                    error={fieldErrors.content}
                                    rows={16}
                                    disabled={isSubmitting}
                                    required
                                />
                            </CardContent>
                        </Card>

                        <div className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Publikasi</CardTitle>
                                    <CardDescription>
                                        Artikel draf tidak muncul di halaman blog publik.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <CheckboxInput
                                        id="post-published"
                                        label="Terbitkan artikel"
                                        description="Pengunjung dapat membaca artikel ini di halaman blog."
                                        checked={values.isPublished}
                                        onChange={(checked) => updateValue('isPublished', checked)}
                                        disabled={isSubmitting}
                                    />
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Cover</CardTitle>
                                    <CardDescription>
                                        JPEG, PNG, atau WebP maksimal 5 MB. Cover tampil pada kartu
                                        dan halaman artikel.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {existingCover ? (
                                        <img
                                            src={existingCover}
                                            alt="Cover artikel"
                                            className="aspect-video w-full rounded-xl border border-border/60 object-cover"
                                        />
                                    ) : (
                                        <div className="grid aspect-video w-full place-items-center rounded-xl border border-dashed border-border/60 text-muted-foreground">
                                            <HugeiconsIcon
                                                icon={Image01Icon}
                                                size={30}
                                                strokeWidth={1.6}
                                                aria-hidden
                                            />
                                        </div>
                                    )}

                                    <input
                                        ref={coverInputRef}
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        className="sr-only"
                                        onChange={handleCoverChange}
                                        disabled={isCoverBusy}
                                    />

                                    <div className="flex flex-wrap items-center gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            disabled={isCoverBusy}
                                            onClick={() => coverInputRef.current?.click()}
                                        >
                                            <HugeiconsIcon
                                                icon={Upload01Icon}
                                                size={15}
                                                strokeWidth={1.8}
                                            />
                                            {coverFile || existingCover
                                                ? 'Ganti cover'
                                                : 'Pilih cover'}
                                        </Button>
                                        <span className="max-w-full truncate text-xs text-muted-foreground">
                                            {coverFile
                                                ? coverFile.name
                                                : existingCover
                                                  ? 'Cover saat ini terpasang.'
                                                  : 'Belum ada cover.'}
                                        </span>
                                    </div>

                                    <p className="text-xs text-muted-foreground">
                                        File diunggah setelah artikel disimpan.
                                    </p>

                                    {fieldErrors.cover ? (
                                        <p role="alert" className="text-xs text-destructive">
                                            {fieldErrors.cover}
                                        </p>
                                    ) : null}

                                    {isEdit && existingCover ? (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="xs"
                                            className="text-destructive hover:text-destructive"
                                            disabled={isCoverBusy}
                                            onClick={() => void handleDeleteCover()}
                                            aria-label="Hapus cover artikel"
                                        >
                                            <HugeiconsIcon
                                                icon={Delete02Icon}
                                                size={13}
                                                strokeWidth={2}
                                            />
                                            {isDeletingCover ? 'Menghapus...' : 'Hapus cover'}
                                        </Button>
                                    ) : null}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </form>
            ) : null}
        </div>
    )
}

export default PostFormPage
