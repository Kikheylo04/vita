import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface AdminAuthContextValue {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
  /** Guarda nombre y telefono en user_metadata. Devuelve el error o null. */
  updateProfile: (fields: { full_name?: string; phone?: string }) => Promise<string | null>
  /** Cambia la contrasena de la sesion activa. Devuelve el error o null. */
  changePassword: (password: string) => Promise<string | null>
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null)

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string): Promise<string | null> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error ? error.message : null
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const updateProfile = async (fields: { full_name?: string; phone?: string }) => {
    const { data, error } = await supabase.auth.updateUser({ data: fields })
    if (error) return error.message
    if (data.user) setUser(data.user)
    return null
  }

  const changePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password })
    return error ? error.message : null
  }

  return (
    <AdminAuthContext.Provider value={{ user, session, loading, signIn, signOut, updateProfile, changePassword }}>
      {children}
    </AdminAuthContext.Provider>
  )
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext)
  if (!ctx) throw new Error('useAdminAuth must be used inside AdminAuthProvider')
  return ctx
}
