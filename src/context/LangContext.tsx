import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'

export type Lang = 'es' | 'en'

interface LangContextType {
  lang: Lang
  setLang: (l: Lang) => void
  t: <T extends ReactNode>(es: T, en: T) => T
}

const LangContext = createContext<LangContextType>({
  lang: 'es',
  setLang: () => {},
  t: (es) => es,
})

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('es')
  const t = <T extends ReactNode>(es: T, en: T): T => lang === 'es' ? es : en

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  )
}

export const useLang = () => useContext(LangContext)
