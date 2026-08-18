import { createContext, useContext, useState, type ReactNode } from 'react'

export interface CartItem {
  menuItemId: string
  name: string
  price: number
  quantity: number
  image?: string
}

interface CartContextType {
  items: CartItem[]
  add: (item: Omit<CartItem, 'quantity'>) => void
  remove: (id: string) => void
  updateQty: (id: string, qty: number) => void
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
      const exists = prev.find(i => i.menuItemId === item.menuItemId)
      if (exists) return prev.map(i => i.menuItemId === item.menuItemId ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { ...item, quantity: 1 }]
    })
  }

  const remove = (id: string) => setItems(prev => prev.filter(i => i.menuItemId !== id))

  const updateQty = (id: string, qty: number) => {
    if (qty <= 0) { remove(id); return }
    setItems(prev => prev.map(i => i.menuItemId === id ? { ...i, quantity: qty } : i))
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
