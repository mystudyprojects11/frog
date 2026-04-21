import { create } from 'zustand'
import { authApi, type ProfileUpdate, type UserRead } from '../api/auth'

interface AuthState {
  user: UserRead | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  fetchMe: () => Promise<void>
  updateProfile: (data: ProfileUpdate) => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,

  login: async (email, password) => {
    const { access_token } = await authApi.login(email, password)
    localStorage.setItem('access_token', access_token)
    const user = await authApi.me()
    set({ user })
  },

  logout: () => {
    localStorage.removeItem('access_token')
    set({ user: null })
  },

  fetchMe: async () => {
    const token = localStorage.getItem('access_token')
    if (!token) return
    set({ loading: true })
    try {
      const user = await authApi.me()
      set({ user })
    } catch {
      localStorage.removeItem('access_token')
    } finally {
      set({ loading: false })
    }
  },

  updateProfile: async (data) => {
    const user = await authApi.updateMe(data)
    set({ user })
  },
}))
