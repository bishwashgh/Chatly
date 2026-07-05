import { api } from './api'
import type { User } from '../types'

export interface UpdateProfilePayload {
  name?: string
  email?: string
  phone?: string
  address?: string
}

export interface DeleteUserPayload {
  userId: number
}

export const usersApi = {
  // Get current user
  getMe: async () => 
    (await api.get<User>('/users/me')).data,
  
  // Update current user profile
  updateProfile: async (data: UpdateProfilePayload) => 
    (await api.patch<User>('/users/me', data)).data,
  
  // Admin: Get all users
  listAll: async () => 
    (await api.get<User[]>('/users')).data,
  
  // Admin: Get single user
  get: async (id: number) => 
    (await api.get<User>(`/users/${id}`)).data,
  
  // Admin: Delete user
  delete: async (id: number) => 
    (await api.delete(`/users/${id}`)).data,
}
