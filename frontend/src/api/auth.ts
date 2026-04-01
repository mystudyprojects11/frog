import client from './client'

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
}
