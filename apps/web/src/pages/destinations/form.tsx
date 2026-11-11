import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'

import {
    AlertCircleIcon,
    ArrowLeft01Icon,
    Delete02Icon,
    Tick02Icon,
    Upload01Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { CheckboxInput } from '@/components/form/checkbox-input'
import { SelectInput } from '@/components/form/select-input'
import { TextInput } from '@/components/form/text-input'
import { TextareaInput } from '@/components/form/textarea-input'
import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { api, ApiError, apiErrorMessage } from '@/lib/api'
import { normalizeVideoEmbedUrl } from '@/lib/video'
import { MapPicker } from '@/pages/destinations/map-picker'
import { PhotoGallery } from '@/pages/destinations/photo-gallery'
import { useDestination } from '@/pages/destinations/use-destination'
import { useDestinationCategories } from '@/pages/destinations/use-destination-categories'
import type { ApiEnvelope } from '@/types/api'
import type { AdminDestinationDetail, DestinationInput } from '@/types/destination'

type VideoSource = 'none' | 'file' | 'embed'

const MAX_VIDEO_BYTES = 50 * 1024 * 1024
const VIDEO_MIME_TYPES = ['video/mp4', 'video/webm']

type FormValues = {
    name: string
    categoryId: string
    description: string
    address: string
    latitude: string
    longitude: string
    rating: string
    isFree: boolean
    priceMin: string
    priceMax: string
    openingHours: string
    contact: string
    facilities: string
    isPublished: boolean
    videoSource: VideoSource
    videoUrl: string
}

const EMPTY_FORM: FormValues = {
    name: '',
    categoryId: '',
    description: '',
    address: '',
    latitude: '',
    longitude: '',
    rating: '0',
    isFree: false,
    priceMin: '',
    priceMax: '',
    openingHours: '',
    contact: '',
    facilities: '',
    isPublished: true,
    videoSource: 'none',
    videoUrl: '',
}

const FIELD_IDS: Record<string, string> = {
    name: 'destination-name',
    categoryId: 'destination-category',
    description: 'destination-description',
    address: 'destination-address',
    latitude: 'destination-latitude',
    longitude: 'destination-longitude',
    rating: 'destination-rating',
    priceMin: 'destination-price-min',
    priceMax: 'destination-price-max',
    openingHours: 'destination-opening-hours',
    contact: 'destination-contact',
    facilities: 'destination-facilities',
    videoSource: 'destination-video-source',
    videoUrl: 'destination-video-url',
    videoFile: 'destination-video-file',
}

const SERVER_FIELD_MAP: Record<string, string> = {
    name: 'name',
    category_id: 'categoryId',
    description: 'description',
    address: 'address',
    latitude: 'latitude',
    longitude: 'longitude',
    rating: 'rating',
    is_free: 'isFree',
    price_min: 'priceMin',
    price_max: 'priceMax',
    opening_hours: 'openingHours',
    contact: 'contact',
    facilities: 'facilities',
    is_published: 'isPublished',
    video_kind: 'videoSource',
    video_url: 'videoUrl',
    file: 'videoFile',
}

function parseDecimal(value: string): number | null {
    if (value.trim() === '') return null
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
}

function parseWholeNumber(value: string): number | null {
    const parsed = parseDecimal(value)
    if (parsed === null || !Number.isInteger(parsed)) return null
    return parsed
}

function videoFileName(url: string): string {
    const name = url.split('/').pop()
    return name && name !== '' ? name : 'Video terunggah'
}

function validate(
    values: FormValues,
    videoFile: File | null
): Record<string, string> {
    const errors: Record<string, string> = {}
    const name = values.name.trim()

    if (!name) errors.name = 'Nama destinasi wajib diisi.'
    else if (name.length > 150) errors.name = 'Nama destinasi maksimal 150 karakter.'

    if (!values.categoryId) errors.categoryId = 'Pilih kategori destinasi.'
    if (values.description.length > 5000) {
        errors.description = 'Deskripsi maksimal 5000 karakter.'
    }
    if (values.address.length > 300) errors.address = 'Alamat maksimal 300 karakter.'
    if (values.facilities.length > 1000) {
        errors.facilities = 'Fasilitas maksimal 1000 karakter.'
    }
    if (values.openingHours.length > 200) {
        errors.openingHours = 'Jam buka maksimal 200 karakter.'
    }
    if (values.contact.length > 120) errors.contact = 'Kontak maksimal 120 karakter.'

    const latitude = parseDecimal(values.latitude)
    if (latitude === null || latitude < -90 || latitude > 90) {
        errors.latitude = 'Latitude harus angka antara -90 dan 90.'
    }

    const longitude = parseDecimal(values.longitude)
    if (longitude === null || longitude < -180 || longitude > 180) {
        errors.longitude = 'Longitude harus angka antara -180 dan 180.'
    }

    const rating = parseDecimal(values.rating)
    if (rating === null || rating < 0 || rating > 5) {
        errors.rating = 'Rating harus angka antara 0 dan 5.'
    }

    if (values.videoSource === 'embed') {
        const url = values.videoUrl.trim()
        if (!url) errors.videoUrl = 'Isi tautan video.'
        else if (!/^https?:\/\//i.test(url)) {
            errors.videoUrl = 'Tautan video harus diawali http:// atau https://.'
        }
    }

    if (videoFile && videoFile.size > MAX_VIDEO_BYTES) {
        errors.videoFile = 'Ukuran video maksimal 50 MB.'
    }

    if (!values.isFree) {
        const priceMin = parseWholeNumber(values.priceMin)
        if (priceMin === null || priceMin < 0) {
            errors.priceMin = 'Harga minimum wajib diisi dengan angka 0 atau lebih.'
        }

        if (values.priceMax.trim() !== '') {
            const priceMax = parseWholeNumber(values.priceMax)
            if (priceMax === null || priceMax < 0) {
                errors.priceMax = 'Harga maksimum harus angka 0 atau lebih.'
            } else if (priceMin !== null && priceMax < priceMin) {
                errors.priceMax = 'Harga maksimum tidak boleh lebih kecil dari harga minimum.'
            }
        }
    }

    return errors
}

function buildInput(values: FormValues): DestinationInput {
    const input: DestinationInput = {
        name: values.name.trim(),
        category_id: Number(values.categoryId),
        description: values.description.trim(),
        address: values.address.trim(),
        latitude: Number(values.latitude),
        longitude: Number(values.longitude),
        rating: Number(values.rating),
        is_free: values.isFree,
        price_min:
            values.isFree || values.priceMin.trim() === ''
                ? null
                : Number(values.priceMin),
        price_max:
            values.isFree || values.priceMax.trim() === ''
                ? null
                : Number(values.priceMax),
        opening_hours: values.openingHours.trim(),
        contact: values.contact.trim(),
        facilities: values.facilities.trim(),
        is_published: values.isPublished,
    }

    // Sumber `file` sengaja tidak mengirim field video: backend mempertahankan
    // video lama, lalu file baru diunggah lewat endpoint video setelah simpan.
    if (values.videoSource === 'embed') {
        input.video_kind = 'embed'
        input.video_url = normalizeVideoEmbedUrl(values.videoUrl)
    } else if (values.videoSource === 'none') {
        input.video_kind = ''
        input.video_url = ''
    }

    return input
}

const DestinationFormPage = () => {
    const params = useParams<{ id: string }>()
    const navigate = useNavigate()

    const isEdit = params.id !== undefined
    const destinationId =
        params.id && /^\d+$/.test(params.id) ? Number(params.id) : null

    const { destination, isLoading, error, reload } = useDestination(
        isEdit ? destinationId : null
    )
    const { categories, isLoading: isLoadingCategories, error: categoriesError } =
        useDestinationCategories()

    const [values, setValues] = useState<FormValues>(EMPTY_FORM)
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
    const [formError, setFormError] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [videoFile, setVideoFile] = useState<File | null>(null)
    const [isDeletingVideo, setIsDeletingVideo] = useState(false)
    const [createdId, setCreatedId] = useState<number | null>(null)
    const hydratedIdRef = useRef<number | null>(null)
    const videoInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (!destination) return
        if (hydratedIdRef.current === destination.id) return

        setValues({
            name: destination.name,
            categoryId: String(destination.category.id),
            description: destination.description,
            address: destination.address,
            latitude: String(destination.latitude),
            longitude: String(destination.longitude),
            rating: String(destination.rating),
            isFree: destination.is_free,
            priceMin: destination.price_min === null ? '' : String(destination.price_min),
            priceMax: destination.price_max === null ? '' : String(destination.price_max),
            openingHours: destination.opening_hours,
            contact: destination.contact,
            facilities: destination.facilities,
            isPublished: destination.is_published,
            videoSource: destination.video?.kind ?? 'none',
            videoUrl: destination.video?.kind === 'embed' ? destination.video.url : '',
        })
        setVideoFile(null)

        hydratedIdRef.current = destination.id
    }, [destination])

    const categoryOptions = useMemo(
        () => categories.map((category) => ({ value: String(category.id), label: category.name })),
        [categories]
    )

    const latitude = parseDecimal(values.latitude)
    const longitude = parseDecimal(values.longitude)
    const isFormUnavailable = isEdit && !destination
    const existingVideo = destination?.video ?? null
    const isVideoBusy = isSubmitting || isDeletingVideo

    const updateValue = <TKey extends keyof FormValues>(
        key: TKey,
        value: FormValues[TKey]
    ) => {
        setValues((previous) => ({ ...previous, [key]: value }))
    }

    const handleVideoFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] ?? null

        if (!file) {
            setVideoFile(null)
            return
        }

        if (!VIDEO_MIME_TYPES.includes(file.type)) {
            setVideoFile(null)
            event.target.value = ''
            setFieldErrors((previous) => ({
                ...previous,
                videoFile: 'Format video harus MP4 atau WebM.',
            }))
            return
        }

        if (file.size > MAX_VIDEO_BYTES) {
            setVideoFile(null)
            event.target.value = ''
            setFieldErrors((previous) => ({
                ...previous,
                videoFile: 'Ukuran video maksimal 50 MB.',
            }))
            return
        }

        setVideoFile(file)
        setFieldErrors((previous) => ({ ...previous, videoFile: '' }))
    }

    const handleDeleteVideo = async () => {
        if (isSubmitting || isDeletingVideo || !destination) return

        setIsDeletingVideo(true)
        setFormError(null)

        try {
            await api.del<void>(`/destinations/${destination.id}/video`)
            setVideoFile(null)
            setValues((previous) => ({
                ...previous,
                videoSource: 'none',
                videoUrl: '',
            }))
            reload()
        } catch (requestError) {
            setFormError(
                apiErrorMessage(requestError, 'Gagal menghapus video. Coba lagi ya.')
            )
        } finally {
            setIsDeletingVideo(false)
        }
    }

    const handleSubmit = async () => {
        if (isSubmitting || isFormUnavailable) return

        const errors = validate(values, videoFile)
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

            if (isEdit && destination) {
                const response = await api.put<ApiEnvelope<AdminDestinationDetail>>(
                    `/destinations/${destination.id}`,
                    input
                )
                targetId = response.data.id
            } else if (createdId !== null) {
                const response = await api.put<ApiEnvelope<AdminDestinationDetail>>(
                    `/destinations/${createdId}`,
                    input
                )
                targetId = response.data.id
            } else {
                const response = await api.post<ApiEnvelope<AdminDestinationDetail>>(
                    '/destinations',
                    input
                )
                targetId = response.data.id
                setCreatedId(response.data.id)
            }

            if (values.videoSource === 'file' && videoFile) {
                const formData = new FormData()
                formData.append('file', videoFile)
                await api.upload<unknown>(`/destinations/${targetId}/video`, formData)
            }

            if (values.videoSource === 'none' && isEdit && destination?.video) {
                await api.del<void>(`/destinations/${targetId}/video`)
            }

            navigate('/destinations', { replace: true })
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
                    apiErrorMessage(requestError, 'Gagal menyimpan destinasi. Coba lagi ya.')
                )
            }
        } finally {
            setIsSubmitting(false)
        }
    }

    const pageTitle = isEdit ? 'Ubah destinasi' : 'Tambah destinasi'
    const pageDescription = isEdit
        ? 'Perbarui informasi destinasi, koordinat peta, rating, harga, dan galeri foto.'
        : 'Lengkapi informasi destinasi supaya titik wisata tampil di peta publik.'

    return (
        <div className="space-y-5">
            <PageHeader
                title={pageTitle}
                description={pageDescription}
                actions={
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" asChild>
                            <Link to="/destinations">
                                <HugeiconsIcon
                                    icon={ArrowLeft01Icon}
                                    size={15}
                                    strokeWidth={1.8}
                                />
                                Batal
                            </Link>
                        </Button>
                        <Button
                            type="submit"
                            form="destination-form"
                            size="sm"
                            disabled={isSubmitting || isFormUnavailable}
                        >
                            <HugeiconsIcon
                                icon={Tick02Icon}
                                size={15}
                                strokeWidth={2}
                            />
                            {isSubmitting ? 'Menyimpan...' : 'Simpan'}
                        </Button>
                    </div>
                }
            />

            {isEdit && isLoading && !destination ? (
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
                    <Skeleton className="h-[560px] rounded-xl" />
                    <Skeleton className="h-[320px] rounded-xl" />
                </div>
            ) : null}

            {isEdit && error && !destination ? (
                <Card>
                    <ErrorState description={error} onRetry={reload} />
                </Card>
            ) : null}

            {isEdit && error && destination ? (
                <div
                    role="alert"
                    className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-[13px] text-destructive"
                >
                    {error}
                </div>
            ) : null}

            {isEdit && !isLoading && !error && !destination ? (
                <Card>
                    <EmptyState
                        icon={
                            <HugeiconsIcon
                                icon={AlertCircleIcon}
                                size={30}
                                strokeWidth={1.6}
                            />
                        }
                        title="Destinasi tidak ditemukan"
                        description="Data mungkin sudah dihapus. Kembali ke daftar destinasi untuk memilih data lain."
                        action={
                            <Button variant="outline" size="sm" asChild>
                                <Link to="/destinations">Kembali ke daftar</Link>
                            </Button>
                        }
                    />
                </Card>
            ) : null}

            {!isEdit || destination ? (
                <form
                    id="destination-form"
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
                                <CardTitle>Informasi utama</CardTitle>
                                <CardDescription>
                                    Nama, kategori, dan lokasi destinasi. Koordinat dipakai peta
                                    untuk menempatkan marker.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <TextInput
                                    id="destination-name"
                                    label="Nama destinasi"
                                    value={values.name}
                                    onChange={(value) => updateValue('name', value)}
                                    placeholder="Contoh: Bukit Jaddih"
                                    hint="Maksimal 150 karakter."
                                    error={fieldErrors.name}
                                    maxLength={150}
                                    disabled={isSubmitting}
                                    required
                                />

                                <SelectInput
                                    id="destination-category"
                                    label="Kategori"
                                    value={values.categoryId}
                                    onChange={(value) => updateValue('categoryId', value)}
                                    options={categoryOptions}
                                    placeholder={
                                        isLoadingCategories
                                            ? 'Memuat kategori...'
                                            : 'Pilih kategori'
                                    }
                                    hint={categoriesError ?? undefined}
                                    error={fieldErrors.categoryId}
                                    disabled={isSubmitting || isLoadingCategories}
                                    required
                                />

                                <TextareaInput
                                    id="destination-description"
                                    label="Deskripsi"
                                    value={values.description}
                                    onChange={(value) => updateValue('description', value)}
                                    placeholder="Ceritakan daya tarik utama destinasi ini."
                                    hint="Maksimal 5000 karakter."
                                    error={fieldErrors.description}
                                    rows={5}
                                    maxLength={5000}
                                    disabled={isSubmitting}
                                />

                                <TextInput
                                    id="destination-address"
                                    label="Alamat"
                                    value={values.address}
                                    onChange={(value) => updateValue('address', value)}
                                    placeholder="Contoh: Desa Jaddih, Kecamatan Socah, Bangkalan"
                                    hint="Maksimal 300 karakter."
                                    error={fieldErrors.address}
                                    maxLength={300}
                                    disabled={isSubmitting}
                                />

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <TextInput
                                        id="destination-latitude"
                                        label="Latitude"
                                        value={values.latitude}
                                        onChange={(value) => updateValue('latitude', value)}
                                        placeholder="-7.0894"
                                        inputMode="decimal"
                                        hint="Angka -90 sampai 90."
                                        error={fieldErrors.latitude}
                                        disabled={isSubmitting}
                                        required
                                    />
                                    <TextInput
                                        id="destination-longitude"
                                        label="Longitude"
                                        value={values.longitude}
                                        onChange={(value) => updateValue('longitude', value)}
                                        placeholder="112.7450"
                                        inputMode="decimal"
                                        hint="Angka -180 sampai 180."
                                        error={fieldErrors.longitude}
                                        disabled={isSubmitting}
                                        required
                                    />
                                </div>

                                <MapPicker
                                    latitude={latitude}
                                    longitude={longitude}
                                    onPick={(pickedLatitude, pickedLongitude) => {
                                        setValues((previous) => ({
                                            ...previous,
                                            latitude: String(pickedLatitude),
                                            longitude: String(pickedLongitude),
                                        }))
                                    }}
                                />

                                <TextareaInput
                                    id="destination-facilities"
                                    label="Fasilitas"
                                    value={values.facilities}
                                    onChange={(value) => updateValue('facilities', value)}
                                    placeholder="Area parkir, musala, warung"
                                    hint="Pisahkan dengan koma. Maksimal 1000 karakter."
                                    error={fieldErrors.facilities}
                                    rows={3}
                                    maxLength={1000}
                                    disabled={isSubmitting}
                                />

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <TextInput
                                        id="destination-opening-hours"
                                        label="Jam buka"
                                        value={values.openingHours}
                                        onChange={(value) => updateValue('openingHours', value)}
                                        placeholder="07.00-17.00"
                                        hint="Maksimal 200 karakter."
                                        error={fieldErrors.openingHours}
                                        maxLength={200}
                                        disabled={isSubmitting}
                                    />
                                    <TextInput
                                        id="destination-contact"
                                        label="Kontak"
                                        value={values.contact}
                                        onChange={(value) => updateValue('contact', value)}
                                        placeholder="0812xxxxxxx"
                                        hint="Maksimal 120 karakter."
                                        error={fieldErrors.contact}
                                        maxLength={120}
                                        disabled={isSubmitting}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        <div className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Publikasi</CardTitle>
                                    <CardDescription>
                                        Destinasi berstatus draf tidak muncul di peta publik.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <CheckboxInput
                                        id="destination-published"
                                        label="Terbitkan di peta publik"
                                        description="Pengunjung dapat melihat titik ini di halaman peta."
                                        checked={values.isPublished}
                                        onChange={(checked) =>
                                            updateValue('isPublished', checked)
                                        }
                                        disabled={isSubmitting}
                                    />
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Rating dan harga</CardTitle>
                                    <CardDescription>
                                        Rating diisi admin. Harga memakai Rupiah tanpa desimal.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <TextInput
                                        id="destination-rating"
                                        label="Rating"
                                        value={values.rating}
                                        onChange={(value) => updateValue('rating', value)}
                                        placeholder="4.6"
                                        inputMode="decimal"
                                        hint="Skala 0 sampai 5, boleh satu angka desimal."
                                        error={fieldErrors.rating}
                                        disabled={isSubmitting}
                                        required
                                    />

                                    <CheckboxInput
                                        id="destination-free"
                                        label="Destinasi gratis"
                                        description='Tampil sebagai "Gratis" di peta publik.'
                                        checked={values.isFree}
                                        onChange={(checked) => {
                                            updateValue('isFree', checked)
                                            if (checked) {
                                                updateValue('priceMin', '')
                                                updateValue('priceMax', '')
                                            }
                                        }}
                                        disabled={isSubmitting}
                                    />

                                    {values.isFree ? (
                                        <p className="text-xs text-muted-foreground">
                                            Destinasi gratis tidak memakai harga minimum maupun
                                            maksimum.
                                        </p>
                                    ) : (
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <TextInput
                                                id="destination-price-min"
                                                label="Harga minimum"
                                                value={values.priceMin}
                                                onChange={(value) =>
                                                    updateValue('priceMin', value)
                                                }
                                                placeholder="5000"
                                                inputMode="numeric"
                                                hint="Rupiah, angka bulat."
                                                error={fieldErrors.priceMin}
                                                disabled={isSubmitting}
                                            />
                                            <TextInput
                                                id="destination-price-max"
                                                label="Harga maksimum"
                                                value={values.priceMax}
                                                onChange={(value) =>
                                                    updateValue('priceMax', value)
                                                }
                                                placeholder="10000"
                                                inputMode="numeric"
                                                hint="Kosongkan untuk harga mulai dari."
                                                error={fieldErrors.priceMax}
                                                disabled={isSubmitting}
                                            />
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Video destinasi</CardTitle>
                                    <CardDescription>
                                        Tampil sebagai overlay saat marker diklik di peta publik.
                                        Unggah MP4/WebM maksimal 50 MB atau tempel tautan YouTube.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <SelectInput
                                        id="destination-video-source"
                                        label="Sumber video"
                                        value={values.videoSource}
                                        onChange={(value) =>
                                            updateValue('videoSource', value as VideoSource)
                                        }
                                        options={[
                                            { value: 'none', label: 'Tidak ada' },
                                            { value: 'file', label: 'Unggah file' },
                                            { value: 'embed', label: 'Link YouTube' },
                                        ]}
                                        hint="Destinasi tanpa video tetap memakai panel detail di peta."
                                        error={fieldErrors.videoSource}
                                        disabled={isVideoBusy}
                                    />

                                    {values.videoSource === 'file' ? (
                                        <div className="space-y-2">
                                            <input
                                                ref={videoInputRef}
                                                type="file"
                                                accept="video/mp4,video/webm"
                                                className="sr-only"
                                                onChange={handleVideoFileChange}
                                                disabled={isVideoBusy}
                                            />
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Button
                                                    id="destination-video-file"
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    disabled={isVideoBusy}
                                                    onClick={() => videoInputRef.current?.click()}
                                                >
                                                    <HugeiconsIcon
                                                        icon={Upload01Icon}
                                                        size={15}
                                                        strokeWidth={1.8}
                                                    />
                                                    {videoFile ? 'Ganti video' : 'Pilih video'}
                                                </Button>
                                                <span className="max-w-full truncate text-xs text-muted-foreground">
                                                    {videoFile
                                                        ? videoFile.name
                                                        : existingVideo?.kind === 'file'
                                                          ? `Video saat ini: ${videoFileName(existingVideo.url)}`
                                                          : 'Belum ada file dipilih.'}
                                                </span>
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                File diunggah setelah destinasi disimpan. MP4 atau
                                                WebM, maksimal 50 MB.
                                            </p>
                                            {fieldErrors.videoFile ? (
                                                <p
                                                    role="alert"
                                                    className="text-xs text-destructive"
                                                >
                                                    {fieldErrors.videoFile}
                                                </p>
                                            ) : null}
                                        </div>
                                    ) : null}

                                    {values.videoSource === 'embed' ? (
                                        <TextInput
                                            id="destination-video-url"
                                            label="Tautan video"
                                            value={values.videoUrl}
                                            onChange={(value) => updateValue('videoUrl', value)}
                                            placeholder="https://www.youtube.com/watch?v=..."
                                            hint="Tautan YouTube atau URL embed video."
                                            error={fieldErrors.videoUrl}
                                            disabled={isVideoBusy}
                                        />
                                    ) : null}

                                    {isEdit && existingVideo ? (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="xs"
                                            className="text-destructive hover:text-destructive"
                                            disabled={isVideoBusy}
                                            onClick={() => void handleDeleteVideo()}
                                            aria-label="Hapus video destinasi"
                                        >
                                            <HugeiconsIcon
                                                icon={Delete02Icon}
                                                size={13}
                                                strokeWidth={2}
                                            />
                                            {isDeletingVideo ? 'Menghapus...' : 'Hapus video'}
                                        </Button>
                                    ) : null}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </form>
            ) : null}

            {isEdit && destination ? (
                <PhotoGallery
                    destinationId={destination.id}
                    photos={destination.photos}
                    onChanged={reload}
                />
            ) : null}
        </div>
    )
}

export default DestinationFormPage
