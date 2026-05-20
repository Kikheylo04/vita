import type { MenuCategory } from './types'

export type ReservationStatus = 'pending' | 'confirmed' | 'cancelled'
export type TestimonialStatus = 'pending' | 'approved' | 'rejected'

export interface AdminReservation {
  id: string
  name: string
  email: string
  phone: string
  date: string
  time: string
  guests: number
  notes: string
  status: ReservationStatus
  created_at: string
}

export interface AdminMenuItem {
  id: string
  cat: MenuCategory
  name: string
  description: string
  description_en: string
  price: number
  badge: string
  image: string
  active: boolean
  sort_order: number
}

export interface AdminTestimonial {
  id: string
  name: string
  role: string
  avatar: string
  rating: number
  comment: string
  status: TestimonialStatus
  created_at: string
}

export interface AdminEvent {
  id: string
  title: string
  title_en: string
  date: string
  description: string
  description_en: string
  image_url: string
  active: boolean
}

export type AdminPage = 'dashboard' | 'reservaciones' | 'menu' | 'testimonios' | 'eventos' | 'mensajes' | 'config'
