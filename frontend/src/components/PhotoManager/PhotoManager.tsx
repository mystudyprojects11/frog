import { useRef, useState } from 'react'
import { listingsApi, type ListingPhoto } from '../../api/listings'

const MINIO = import.meta.env.VITE_MINIO_URL ?? ''
const photoUrl = (s3_key: string) => `${MINIO}/frog-photos/${s3_key}`

interface Props {
  listingId: string
  photos: ListingPhoto[]
  onChange: (photos: ListingPhoto[]) => void
}

export default function PhotoManager({ listingId, photos, onChange }: Props) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setError(null)
    setUploading(true)
    try {
      let current = photos
      for (const file of Array.from(files)) {
        const listing = await listingsApi.uploadPhoto(listingId, file, current.length === 0)
        current = listing.photos
      }
      onChange(current)
    } catch {
      setError('Ошибка при загрузке')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleDelete = async (photoId: string) => {
    try {
      await listingsApi.deletePhoto(listingId, photoId)
      onChange(photos.filter((p) => p.id !== photoId))
    } catch {
      setError('Ошибка при удалении')
    }
  }

  const handleSetMain = async (photoId: string) => {
    try {
      const listing = await listingsApi.setMainPhoto(listingId, photoId)
      onChange(listing.photos)
    } catch {
      setError('Ошибка')
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="text-sm font-medium text-gray-700">Фотографии</label>

      <div className="flex flex-wrap gap-3">
        {photos.map((photo) => (
          <div key={photo.id} className="relative group w-24 h-24 flex-shrink-0">
            <img
              src={photoUrl(photo.s3_key)}
              alt=""
              className={`w-full h-full object-cover rounded-xl border-2 transition-colors ${
                photo.is_main ? 'border-frog-500' : 'border-gray-200'
              }`}
            />
            {photo.is_main && (
              <span className="absolute top-1 left-1 bg-frog-500 text-white text-[10px] px-1.5 py-0.5 rounded-md leading-none pointer-events-none">
                Главное
              </span>
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-1.5">
              {!photo.is_main && (
                <button
                  type="button"
                  onClick={() => handleSetMain(photo.id)}
                  title="Сделать главным"
                  className="bg-white text-frog-600 text-xs px-2 py-1 rounded-lg font-medium hover:bg-frog-50"
                >
                  ★
                </button>
              )}
              <button
                type="button"
                onClick={() => handleDelete(photo.id)}
                title="Удалить"
                className="bg-white text-red-500 text-xs px-2 py-1 rounded-lg font-medium hover:bg-red-50"
              >
                ✕
              </button>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-24 h-24 flex-shrink-0 rounded-xl border-2 border-dashed border-gray-300 hover:border-frog-400 flex flex-col items-center justify-center text-gray-400 hover:text-frog-500 transition-colors disabled:opacity-50"
        >
          {uploading ? (
            <span className="text-xs text-center px-1">Загрузка...</span>
          ) : (
            <>
              <span className="text-2xl leading-none">+</span>
              <span className="text-[11px] mt-1">Добавить</span>
            </>
          )}
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  )
}
