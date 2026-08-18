import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import AdminApp from './admin/AdminApp'
import { LangProvider } from './context/LangContext'
import { RestaurantProvider } from './context/RestaurantContext'
import { CartProvider } from './context/CartContext'
import { BranchProvider } from './context/BranchContext'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element not found')

const isAdmin = window.location.pathname.startsWith('/admin')

createRoot(rootElement).render(
  <StrictMode>
    {isAdmin ? (
      <AdminApp />
    ) : (
      <RestaurantProvider>
        <LangProvider>
          <BranchProvider>
            <CartProvider>
              <App />
            </CartProvider>
          </BranchProvider>
        </LangProvider>
      </RestaurantProvider>
    )}
  </StrictMode>,
)
