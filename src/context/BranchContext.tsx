import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { useTenant } from './TenantContext'

export interface PublicBranch {
  id: string
  name: string
  slug: string
  address: string
  neighborhood: string
  city: string
  phone: string
}

interface BranchContextValue {
  branches: PublicBranch[]
  branch: PublicBranch | null
  setBranch: (b: PublicBranch) => void
  loading: boolean
}

const BranchContext = createContext<BranchContextValue>({
  branches: [], branch: null, setBranch: () => {}, loading: true,
})

const STORAGE_KEY = 'vita_branch'

export function BranchProvider({ children }: { children: ReactNode }) {
  const { tenant } = useTenant()
  const [branches, setBranches] = useState<PublicBranch[]>([])
  const [branch, setBranchState] = useState<PublicBranch | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Sin empresa resuelta no hay nada que cargar: evita mostrar
    // las sucursales de otro cliente mientras se resuelve el host.
    if (!tenant) return
    supabase
      .from('branches')
      .select('id,name,slug,address,neighborhood,city,phone')
      .eq('tenant_id', tenant.id)
      .eq('active', true)
      .order('sort_order', { ascending: true })
      .then(({ data, error }) => {
        setLoading(false)
        if (error) { console.error('Error cargando sucursales:', error.message); return }

        const list = (data ?? []) as PublicBranch[]
        setBranches(list)
        if (list.length === 0) return

        // Se respeta la ultima eleccion del visitante; si ya no existe,
        // se cae a la primera sucursal activa.
        const saved = localStorage.getItem(STORAGE_KEY)
        setBranchState(list.find(b => b.slug === saved) ?? list[0])
      })
  }, [tenant])

  const setBranch = (b: PublicBranch) => {
    setBranchState(b)
    localStorage.setItem(STORAGE_KEY, b.slug)
  }

  return (
    <BranchContext.Provider value={{ branches, branch, setBranch, loading }}>
      {children}
    </BranchContext.Provider>
  )
}

export function useBranch() {
  return useContext(BranchContext)
}
