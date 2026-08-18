// ══════════════════════════════════════════════════════════
//  verify-domain — comprueba que el DNS del cliente ya apunta
//  a la plataforma.
//
//  Dos comprobaciones:
//   1. TXT en _verificacion.<dominio> con el token de la empresa.
//      Prueba que el dominio es suyo: sin esto, alguien podria
//      registrar un dominio ajeno y recibir su trafico.
//   2. A o CNAME apuntando a la plataforma. Prueba que el trafico
//      ya llega aqui.
//
//  Usa DNS-over-HTTPS de Google, que es gratuito y no necesita
//  credenciales. Deno no puede resolver DNS directamente.
//
//  Desplegar:
//    supabase functions deploy verify-domain
//    supabase secrets set PLATFORM_IP=76.76.21.21 PLATFORM_CNAME=cname.vercel-dns.com
// ══════════════════════════════════════════════════════════
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const PLATFORM_IP = Deno.env.get('PLATFORM_IP') ?? '76.76.21.21'
const PLATFORM_CNAME = Deno.env.get('PLATFORM_CNAME') ?? 'cname.vercel-dns.com'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

interface DnsAnswer { name: string; type: number; data: string }

/** Consulta un tipo de registro por DNS-over-HTTPS. */
async function resolve(name: string, type: 'TXT' | 'A' | 'CNAME'): Promise<string[]> {
  try {
    const res = await fetch(
      `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`,
      { headers: { Accept: 'application/dns-json' } },
    )
    if (!res.ok) return []
    const data = await res.json()
    const answers = (data.Answer ?? []) as DnsAnswer[]
    // El valor TXT viene entre comillas; el CNAME con punto final.
    return answers.map((a) => a.data.replace(/^"|"$/g, '').replace(/\.$/, ''))
  } catch (err) {
    console.error(`Error resolviendo ${type} de ${name}:`, err)
    return []
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader) return json({ error: 'Hay que iniciar sesion' }, 401)

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data: userData, error: userErr } = await admin.auth.getUser(
    authHeader.replace('Bearer ', ''),
  )
  if (userErr || !userData.user) return json({ error: 'Sesion invalida' }, 401)

  // La empresa sale del perfil, no del cuerpo: nadie verifica el
  // dominio de otro.
  const { data: profile } = await admin
    .from('profiles')
    .select('tenant_id, role')
    .eq('id', userData.user.id)
    .maybeSingle()

  if (!profile?.tenant_id) return json({ error: 'Esta cuenta no tiene empresa' }, 400)
  if (profile.role !== 'owner' && profile.role !== 'platform') {
    return json({ error: 'Solo el dueno puede verificar el dominio' }, 403)
  }

  const { data: tenant } = await admin
    .from('tenants')
    .select('id, custom_domain, domain_token')
    .eq('id', profile.tenant_id)
    .maybeSingle()

  if (!tenant?.custom_domain || !tenant.domain_token) {
    return json({ error: 'Primero registra un dominio' }, 400)
  }

  const domain = tenant.custom_domain as string
  const expected = `plataforma-verificacion=${tenant.domain_token}`

  // 1. Propiedad del dominio
  const txt = await resolve(`_verificacion.${domain}`, 'TXT')
  const ownershipOk = txt.includes(expected)

  // 2. El trafico ya apunta aqui. Se acepta A o CNAME: la raiz de un
  //    dominio no siempre admite CNAME, segun el proveedor.
  const [aRecords, cname] = await Promise.all([
    resolve(domain, 'A'),
    resolve(domain, 'CNAME'),
  ])
  const pointingOk = aRecords.includes(PLATFORM_IP) || cname.includes(PLATFORM_CNAME)

  const ok = ownershipOk && pointingOk

  await admin.from('tenants').update({
    domain_status: ok ? 'verified' : 'failed',
    domain_checked_at: new Date().toISOString(),
  }).eq('id', tenant.id)

  return json({
    ok,
    domain,
    ownership: ownershipOk,
    pointing: pointingOk,
    // Se devuelve lo encontrado para que el cliente vea por que
    // fallo, en vez de un "no funciona" sin explicacion.
    found: { txt, a: aRecords, cname },
    expected: {
      txt: { name: `_verificacion.${domain}`, value: expected },
      a: PLATFORM_IP,
      cname: PLATFORM_CNAME,
    },
  })
})
