// ══════════════════════════════════════════════════════════
//  subscription-webhook — unica pieza que activa o suspende
//  una suscripcion de restaurante.
//
//  Mismo principio que mp-webhook: nunca se confia en el cuerpo
//  de la notificacion. MercadoPago manda un id y esta funcion
//  consulta la API oficial para saber el estado real.
//
//  Maneja dos tipos de aviso:
//   · preapproval  cambio de estado de la suscripcion
//   · payment      un cobro mensual concreto
//
//  Desplegar:
//    supabase functions deploy subscription-webhook --no-verify-jwt
//    supabase secrets set MP_ACCESS_TOKEN=... MP_WEBHOOK_SECRET=...
//  (--no-verify-jwt: quien llama es MercadoPago, no un usuario.)
// ══════════════════════════════════════════════════════════
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/** Valida la firma HMAC del header x-signature. */
async function validSignature(req: Request, dataId: string): Promise<boolean> {
  const secret = Deno.env.get('MP_WEBHOOK_SECRET')
  // Sin secreto no se puede verificar. Se rechaza en vez de aceptar
  // a ciegas: activar una suscripcion sin cobro es dinero perdido.
  if (!secret) {
    console.error('MP_WEBHOOK_SECRET no configurado: notificacion rechazada')
    return false
  }

  const header = req.headers.get('x-signature') ?? ''
  const requestId = req.headers.get('x-request-id') ?? ''

  const parts = new Map(
    header.split(',').map((kv) => {
      const [k, v] = kv.split('=')
      return [k?.trim(), v?.trim()] as [string, string]
    }),
  )
  const ts = parts.get('ts')
  const v1 = parts.get('v1')
  if (!ts || !v1) return false

  // Rechaza avisos viejos para cortar reenvios.
  const age = Math.abs(Date.now() / 1000 - Number(ts))
  if (age > 600) {
    console.error('Notificacion fuera de ventana temporal')
    return false
  }

  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(manifest))
  const hex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  return hex === v1
}

Deno.serve(async (req) => {
  const url = new URL(req.url)
  let body: Record<string, unknown> = {}
  try {
    body = await req.json()
  } catch {
    // MercadoPago tambien avisa por querystring.
  }

  const type = (body.type ?? body.topic ?? url.searchParams.get('type') ?? '') as string
  const dataId = String(
    (body.data as { id?: string })?.id ?? url.searchParams.get('data.id') ?? url.searchParams.get('id') ?? '',
  )

  if (!dataId) return new Response('sin id', { status: 400 })

  if (!(await validSignature(req, dataId))) {
    return new Response('firma invalida', { status: 401 })
  }

  const token = Deno.env.get('MP_ACCESS_TOKEN')
  if (!token) {
    console.error('MP_ACCESS_TOKEN no configurado')
    return new Response('sin configurar', { status: 500 })
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // ── Cambio de estado de la suscripcion ──────────────────
  if (type === 'subscription_preapproval' || type === 'preapproval') {
    const res = await fetch(`https://api.mercadopago.com/preapproval/${dataId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      console.error('No se pudo consultar el preapproval', dataId)
      return new Response('error consultando', { status: 502 })
    }
    const pre = await res.json()

    // external_reference lleva el id de la empresa, puesto por
    // create-subscription. Es lo que ata el cobro al cliente.
    const tenantId = pre.external_reference as string | undefined
    if (!tenantId) {
      console.error('Preapproval sin external_reference:', dataId)
      return new Response('ok')
    }

    // MercadoPago: authorized | paused | cancelled | pending
    const status = pre.status === 'authorized' ? 'authorized'
      : pre.status === 'paused' ? 'paused'
      : pre.status === 'cancelled' ? 'cancelled'
      : 'pending'

    const nextCharge = pre.next_payment_date ?? null

    await admin.from('subscriptions')
      .update({
        status,
        current_period_end: nextCharge,
        cancelled_at: status === 'cancelled' ? new Date().toISOString() : null,
      })
      .eq('mp_preapproval_id', dataId)

    // La empresa se activa o suspende segun el estado real del cobro.
    if (status === 'authorized') {
      await admin.from('tenants').update({ status: 'active' }).eq('id', tenantId)
    } else if (status === 'cancelled' || status === 'paused') {
      await admin.from('tenants').update({ status: 'suspended' }).eq('id', tenantId)
    }

    return new Response('ok')
  }

  // ── Cobro mensual concreto ──────────────────────────────
  if (type === 'payment' || type === 'subscription_authorized_payment') {
    const res = await fetch(`https://api.mercadopago.com/v1/payments/${dataId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return new Response('error consultando', { status: 502 })
    const pay = await res.json()

    const preapprovalId = pay.metadata?.preapproval_id ?? pay.preapproval_id
    if (!preapprovalId) return new Response('ok')

    const { data: sub } = await admin
      .from('subscriptions')
      .select('id, tenant_id')
      .eq('mp_preapproval_id', preapprovalId)
      .maybeSingle()

    if (!sub) {
      console.error('Cobro sin suscripcion conocida:', preapprovalId)
      return new Response('ok')
    }

    // El unique index de mp_payment_id hace esto idempotente: una
    // notificacion repetida no duplica el cobro.
    await admin.from('subscription_payments').upsert({
      subscription_id: sub.id,
      tenant_id: sub.tenant_id,
      mp_payment_id: String(pay.id),
      amount: Number(pay.transaction_amount ?? 0),
      status: pay.status,
      paid_at: pay.date_approved ?? null,
    }, { onConflict: 'mp_payment_id' })

    // Un cobro aprobado reactiva a quien estuviera suspendido.
    if (pay.status === 'approved') {
      await admin.from('tenants').update({ status: 'active' }).eq('id', sub.tenant_id)
    }

    return new Response('ok')
  }

  // Tipo no manejado: se responde 200 para que MercadoPago no reintente.
  return new Response('ok')
})
