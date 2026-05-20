import { useState, useMemo, useEffect } from 'react'
import styles from './Menu.module.css'
import type { MenuItem, MenuCategory } from '../../../types/types'
import { useIntersection } from '../../../hooks/useIntersection'
import { useLang } from '../../../context/LangContext'
import { useFormatPrice } from '../../../context/RestaurantContext'
import { supabase } from '../../../lib/supabase'

interface MenuProps {
  initialFilter?: MenuCategory
}

const categories: MenuCategory[] = ['Todo', 'Entradas', 'Pastas', 'Carnes', 'Mariscos', 'Postres', 'Bebidas']

interface BilingualMenuItem extends Omit<MenuItem, 'desc'> {
  desc: string
  descEn: string
}

const STATIC_ITEMS: BilingualMenuItem[] = [
  { cat: 'Entradas', name: 'Bruschetta al Pomodoro', desc: 'Pan tostado con tomate fresco, albahaca y aceite de oliva virgen extra.', descEn: 'Toasted bread with fresh tomato, basil and extra virgin olive oil.', price: 4.99, badge: '', image: 'https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?w=400&auto=format&fit=crop&q=80' },
  { cat: 'Entradas', name: 'Carpaccio di Manzo', desc: 'Finas láminas de res con rúcula, parmesano y alcaparras.', descEn: 'Thin slices of beef with arugula, parmesan and capers.', price: 8.99, badge: 'Popular', image: 'https://images.unsplash.com/photo-1625944525533-473f1a3d54e7?w=400&auto=format&fit=crop&q=80' },
  { cat: 'Entradas', name: 'Burrata Fresca', desc: 'Burrata cremosa con tomates cherry, pesto de albahaca y reducción de balsámico.', descEn: 'Creamy burrata with cherry tomatoes, basil pesto and balsamic reduction.', price: 9.99, badge: '', image: 'https://images.unsplash.com/photo-1595587637401-83ff822bd63e?w=400&auto=format&fit=crop&q=80' },
  { cat: 'Pastas', name: 'Tagliatelle al Ragù', desc: 'Pasta fresca artesanal con ragù de res y cerdo cocinado 6 horas.', descEn: 'Artisan fresh pasta with beef and pork ragù slow-cooked for 6 hours.', price: 11.99, badge: "Chef's Choice", image: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&auto=format&fit=crop&q=80' },
  { cat: 'Pastas', name: 'Pappardelle ai Funghi', desc: 'Pasta ancha con mix de hongos silvestres, trufa negra y parmesano.', descEn: 'Wide pasta with wild mushroom mix, black truffle and parmesan.', price: 13.99, badge: '', image: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=400&auto=format&fit=crop&q=80' },
  { cat: 'Pastas', name: 'Risotto al Tartufo', desc: 'Arroz carnaroli cremoso con trufa blanca de temporada.', descEn: 'Creamy carnaroli rice with seasonal white truffle.', price: 16.99, badge: 'Temporada', image: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=400&auto=format&fit=crop&q=80' },
  { cat: 'Carnes', name: 'Bistecca alla Fiorentina', desc: 'Corte T-Bone de 500g con guarnición de papas al romero y ensalada.', descEn: '500g T-Bone cut with rosemary potatoes and salad.', price: 28.99, badge: 'Signature', image: 'https://images.unsplash.com/photo-1558030006-450675393462?w=400&auto=format&fit=crop&q=80' },
  { cat: 'Carnes', name: 'Osso Buco alla Milanese', desc: 'Jarrete de ternera braseado lentamente con gremolata y risotto.', descEn: 'Slowly braised veal shank with gremolata and risotto.', price: 21.99, badge: '', image: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=400&auto=format&fit=crop&q=80' },
  { cat: 'Mariscos', name: 'Branzino al Sale', desc: 'Lubina entera a la sal con verduras de temporada y limón siciliano.', descEn: 'Whole salt-baked sea bass with seasonal vegetables and Sicilian lemon.', price: 20.99, badge: '', image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400&auto=format&fit=crop&q=80' },
  { cat: 'Mariscos', name: 'Salmone in Crosta', desc: 'Salmón en costra de hierbas con puré de coliflor y salsa beurre blanc.', descEn: 'Herb-crusted salmon with cauliflower purée and beurre blanc sauce.', price: 17.99, badge: 'Popular', image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&auto=format&fit=crop&q=80' },
  { cat: 'Postres', name: 'Tiramisù della Casa', desc: 'Receta familiar con mascarpone artesanal, café espresso y cacao.', descEn: 'Family recipe with artisan mascarpone, espresso coffee and cocoa.', price: 6.99, badge: '', image: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400&auto=format&fit=crop&q=80' },
  { cat: 'Postres', name: 'Panna Cotta ai Frutti di Bosco', desc: 'Crema italiana con coulis de frutos rojos y menta fresca.', descEn: 'Italian cream dessert with mixed berry coulis and fresh mint.', price: 5.99, badge: '', image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&auto=format&fit=crop&q=80' },
  { cat: 'Bebidas', name: 'Vino de la Casa', desc: 'Sangiovese toscano, botella 750ml.', descEn: 'Tuscan Sangiovese, 750ml bottle.', price: 20.99, badge: '', image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&auto=format&fit=crop&q=80' },
  { cat: 'Bebidas', name: 'Agua Mineral', desc: 'Con gas o sin gas, 500ml.', descEn: 'Still or sparkling, 500ml.', price: 2.99, badge: '', image: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400&auto=format&fit=crop&q=80' },
]

const categoryLabels: Record<MenuCategory, { es: string; en: string }> = {
  'Todo':       { es: 'Todo',      en: 'All' },
  'Entradas':   { es: 'Entradas',  en: 'Starters' },
  'Pastas':     { es: 'Pastas',    en: 'Pastas' },
  'Carnes':     { es: 'Carnes',    en: 'Meats' },
  'Mariscos':   { es: 'Mariscos',  en: 'Seafood' },
  'Postres':    { es: 'Postres',   en: 'Desserts' },
  'Bebidas':    { es: 'Bebidas',   en: 'Drinks' },
}

export default function Menu({ initialFilter = 'Todo' }: MenuProps) {
  const { t, lang } = useLang()
  const formatPrice = useFormatPrice()
  const [active, setActive] = useState<MenuCategory>(initialFilter)
  const [search, setSearch] = useState('')
  const [items, setItems] = useState<BilingualMenuItem[]>(STATIC_ITEMS)
  const [headerRef, headerVisible] = useIntersection<HTMLDivElement>({ threshold: 0.1 })
  const [gridRef, gridVisible] = useIntersection<HTMLDivElement>({ threshold: 0.05 })

  useEffect(() => {
    supabase
      .from('menu_items')
      .select('*')
      .eq('active', true)
      .order('sort_order', { ascending: true })
      .then(({ data }) => {
        if (!data || data.length === 0) return
        setItems(data.map(r => ({
          cat: r.cat as MenuCategory,
          name: r.name,
          desc: r.description,
          descEn: r.description_en,
          price: r.price,
          badge: r.badge ?? '',
          image: r.image ?? '',
        })))
      })
  }, [])

  const filtered = useMemo(() => {
    const byCategory = active === 'Todo' ? items : items.filter(i => i.cat === active)
    const q = search.trim().toLowerCase()
    if (!q) return byCategory
    return byCategory.filter(i =>
      i.name.toLowerCase().includes(q) ||
      i.desc.toLowerCase().includes(q) ||
      i.descEn.toLowerCase().includes(q)
    )
  }, [active, search])

  return (
    <section className={styles.menu}>
      <div ref={headerRef} className={`${styles.header} fade-up ${headerVisible ? 'visible' : ''}`}>
        <p className={styles.tag}>{t('Nuestra oferta', 'Our offerings')}</p>
        <h2 className={styles.title}>{t('Menú', 'Menu')}</h2>
        <div className={styles.divider}><span>✦</span></div>
        <p className={styles.subtitle}>{t('Precios en pesos mexicanos. IVA incluido.', 'Prices in Mexican pesos. VAT included.')}</p>
      </div>

      <div className={styles.controls}>
        <div className={styles.tabs}>
          {categories.map(c => (
            <button
              key={c}
              className={`${styles.tab} ${active === c ? styles.tabActive : ''}`}
              onClick={() => setActive(c)}
            >
              {lang === 'es' ? categoryLabels[c].es : categoryLabels[c].en}
            </button>
          ))}
        </div>
        <div className={styles.searchWrapper}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            className={styles.search}
            type="text"
            placeholder={t('Buscar plato...', 'Search dish...')}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className={styles.clearSearch} onClick={() => setSearch('')}>✕</button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className={styles.empty}>
          <p>{t(`No se encontraron platos para "${search}"`, `No dishes found for "${search}"`)}</p>
          <button onClick={() => setSearch('')}>{t('Limpiar búsqueda', 'Clear search')}</button>
        </div>
      ) : (
        <div ref={gridRef} className={styles.grid}>
          {filtered.map((item, i) => (
            <div key={i} className={`${styles.card} fade-up ${gridVisible ? 'visible' : ''}`} style={{ transitionDelay: `${(i % 6) * 0.07}s` }}>
              {item.image && (
                <div className={styles.cardImgWrapper}>
                  <img src={item.image} alt={item.name} className={styles.cardImg} loading="lazy" decoding="async" />
                </div>
              )}
              <div className={styles.cardTop}>
                <div>
                  <h3 className={styles.cardName}>{item.name}</h3>
                  <p className={styles.cardCat}>{lang === 'es' ? categoryLabels[item.cat].es : categoryLabels[item.cat].en}</p>
                </div>
                {item.badge && <span className={styles.badge}>{item.badge}</span>}
              </div>
              <p className={styles.cardDesc}>{lang === 'es' ? item.desc : item.descEn}</p>
              <p className={styles.cardPrice}>{formatPrice(item.price)}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
