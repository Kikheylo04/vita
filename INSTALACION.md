# Instalación

Guía para poner la plantilla en marcha para un restaurante nuevo.
Toma entre 40 y 90 minutos según cuántos módulos se activen.

---

## Resumen

| Paso | Qué haces | Tiempo |
|---|---|---|
| 1 | Crear el proyecto de Supabase | 5 min |
| 2 | Correr las migraciones SQL | 10 min |
| 3 | Crear el usuario administrador | 3 min |
| 4 | Editar `src/config/brand.ts` | 15 min |
| 5 | Ajustar `index.html` | 10 min |
| 6 | Cargar el menú desde el panel | 20 min |
| 7 | Publicar | 10 min |

---

## 1. Supabase

1. Crear un proyecto en [supabase.com](https://supabase.com) (el plan gratuito basta para empezar).
2. En **Settings → API**, copiar el *Project URL* y la *anon public key*.
3. Copiar `.env.example` a `.env` y pegar ambos valores.

```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

## 2. Migraciones

En **SQL Editor → New query**, pegar y ejecutar **en este orden**. Cada
una debe terminar con `Success. No rows returned`.

| Orden | Archivo | Necesario |
|---|---|---|
| 1 | `supabase_setup.sql` | Sí — tablas base |
| 2 | `supabase_storage.sql` | Sí — imágenes del menú |
| 3 | `supabase_contact.sql` | Sí — formulario de contacto |
| 4 | `supabase_orders.sql` | Si hay pedido anticipado |
| 5 | `supabase_orders_secure.sql` | **Sí, si corriste la 4** |
| 6 | `supabase_config_seed.sql` | Recomendado — datos iniciales |
| 7 | `supabase_branches.sql` | Si hay más de una sucursal |
| 8 | `supabase_inventory.sql` | Si se controla inventario |
| 9 | `supabase_recipes.sql` | Si el inventario descuenta solo |
| 10 | `supabase_branch_menu.sql` | Si cada sucursal tiene su carta |

> **El paso 5 no es opcional si corriste el 4.** Sin él, los precios de
> los pedidos se pueden manipular desde el navegador. Las migraciones
> 7 a 10 son acumulativas: la 9 necesita la 8, y la 10 necesita la 9.

Verificar al terminar:

```sql
select table_name from information_schema.tables
where table_schema = 'public' order by table_name;
```

## 3. Usuario administrador

1. En **Authentication → Users → Add user**, crear el correo del cliente
   con *Auto Confirm User* activado.
2. Si corriste `supabase_branches.sql`, darle rol de administrador:

```sql
update profiles set role = 'admin'
where id = (select id from auth.users where email = 'correo@delcliente.com');
```

3. Comprobar:

```sql
select u.email, p.role from profiles p
join auth.users u on u.id = p.id;
```

## 4. Identidad — `src/config/brand.ts`

**Es el único archivo de código que hay que editar.** Está dividido en
nueve bloques comentados.

**Lo mínimo que hay que cambiar:**

- `BRAND` — nombre, nombre completo, lema, año, tipo de cocina
- `CONTACT` — teléfono, correo, dirección, mapa
- `SOCIAL` — Instagram, Facebook, WhatsApp
- `SITE.domain` — dominio final, con `https` y sin barra al final

**Colores.** En `THEME`. `primary` es el acento principal y `gold` el
secundario. Los tres tonos `dark` son los fondos: conviene mantener el
contraste entre ellos.

**Logo.** Con `LOGO.kind = 'text'` el nombre se dibuja con la tipografía
de títulos, sin necesidad de un archivo. Para un logo propio:

```ts
export const LOGO: BrandLogo = {
  kind: 'image',
  url: '/logo.svg',   // archivo en /public
  eyebrow: '',
}
```

**Moneda.** `CURRENCY.baseIn` decide cómo se leen los precios del
catálogo. Con `'local'` se toman tal cual — es lo normal. Con `'USD'`
se multiplican por `usdRate`.

**Módulos.** En `FEATURES` se apaga lo que el restaurante no use. Si
pones `inventory: false`, no hace falta correr las migraciones 8 y 9.

## 5. `index.html`

No lee de `brand.ts` porque el navegador lo procesa antes de cargar la
app. Hay que editarlo a mano:

- `<title>` y `<meta name="description">`
- Las etiquetas `og:` y `twitter:`
- El bloque `application/ld+json` — nombre, dirección, teléfono,
  coordenadas y horarios
- El `<link rel="canonical">`
- El script de Google Analytics (borrarlo si no se usa)

Si cambias las tipografías en `THEME`, actualiza también el `<link>` de
Google Fonts.

## 6. Contenido

Entrar a `tudominio.com/admin` con el usuario del paso 3.

- **Configuración** — datos de contacto. Pisan a `brand.ts` en caliente,
  así que el cliente puede corregirlos sin tocar código.
- **Menú** — los platillos. El menú de ejemplo del código solo se muestra
  si la tabla está vacía.
- **Sucursales, Inventario, Recetas, Carta** — solo si activaste esos
  módulos.

## 7. Publicar

Con Vercel:

1. Importar el repositorio.
2. Cargar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en las variables
   de entorno del proyecto.
3. Desplegar. `vercel.json` ya trae la reescritura de rutas.

Después del primer despliegue, agregar el dominio en **Supabase →
Authentication → URL Configuration**, o el acceso al panel fallará.

---

## Comprobación final

- [ ] El sitio abre y el menú muestra los platillos de la base
- [ ] Se puede hacer una reservación y aparece en el panel
- [ ] Se puede hacer un pedido y llega con sus platillos y su total
- [ ] El formulario de contacto guarda el mensaje
- [ ] `/admin` pide contraseña y permite guardar cambios
- [ ] Los colores y el logo son los del cliente
- [ ] El sitio se ve bien en un teléfono

**La prueba del pedido es la más importante.** Confirma que la migración
de precios está activa: si `order_items.price` no coincide con el precio
del catálogo, falta correr `supabase_orders_secure.sql`.

---

## Problemas frecuentes

**El menú muestra platillos italianos que nadie cargó.** La tabla
`menu_items` está vacía y se está viendo el respaldo del código. Cargar
el menú real desde el panel.

**El panel deja ver pero no guardar.** El usuario no tiene perfil de
administrador. Repetir el paso 3.

**Los pedidos fallan al confirmar.** Falta `menu_item_id`: correr
`supabase_orders_secure.sql`.

**Los colores no cambian.** `applyTheme()` corre al arrancar; si editaste
`brand.ts` con el servidor encendido, recargar con Ctrl+Shift+R.

**Error de CORS al entrar al panel.** El dominio no está en la lista de
Supabase. Agregarlo en Authentication → URL Configuration.
