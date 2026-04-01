import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { listingsApi, type Listing } from '../api/listings'
import ListingForm, { type ListingFormValues } from '../components/ListingForm/ListingForm'
import { useAuthStore } from '../store/auth'

const STATUS_LABELS: Record<string, string> = {
  active: 'Активно',
  sold: 'Продано',
  archived: 'В архиве',
}

export default function ListingEdit() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)

  const [listing, setListing] = useState<Listing | null>(null)
  const [status, setStatus] = useState('active')
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    listingsApi.get(id)
      .then((l) => {
        setListing(l)
        setStatus(l.status)
      })
      .catch(() => setFetchError('Объявление не найдено'))
  }, [id])

  if (fetchError) {
    return <div className="max-w-xl mx-auto px-4 py-8 text-red-500">{fetchError}</div>
  }
  if (!listing) {
    return <div className="max-w-xl mx-auto px-4 py-8 text-gray-400">Загрузка...</div>
  }
  if (user?.id !== listing.seller.id) {
    return <div className="max-w-xl mx-auto px-4 py-8 text-red-500">Нет доступа</div>
  }

  const handleSubmit = async (values: ListingFormValues) => {
    setError(null)
    setLoading(true)
    try {
      await listingsApi.update(listing.id, {
        title: values.title,
        description: values.description || undefined,
        price: values.deal_type === 'sale' && values.price ? Number(values.price) : null,
        deal_type: values.deal_type,
        city: values.city || undefined,
        species_id: values.species_id || null,
        status,
      })
      navigate(`/listings/${listing.id}`)
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Ошибка при сохранении')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Удалить объявление?')) return
    await listingsApi.delete(listing.id)
    navigate('/')
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-frog-700 mb-6">Редактировать объявление</h1>
      <div className="bg-white rounded-2xl border border-frog-100 shadow-sm p-6 flex flex-col gap-6">

        {/* Status */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Статус</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-frog-400 bg-white"
          >
            {Object.entries(STATUS_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>

        <ListingForm
          initial={{
            title: listing.title,
            description: listing.description ?? '',
            price: listing.price ?? '',
            deal_type: listing.deal_type,
            city: listing.city ?? '',
            species_id: listing.species?.id ?? '',
          }}
          onSubmit={handleSubmit}
          submitLabel="Сохранить изменения"
          loading={loading}
          error={error}
        />

        <button
          onClick={handleDelete}
          className="text-red-500 hover:text-red-700 text-sm font-medium transition-colors"
        >
          Удалить объявление
        </button>
      </div>
    </div>
  )
}
