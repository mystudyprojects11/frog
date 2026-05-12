import client from './client'

export interface Species {
  id: string
  name: string
  latin_name: string
  description: string | null
  difficulty: string
  photo_url: string | null
}

export interface ListingPhoto {
  id: string
  s3_key: string
  url: string
  is_main: boolean
}

export interface ListingSeller {
  id: string
  username: string
  city: string | null
  rating: number
  reviews_count: number
  avatar_url: string | null
}

export interface Listing {
  id: string
  title: string
  description: string | null
  price: string | null
  deal_type: 'sale' | 'exchange' | 'free'
  status: 'active' | 'sold' | 'archived'
  city: string | null
  created_at: string
  species: Species | null
  seller: ListingSeller
  photos: ListingPhoto[]
}

export interface ListingShort {
  id: string
  title: string
  price: string | null
  deal_type: string
  status: string
  city: string | null
  created_at: string
  species: Species | null
  seller_id: string
  main_photo: string | null
}

export interface ListingCreateData {
  title: string
  description?: string
  price?: number | null
  deal_type: string
  city?: string
  species_id?: string | null
}

export const listingsApi = {
  list: (params?: Record<string, string>) =>
    client.get<ListingShort[]>('/listings/', { params }).then((r) => r.data),

  get: (id: string) =>
    client.get<Listing>(`/listings/${id}`).then((r) => r.data),

  create: (data: ListingCreateData) =>
    client.post<Listing>('/listings/', data).then((r) => r.data),

  update: (id: string, data: Partial<ListingCreateData> & { status?: string }) =>
    client.patch<Listing>(`/listings/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    client.delete(`/listings/${id}`),

  uploadPhoto: (id: string, file: File, isMain: boolean) => {
    const form = new FormData()
    form.append('file', file)
    return client
      .post<Listing>(`/listings/${id}/photos?is_main=${isMain}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data)
  },

  deletePhoto: (listingId: string, photoId: string) =>
    client.delete(`/listings/${listingId}/photos/${photoId}`),

  setMainPhoto: (listingId: string, photoId: string) =>
    client.patch<Listing>(`/listings/${listingId}/photos/${photoId}/set-main`).then((r) => r.data),
}
