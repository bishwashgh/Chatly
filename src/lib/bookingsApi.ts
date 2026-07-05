import { api } from './api'
import type { Booking } from '../types'

export interface CreateBookingPayload {
  venueId: number
  startDate: string
  endDate: string
}

export interface UpdateBookingPayload {
  status?: string
}

export const bookingsApi = {
  // User endpoints
  create: async (data: CreateBookingPayload) => 
    (await api.post<Booking>('/bookings', data)).data,
  
  get: async (id: number | string) => 
    (await api.get<Booking>(`/bookings/${id}`)).data,
  
  listMine: async () => 
    (await api.get<Booking[]>('/bookings')).data,
  
  cancel: async (id: number | string) => 
    (await api.patch<Booking>(`/bookings/${id}`, { status: 'cancelled' })).data,
  
  // Admin endpoints
  listAll: async () => 
    (await api.get<Booking[]>('/bookings/admin/all')).data,
  
  getAdmin: async (id: number | string) => 
    (await api.get<Booking>(`/bookings/admin/${id}`)).data,
}
