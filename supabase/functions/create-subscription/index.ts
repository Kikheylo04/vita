// ══════════════════════════════════════════════════════════
//  create-subscription — genera el link de suscripcion mensual
//
//  El navegador manda solo el plan elegido. El importe sale de la
//  tabla plans, nunca del cliente: es lo que impide que alguien
//  se suscriba por $1 editando la peticion.
//
//  Distinto de create-payment, que cobra un pedido una sola vez.
//  Aqui se crea un "preapproval" de MercadoPago, que es un cargo
//  recurrente que se renueva solo cada mes.
//
//  Desplegar:
//    supabase functions deploy create-subscription
//    supabase secrets set MP_ACCESS_TOKEN=... PLATFORM_URL=https://tuplataforma.com
// ══════════════════════════════════════════════════════════
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const PLATFORM_URL = Deno.env.get('PLATFORM_URL') ?? 'http://localhost:5173'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function fail(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const token = Deno.env.get('MP_ACCESS_TOKEN')
  if (!token) {
    console.error('MP_ACCESS_TOKEN no configurado')
    return fail('La pasarela no esta configurada', 500)
  }

  // La identidad sale del JWT del usuario, no del cuerpo: asi nadie
  // suscribe a una empresa ajena.
  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader) return fail('Hay que iniciar sesion', 401)

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data: userData, error: userErr } = await admin.auth.getUser(
    authHeader.replace('Bearer ', ''),
  )
  if (userErr || !userData.user) return fail('Sesion invalida', 401)

  const { data: profile } = await admin
    .from('profiles')
    .select('tenant_id, role')
    .eq('id', userData.user.id)
    .maybeSingle()

  if (!profile?.tenant_id) return fail('Esta cuenta no tiene empresa')
  if (profile.role !== 'owner' && profile.role !== 'platform') {
    return fail('Solo el dueno puede contratar un plan', 403)
  }

  // El plan y su precio se leen de la base, no del navegador.
  const { data: tenant } = await admin
    .from('tenants')
    .select('id, name, plan, slug')
    .eq('id', profile.tenant_id)
    .maybeSingle()

  if (!tenant) return fail('Empresa no encontrada', 404)

  const { data: plan } = await admin
    .from('plans')
    .select('code, name, price, currency')
    .eq('code', tenant.plan)
    .maybeSingle()

  if (!plan) return fail('El plan de la empresa no existe')

  // Una suscripcion viva impide crear otra: evita cobros duplicados
  // si el dueno abre el checkout dos veces.
  const { data: existing } = await admin
    .from('subscriptions')
    .select('id, mp_preapproval_id, status')
    .eq('tenant_id', tenant.id)
    .in('status', ['pending', 'authorized'])
    .maybeSingle()

  if (existing?.status === 'authorized') {
    return fail('Esta empresa ya tiene una suscripcion activa')
  }

  const email = userData.user.email
  if (!email) return fail('La cuenta no tiene correo')

  const mpRes = await fetch('https://api.mercadopago.com/preapproval', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      reason: `${plan.name} — ${tenant.name}`,
      external_reference: tenant.id,
      payer_email: email,
      back_url: `${PLATFORM_URL}/admin?suscripcion=ok`,
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: Number(plan.price),
        currency_id: plan.currency ?? 'MXN',
      },
      status: 'pending',
    }),
  })

  const mp = await mpRes.json()

  if (!mpRes.ok) {
    console.error('MercadoPago rechazo la suscripcion:', JSON.stringify(mp))
    return fail(mp?.message ?? 'La pasarela rechazo la suscripcion', 502)
  }

  // Se guarda como 'pending': solo el webhook la pasa a autorizada,
  // y solo tras verificar contra la API de MercadoPago.
  const { error: dbErr } = await admin.from('subscriptions').upsert({
    id: existing?.id,
    tenant_id: tenant.id,
    plan: plan.code,
    status: 'pending',
    mp_preapproval_id: mp.id,
    mp_payer_email: email,
    amount: Number(plan.price),
    currency: plan.currency ?? 'MXN',
  }, { onConflict: 'id' })

  if (dbErr) {
    console.error('Error guardando la suscripcion:', dbErr.message)
    return fail('No se pudo registrar la suscripcion', 500)
  }

  return new Response(
    JSON.stringify({ checkoutUrl: mp.init_point, preapprovalId: mp.id }),
    { headers: { ...cors, 'Content-Type': 'application/json' } },
  )
})
