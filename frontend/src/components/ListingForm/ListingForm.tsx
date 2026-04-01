import { useEffect, useState } from 'react'
import { speciesApi } from '../../api/species'
import type { Species } from '../../api/listings'

export interface ListingFormValues {
  title: string
  description: string
  price: string
  deal_type: string
  city: string
  species_id: string
}

interface Props {
  initial?: Partial<ListingFormValues>
  onSubmit: (values: ListingFormValues) => Promise<void>
  submitLabel: string
  loading: boolean
  error: string | null
}

const DEAL_TYPES = [
  { value: 'sale', label: 'Продажа' },
  { value: 'exchange', label: 'Обмен' },
  { value: 'free', label: 'Отдам даром' },
]

export default function ListingForm({ initial, onSubmit, submitLabel, loading, error }: Props) {
  const [values, setValues] = useState<ListingFormValues>({
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    price: initial?.price ?? '',
    deal_type: initial?.deal_type ?? 'sale',
    city: initial?.city ?? '',
    species_id: initial?.species_id ?? '',
  })
  const [species, setSpecies] = useState<Species[]>([])

  useEffect(() => {
    speciesApi.list().then(setSpecies).catch(() => {})
  }, [])

  const set = (field: keyof ListingFormValues) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setValues((prev) => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(values)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Title */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Заголовок *</label>
        <input
          required
          value={values.title}
          onChange={set('title')}
          placeholder="Продам краснозадую жабу"
          className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-frog-400"
        />
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Описание</label>
        <textarea
          rows={4}
          value={values.description}
          onChange={set('description')}
          placeholder="Возраст, условия содержания, причина продажи..."
          className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-frog-400 resize-none"
        />
      </div>

      {/* Deal type + Price */}
      <div className="flex gap-3">
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-sm font-medium text-gray-700">Тип сделки *</label>
          <select
            required
            value={values.deal_type}
            onChange={set('deal_type')}
            className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-frog-400 bg-white"
          >
            {DEAL_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {values.deal_type === 'sale' && (
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-sm font-medium text-gray-700">Цена, ₽ *</label>
            <input
              type="number"
              min={0}
              required
              value={values.price}
              onChange={set('price')}
              placeholder="1500"
              className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-frog-400"
            />
          </div>
        )}
      </div>

      {/* Species */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Вид</label>
        <select
          value={values.species_id}
          onChange={set('species_id')}
          className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-frog-400 bg-white"
        >
          <option value="">— Не указан —</option>
          {species.map((s) => (
            <option key={s.id} value={s.id}>{s.name} ({s.latin_name})</option>
          ))}
        </select>
      </div>

      {/* City */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Город</label>
        <input
          value={values.city}
          onChange={set('city')}
          placeholder="Москва"
          className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-frog-400"
        />
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="bg-frog-600 hover:bg-frog-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-xl transition-colors"
      >
        {loading ? 'Сохраняем...' : submitLabel}
      </button>
    </form>
  )
}
