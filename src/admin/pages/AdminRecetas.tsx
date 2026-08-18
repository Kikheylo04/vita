import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Ingredient, RecipeItem, MenuItemCost } from '../../types/admin'
import styles from './AdminRecetas.module.css'
import { IconAlert, IconCheckCircle } from '../ui/Icons'

function money(n: number) {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })
}

function fmtQty(n: number) {
  return Number(n).toLocaleString('es-MX', { maximumFractionDigits: 3 })
}

export default function AdminRecetas() {
  const [dishes, setDishes] = useState<MenuItemCost[]>([])
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState<MenuItemCost | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function load() {
    setLoading(true)
    const [costs, ings] = await Promise.all([
      supabase.from('menu_item_costs').select('*').order('name'),
      supabase.from('ingredients').select('*').eq('active', true).order('name'),
    ])
    setLoading(false)

    if (costs.error) {
      console.error('Error cargando costos:', costs.error.message)
      setMsg({ ok: false, text: 'No se pudieron cargar los platillos.' })
      return
    }
    if (ings.error) console.error('Error cargando ingredientes:', ings.error.message)

    setDishes((costs.data ?? []) as MenuItemCost[])
    setIngredients((ings.data ?? []) as Ingredient[])
  }

  useEffect(() => { load() }, [])

  const withRecipe = dishes.filter(d => d.ingredient_count > 0).length

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <div>
          <h2 className={styles.title}>Recetas</h2>
          <p className={styles.sub}>
            Los ingredientes se descuentan del inventario al marcar un pedido como listo.
          </p>
        </div>
        {!loading && dishes.length > 0 && (
          <span className={styles.tally}>
            {withRecipe} de {dishes.length} con receta
          </span>
        )}
      </div>

      {msg && (
        <p className={msg.ok ? styles.ok : styles.err} role="alert">
          {msg.ok ? <IconCheckCircle size={16} /> : <IconAlert size={16} />}
          <span>{msg.text}</span>
        </p>
      )}

      {loading ? (
        <p className={styles.empty}>Cargando…</p>
      ) : dishes.length === 0 ? (
        <p className={styles.empty}>Aún no hay platillos en el menú.</p>
      ) : ingredients.length === 0 ? (
        <p className={styles.empty}>
          Primero crea ingredientes en la sección «Inventario».
        </p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Platillo</th>
                <th className={styles.num}>Precio</th>
                <th className={styles.num}>Costo</th>
                <th className={styles.num}>Margen</th>
                <th>Receta</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {dishes.map(d => {
                const hasRecipe = d.ingredient_count > 0
                // Sin receta el costo es 0, asi que el margen del 100% es
                // ficticio: se marca como pendiente en vez de mostrarlo.
                const margin = d.margin_pct
                return (
                  <tr key={d.menu_item_id}>
                    <td><span className={styles.dishName}>{d.name}</span></td>
                    <td className={styles.num}>{money(d.price)}</td>
                    <td className={styles.num}>
                      {hasRecipe ? money(d.cost) : <span className={styles.muted}>—</span>}
                    </td>
                    <td className={styles.num}>
                      {hasRecipe ? (
                        <span className={margin < 30 ? styles.marginLow : margin < 60 ? styles.marginMid : styles.marginOk}>
                          {margin}%
                        </span>
                      ) : <span className={styles.muted}>—</span>}
                    </td>
                    <td>
                      {hasRecipe ? (
                        <span className={styles.pillOk}>
                          {d.ingredient_count} {d.ingredient_count === 1 ? 'ingrediente' : 'ingredientes'}
                        </span>
                      ) : (
                        <span className={styles.pillOff}>Sin receta</span>
                      )}
                    </td>
                    <td className={styles.num}>
                      <button className={styles.btnGhost} onClick={() => { setOpen(d); setMsg(null) }}>
                        {hasRecipe ? 'Editar' : 'Definir'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <RecipeModal
          dish={open}
          ingredients={ingredients}
          onClose={() => setOpen(null)}
          onDone={(text) => { setOpen(null); setMsg({ ok: true, text }); load() }}
        />
      )}
    </div>
  )
}

/* ── Editor de receta ─────────────────────── */
function RecipeModal({ dish, ingredients, onClose, onDone }: {
  dish: MenuItemCost
  ingredients: Ingredient[]
  onClose: () => void
  onDone: (text: string) => void
}) {
  const [rows, setRows] = useState<RecipeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [addId, setAddId] = useState('')
  const [addQty, setAddQty] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => {
    supabase
      .from('recipe_items')
      .select('id,menu_item_id,ingredient_id,quantity,ingredients(id,name,unit,category,cost,active)')
      .eq('menu_item_id', dish.menu_item_id)
      .then(({ data, error }) => {
        setLoading(false)
        if (error) { console.error('Error cargando la receta:', error.message); setErr('No se pudo cargar la receta.'); return }
        setRows((data ?? []) as unknown as RecipeItem[])
      })
  }, [dish.menu_item_id])

  const used = new Set(rows.map(r => r.ingredient_id))
  const available = ingredients.filter(i => !used.has(i.id))
  const totalCost = rows.reduce((sum, r) => sum + r.quantity * (r.ingredients?.cost ?? 0), 0)

  async function add(e: React.FormEvent) {
    e.preventDefault()
    const qty = Number(addQty)
    if (!addId) { setErr('Elige un ingrediente.'); return }
    if (!addQty || Number.isNaN(qty) || qty <= 0) { setErr('La cantidad debe ser mayor que cero.'); return }

    const { data, error } = await supabase
      .from('recipe_items')
      .insert({ menu_item_id: dish.menu_item_id, ingredient_id: addId, quantity: qty })
      .select('id,menu_item_id,ingredient_id,quantity,ingredients(id,name,unit,category,cost,active)')
      .single()

    if (error) {
      console.error('Error agregando el ingrediente:', error.message)
      setErr(`No se pudo agregar: ${error.message}`)
      return
    }
    setRows(prev => [...prev, data as unknown as RecipeItem])
    setAddId('')
    setAddQty('')
    setErr('')
  }

  async function remove(row: RecipeItem) {
    const { error } = await supabase.from('recipe_items').delete().eq('id', row.id)
    if (error) {
      console.error('Error quitando el ingrediente:', error.message)
      setErr(`No se pudo quitar: ${error.message}`)
      return
    }
    setRows(prev => prev.filter(r => r.id !== row.id))
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHead}>
          <h3>{dish.name}</h3>
          <button onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        <div className={styles.modalBody}>
          <p className={styles.portionNote}>Cantidades para una porción.</p>

          {loading ? (
            <p className={styles.empty}>Cargando…</p>
          ) : rows.length === 0 ? (
            <p className={styles.empty}>Esta receta aún no tiene ingredientes.</p>
          ) : (
            <ul className={styles.recipeList}>
              {rows.map(r => (
                <li key={r.id} className={styles.recipeRow}>
                  <span className={styles.rName}>{r.ingredients?.name}</span>
                  <span className={styles.rQty}>
                    {fmtQty(r.quantity)} {r.ingredients?.unit}
                  </span>
                  <span className={styles.rCost}>
                    {money(r.quantity * (r.ingredients?.cost ?? 0))}
                  </span>
                  <button className={styles.btnX} onClick={() => remove(r)} aria-label={`Quitar ${r.ingredients?.name}`}>
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}

          {rows.length > 0 && (
            <div className={styles.totals}>
              <span>Costo por porción</span>
              <strong>{money(totalCost)}</strong>
            </div>
          )}

          {rows.length > 0 && dish.price > 0 && (
            <div className={styles.totals}>
              <span>Margen sobre {money(dish.price)}</span>
              <strong className={totalCost / dish.price > 0.7 ? styles.marginLow : styles.marginOk}>
                {Math.round(((dish.price - totalCost) / dish.price) * 100)}%
              </strong>
            </div>
          )}

          {available.length > 0 && (
            <form className={styles.addRow} onSubmit={add}>
              <select
                className={styles.select} value={addId}
                onChange={e => { setAddId(e.target.value); setErr('') }}
                aria-label="Ingrediente"
              >
                <option value="">Agregar ingrediente…</option>
                {available.map(i => (
                  <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>
                ))}
              </select>
              <input
                className={styles.qtyInput} type="number" step="0.001" value={addQty}
                onChange={e => { setAddQty(e.target.value); setErr('') }}
                placeholder="Cantidad" aria-label="Cantidad"
              />
              <button type="submit" className={styles.btnAdd}>Agregar</button>
            </form>
          )}

          {err && <p className={styles.err} role="alert"><IconAlert size={16} /><span>{err}</span></p>}

          <div className={styles.modalFoot}>
            <button
              className={styles.btnSave}
              onClick={() => onDone(`Receta de ${dish.name} actualizada.`)}
            >
              Listo
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
