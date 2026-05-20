import { createContext, useContext, useState, type ReactNode } from 'react'

export interface CartItem {
  name: string
  price: number
  quantity: number
  image?: string
}

interface CartContextType {
  items: CartItem[]
  add: (item: Omit<CartItem, 'quantity'>) => void
  remove: (name: string) => void
  updateQty: (name: string, qty: number) => void
  clear: () => void
  total: number
  count: number
}

const CartContext = createContext<CartContextType>({
  items: [], add: () => {}, remove: () => {}, updateQty: () => {}, clear: () => {}, total: 0, count: 0,
})

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])

  const add = (item: Omit<CartItem, 'quantity'>) => {
    setItems(prev => {
      const exists = prev.find(i => i.name === item.name)
      if (exists) return prev.map(i => i.name === item.name ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { ...item, quantity: 1 }]
    })
  }

  const remove = (name: string) => setItems(prev => prev.filter(i => i.name !== name))

  const updateQty = (name: string, qty: number) => {
    if (qty <= 0) { remove(name); return }
    setItems(prev => prev.map(i => i.name === name ? { ...i, quantity: qty } : i))
  }

  const clear = () => setItems([])

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const count = items.reduce((sum, i) => sum + i.quantity, 0)

  return (
    <CartContext.Provider value={{ items, add, remove, updateQty, clear, total, count }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() { return useContext(CartContext) }
