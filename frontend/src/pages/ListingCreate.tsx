import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listingsApi } from '../api/listings'
import ListingForm, { type ListingFormValues } from '../components/ListingForm/ListingForm'

export default function ListingCreate() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      navigate(`/listings/${listing.id}/edit`)
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Ошибка при создании')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-frog-700 mb-6">Новое объявление</h1>
      <div className="bg-white rounded-2xl border border-frog-100 shadow-sm p-6">
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
