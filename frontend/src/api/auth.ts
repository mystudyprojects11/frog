import client from './client'
import type { ListingShort } from './listings'

export interface UserRead {
  id: string
  email: string
  username: string
  phone: string | null
  city: string | null
  avatar_url: string | null
  rating: number
  reviews_count: number
  created_at: string
}

export interface RegisterData {
  email: string
  username: string
  password: string
  phone?: string
  city?: string
}

export interface ProfileUpdate {
  username?: string
  phone?: string | null
  city?: string | null
}

export const authApi = {
  register: (data: RegisterData) =>
    client.post<UserRead>('/auth/register', data).then((r) => r.data),

  login: (email: string, password: string) => {
    const form = new URLSearchParams()
    form.append('username', email)
    form.append('password', password)
    return client
      .post<{ access_token: string }>('/auth/login', form)
      .then((r) => r.data)
  },

  me: () => client.get<UserRead>('/auth/me').then((r) => r.data),

  updateMe: (data: ProfileUpdate) =>
    client.patch<UserRead>('/auth/me', data).then((r) => r.data),

  myListings: () =>
    client.get<ListingShort[]>('/auth/me/listings').then((r) => r.data),

  changePassword: (oldPassword: string, newPassword: string) =>
    client.post('/auth/change-password', {
      old_password: oldPassword,
      new_password: newPassword,
    }),

  uploadAvatar: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return client
      .post<UserRead>('/auth/me/avatar', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data)
  },

  deleteAvatar: () =>
    client.delete<UserRead>('/auth/me/avatar').then((r) => r.data),
}
