import { api } from './api'
import type { Payment, PaymentProvider } from '../types'

export interface InitializePaymentPayload {
  bookingId: number
  provider: PaymentProvider
}

export interface InitializePaymentResponse {
  provider: PaymentProvider
  paymentId: number
  pidx?: string
  payment_url?: string
  expires_at?: string
  expires_in?: number
  userId?: number
  userEmail?: string
  // eSewa response
  action?: string
  method?: string
  fields?: Record<string, string>
  payment?: Payment
}

export interface KhaltiVerifyPayload {
  pidx: string
}

export interface EsewaVerifyPayload {
  oid: string
  amt: number
  refId: string
}

export const paymentsApi = {
  // Initialize payment
  initialize: async (data: InitializePaymentPayload): Promise<InitializePaymentResponse> =>
    (await api.post<InitializePaymentResponse>('/payments/initialize', data)).data,
  
  // Verify Khalti payment
  verifyKhalti: async (pidx: string) => 
    (await api.post('/payments/khalti/verify', { pidx })).data,
  
  // Khalti return redirect (backend handles this)
  khaltiReturn: async (pidx: string) => 
    (await api.get(`/payments/khalti-return?pidx=${pidx}`)).data,
  
  // eSewa success callback
  esewaSuccess: async (params: Record<string, string>) => 
    (await api.get('/payments/esewa-success', { params })).data,
  
  // eSewa failure callback
  esewaFailure: async () => 
    (await api.get('/payments/esewa-failure')).data,
}
