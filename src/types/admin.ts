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

export type OrderStatus = 'pending' | 'confirmed' | 'ready' | 'delivered' | 'cancelled'

/** Estado del cobro, independiente del estado del pedido en cocina. */
export type PaymentStatus = 'unpaid' | 'pending' | 'paid' | 'failed' | 'refunded'
export type PaymentMethod = 'onsite' | 'mercadopago'

export interface AdminOrder {
  id: string
  name: string
  email: string
  phone: string
  date: string
  time: string
  guests: number
  notes: string
  total: number
  status: OrderStatus
  payment_status: PaymentStatus
  payment_method: PaymentMethod
  amount_paid: number | null
  paid_at: string | null
  mp_payment_id: string | null
  created_at: string
  order_items?: { name: string; price: number; quantity: number }[]
}

export type AdminRole = 'admin' | 'manager'

export interface Branch {
  id: string
  name: string
  slug: string
  address: string
  neighborhood: string
  city: string
  phone: string
  maps_embed: string
  active: boolean
  sort_order: number
}

export interface Profile {
  id: string
  full_name: string
  role: AdminRole
  branch_id: string | null
}

export type AdminPage = 'dashboard' | 'reservaciones' | 'menu' | 'testimonios' | 'eventos' | 'mensajes' | 'pedidos' | 'config' | 'cuenta' | 'sucursales'
