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
  /** Alta de cuenta. Devuelve el error o null. */
  signUp: (email: string, password: string, fullName: string) => Promise<string | null>
  /** Perfil del usuario: rol y empresa. null mientras carga. */
  profile: { role: string; tenant_id: string | null; branch_id: string | null } | null
  /** Cambia la contrasena de la sesion activa. Devuelve el error o null. */
  changePassword: (password: string) => Promise<string | null>
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null)

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<{ role: string; tenant_id: string | null; branch_id: string | null } | null>(null)

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

  // El rol vive en profiles, no en el token: se consulta aparte.
  useEffect(() => {
    if (!user) { setProfile(null); return }
    supabase
      .from('profiles')
      .select('role,tenant_id,branch_id')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) { console.error('Error cargando el perfil:', error.message); return }
        const p = data as { role: string; tenant_id: string | null; branch_id: string | null } | null
        setProfile(p)
        // Permite al panel elegir su pantalla inicial sin parpadeo.
        try { if (p) localStorage.setItem('admin_role', p.role) } catch { /* sin almacenamiento */ }
      })
  }, [user])

  const signIn = async (email: string, password: string): Promise<string | null> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error ? error.message : null
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName } },
    })
    return error ? error.message : null
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
    <AdminAuthContext.Provider value={{ user, session, loading, profile, signIn, signUp, signOut, updateProfile, changePassword }}>
      {children}
    </AdminAuthContext.Provider>
  )
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext)
  if (!ctx) throw new Error('useAdminAuth must be used inside AdminAuthProvider')
  return ctx
}
