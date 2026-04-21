import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listingsApi } from '../api/listings'
import ListingForm, { type ListingFormValues } from '../components/ListingForm/ListingForm'

export default function ListingCreate() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [files, setFiles] = useState<File[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const addFiles = (list: FileList | null) => {
    if (!list || list.length === 0) return
    setFiles((prev) => [...prev, ...Array.from(list)])
    if (inputRef.current) inputRef.current.value = ''
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (values: ListingFormValues) => {
    setError(null)
    setLoading(true)
    try {
      const listing = await listingsApi.create({
        title: values.title,
        description: values.description || undefined,
        price: values.deal_type === 'sale' && values.price ? Number(values.price) : null,
        deal_type: values.deal_type,
        city: values.city || undefined,
        species_id: values.species_id || null,
      })
      for (let i = 0; i < files.length; i++) {
        await listingsApi.uploadPhoto(listing.id, files[i], i === 0)
      }
      navigate(`/listings/${listing.id}`)
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Ошибка при создании')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-frog-700 mb-6">Новое объявление</h1>
      <div className="bg-white rounded-2xl border border-frog-100 shadow-sm p-6 flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <label className="text-sm font-medium text-gray-700">Фотографии</label>
          <div className="flex flex-wrap gap-3">
            {files.map((file, index) => (
              <div key={index} className="relative group w-24 h-24 flex-shrink-0">
                <img
                  src={URL.createObjectURL(file)}
                  alt=""
                  className={`w-full h-full object-cover rounded-xl border-2 transition-colors ${
                    index === 0 ? 'border-frog-500' : 'border-gray-200'
                  }`}
                />
                {index === 0 && (
                  <span className="absolute top-1 left-1 bg-frog-500 text-white text-[10px] px-1.5 py-0.5 rounded-md leading-none pointer-events-none">
                    Главное
                  </span>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
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
              disabled={loading}
              className="w-24 h-24 flex-shrink-0 rounded-xl border-2 border-dashed border-gray-300 hover:border-frog-400 flex flex-col items-center justify-center text-gray-400 hover:text-frog-500 transition-colors disabled:opacity-50"
            >
              <span className="text-2xl leading-none">+</span>
              <span className="text-[11px] mt-1">Добавить</span>
            </button>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => addFiles(e.target.files)}
          />
        </div>

        <hr className="border-frog-100" />

        <ListingForm
          onSubmit={handleSubmit}
          submitLabel="Создать объявление"
          loading={loading}
          error={error}
        />
      </div>
    </div>
  )
}
