// Cobro con Stripe DENTRO de Pantalay (la tarjeta se escribe en la página, con el Payment Element de Stripe):
// nadie sale a una página de Stripe. Aquí: productos y precios, cliente, suscripción y el aviso (webhook) firmado.
// Se habla con la API de Stripe por fetch (sin librería): funciona en el borde y se prueba con un fetch falso.
import type { Plan } from './planes';

export type EnvPago = {
  STRIPE_SECRETA?: string;
  STRIPE_PUBLICABLE?: string;
  STRIPE_WEBHOOK_SECRETO?: string;
};

export type PlanPago = Extract<Plan, 'business' | 'business_ia'>;
export type Ciclo = 'mensual' | 'anual';

/** Versión fija de la API: con ella la factura trae su PaymentIntent (la respuesta no cambia sola). */
const VERSION = '2024-06-20';

/** Precio de fundador (50 % de por vida) en centavos de dólar, por usuario. Anual = 12 meses del precio anual. */
export const PRECIOS_FUNDADOR: Record<PlanPago, Record<Ciclo, number>> = {
  business: { mensual: 900, anual: 9000 },
  business_ia: { mensual: 1200, anual: 12000 },
};

const NOMBRE: Record<PlanPago, string> = {
  business: 'Pantalay Business',
  business_ia: 'Pantalay Business + AI',
};

export const llavePrecio = (plan: PlanPago, ciclo: Ciclo) => `pantalay_${plan}_${ciclo}_fundador`;

export function pagoListo(env: EnvPago): boolean {
  return Boolean(env.STRIPE_SECRETA && env.STRIPE_PUBLICABLE && env.STRIPE_WEBHOOK_SECRETO);
}

export class ErrorPago extends Error {
  constructor(
    public codigo: string,
    mensaje?: string,
  ) {
    super(mensaje ?? codigo);
  }
}

/** Cuerpo de formulario al estilo de Stripe: a[b][c]=valor. */
export function formulario(datos: Record<string, unknown>, prefijo = ''): string {
  const partes: string[] = [];
  for (const [k, v] of Object.entries(datos)) {
    if (v === undefined || v === null) continue;
    const clave = prefijo ? `${prefijo}[${k}]` : k;
    if (Array.isArray(v))
      v.forEach((x, i) =>
        partes.push(
          typeof x === 'object' && x !== null
            ? formulario(x as Record<string, unknown>, `${clave}[${i}]`)
            : `${encodeURIComponent(`${clave}[]`)}=${encodeURIComponent(String(x))}`,
        ),
      );
    else if (typeof v === 'object') partes.push(formulario(v as Record<string, unknown>, clave));
    else partes.push(`${encodeURIComponent(clave)}=${encodeURIComponent(String(v))}`);
  }
  return partes.filter(Boolean).join('&');
}

async function stripe<T>(
  env: EnvPago,
  metodo: 'GET' | 'POST',
  ruta: string,
  datos?: Record<string, unknown>,
  idempotencia?: string,
): Promise<T> {
  if (!env.STRIPE_SECRETA) throw new ErrorPago('pago_apagado');
  const cuerpo = datos ? formulario(datos) : '';
  const url = `https://api.stripe.com/v1/${ruta}${metodo === 'GET' && cuerpo ? `?${cuerpo}` : ''}`;
  const h: Record<string, string> = {
    authorization: `Bearer ${env.STRIPE_SECRETA}`,
    'stripe-version': VERSION,
  };
  if (metodo === 'POST') h['content-type'] = 'application/x-www-form-urlencoded';
  if (idempotencia) h['idempotency-key'] = idempotencia;
  const r = await fetch(url, { method: metodo, headers: h, body: metodo === 'POST' ? cuerpo : undefined });
  const j = (await r.json().catch(() => ({}))) as T & { error?: { message?: string; code?: string } };
  if (!r.ok) {
    console.error('stripe', ruta, r.status, j.error?.code, j.error?.message);
    throw new ErrorPago(r.status === 402 ? 'tarjeta' : 'stripe', j.error?.message);
  }
  return j;
}

type Precio = { id: string; lookup_key: string | null };

/** Busca el precio de fundador por su llave; si no existe (primera vez), crea el producto y el precio. */
export async function precioDe(env: EnvPago, plan: PlanPago, ciclo: Ciclo): Promise<string> {
  const llave = llavePrecio(plan, ciclo);
  const lista = await stripe<{ data: Precio[] }>(env, 'GET', 'prices', {
    lookup_keys: [llave],
    active: true,
  });
  const ya = lista.data[0];
  if (ya) return ya.id;
  const p = await stripe<Precio>(
    env,
    'POST',
    'prices',
    {
      currency: 'usd',
      unit_amount: PRECIOS_FUNDADOR[plan][ciclo],
      recurring: { interval: ciclo === 'anual' ? 'year' : 'month' },
      lookup_key: llave,
      nickname: `${NOMBRE[plan]} · ${ciclo === 'anual' ? 'Annual' : 'Monthly'} · Founder`,
      product_data: { name: NOMBRE[plan], metadata: { plan } },
      metadata: { plan, ciclo, fundador: '1' },
    },
    `precio-${llave}`,
  );
  return p.id;
}

export async function crearCliente(
  env: EnvPago,
  u: { id: string; correo: string; nombre: string },
): Promise<string> {
  const c = await stripe<{ id: string }>(
    env,
    'POST',
    'customers',
    { email: u.correo, name: u.nombre, metadata: { usuario_id: u.id } },
    `cliente-${u.id}`,
  );
  return c.id;
}

export type Intento = { suscripcion: string; secreto: string; tipo: 'pago' | 'tarjeta' };

type Suscripcion = {
  id: string;
  status: string;
  latest_invoice?: { payment_intent?: { client_secret?: string } | null } | null;
  pending_setup_intent?: { client_secret?: string } | null;
};

/**
 * Crea la suscripción «incompleta» y devuelve el secreto para que la página confirme la tarjeta ahí mismo.
 * Con prueba gratis no hay cobro inicial: se guarda la tarjeta (SetupIntent) y se cobra al terminar la prueba.
 */
export async function crearSuscripcion(
  env: EnvPago,
  cliente: string,
  precio: string,
  datos: { usuario_id: string; plan: PlanPago; ciclo: Ciclo; diasPrueba: number },
): Promise<Intento> {
  const s = await stripe<Suscripcion>(env, 'POST', 'subscriptions', {
    customer: cliente,
    items: [{ price: precio }],
    payment_behavior: 'default_incomplete',
    payment_settings: { save_default_payment_method: 'on_subscription' },
    trial_period_days: datos.diasPrueba > 0 ? datos.diasPrueba : undefined,
    metadata: { usuario_id: datos.usuario_id, plan: datos.plan, ciclo: datos.ciclo, fundador: '1' },
    expand: ['latest_invoice.payment_intent', 'pending_setup_intent'],
  });
  const pago = s.latest_invoice?.payment_intent?.client_secret;
  const tarjeta = s.pending_setup_intent?.client_secret;
  if (pago) return { suscripcion: s.id, secreto: pago, tipo: 'pago' };
  if (tarjeta) return { suscripcion: s.id, secreto: tarjeta, tipo: 'tarjeta' };
  throw new ErrorPago('stripe', 'la suscripción no trajo secreto');
}

export async function cancelarAlFinal(env: EnvPago, suscripcion: string): Promise<void> {
  await stripe(env, 'POST', `subscriptions/${suscripcion}`, { cancel_at_period_end: true });
}

// ---------- aviso de Stripe (webhook) ----------

const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');

/** Comprueba la firma «Stripe-Signature» (t=…,v1=…) con el secreto del aviso y una tolerancia de 5 minutos. */
export async function firmaValida(
  cuerpo: string,
  cabecera: string | undefined,
  secreto: string | undefined,
  ahora = Date.now(),
): Promise<boolean> {
  if (!cabecera || !secreto) return false;
  const partes = Object.fromEntries(cabecera.split(',').map((p) => p.split('=') as [string, string]));
  const t = Number(partes.t);
  const firmas = cabecera
    .split(',')
    .filter((p) => p.startsWith('v1='))
    .map((p) => p.slice(3));
  if (!t || !firmas.length || Math.abs(ahora / 1000 - t) > 300) return false;
  const llave = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secreto),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const esperada = hex(await crypto.subtle.sign('HMAC', llave, new TextEncoder().encode(`${t}.${cuerpo}`)));
  // Comparación de largo fijo (sin cortar antes) para no regalar pistas por el tiempo.
  return firmas.some((f) => {
    if (f.length !== esperada.length) return false;
    let d = 0;
    for (let i = 0; i < f.length; i++) d |= f.charCodeAt(i) ^ esperada.charCodeAt(i);
    return d === 0;
  });
}

export type CambioSuscripcion = {
  usuario_id: string;
  plan: PlanPago;
  ciclo: Ciclo;
  activa: boolean;
  suscripcion: string;
  cliente: string;
};

/** Lee un aviso de suscripción y dice qué plan queda en la cuenta. null si el aviso no es de suscripciones. */
export function leerAviso(evento: {
  type?: string;
  data?: { object?: Record<string, unknown> };
}): CambioSuscripcion | null {
  if (!evento.type?.startsWith('customer.subscription.')) return null;
  const s = evento.data?.object as
    { id: string; status: string; customer: string; metadata?: Record<string, string> } | undefined;
  const m = s?.metadata ?? {};
  if (!s || !m.usuario_id || (m.plan !== 'business' && m.plan !== 'business_ia')) return null;
  // Activa mientras está pagada o en prueba; «past_due» conserva el plan unos días mientras Stripe reintenta.
  const activa =
    evento.type !== 'customer.subscription.deleted' && ['active', 'trialing', 'past_due'].includes(s.status);
  return {
    usuario_id: m.usuario_id,
    plan: m.plan,
    ciclo: m.ciclo === 'anual' ? 'anual' : 'mensual',
    activa,
    suscripcion: s.id,
    cliente: s.customer,
  };
}
