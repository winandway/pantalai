// Correos de Pantalay desde noreply@pantalay.com, con el envío de YaDominios (firmados con DKIM).
// Bienvenida, recuperar la contraseña, contraseña cambiada y avisos de pago. En inglés o español según la persona.
// Si el envío falla, el flujo sigue (nadie se queda sin registrarse por un correo): el error queda en el registro.
import { DOMINIO } from './dominio';

export type EnvCorreo = { CORREO_TOKEN?: string; CORREO_SITIO?: string };
export type Idioma = 'en' | 'es';

const ENVIO = 'https://yapanel.yadominios.com/api/hosting/correo/enviar';
export const REMITENTE = { address: 'noreply@pantalay.com', name: 'Pantalay' };

export function correoListo(env: EnvCorreo): boolean {
  return Boolean(env.CORREO_TOKEN);
}

const escapar = (t: string) =>
  t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Plantilla corporativa: cabecera oscura con la franja de colores de la marca (rosado, naranja, amarillo, lila),
 * ícono grande, tarjeta blanca, botón rojo y pie oscuro. Hecha con tablas y estilos en línea para que se vea bien en
 * Gmail, Outlook, Apple Mail y el celular (con color sólido de respaldo donde no hay degradados).
 */
export function plantilla(
  idioma: Idioma,
  datos: {
    titulo: string;
    parrafos: string[];
    boton?: { texto: string; url: string };
    nota?: string;
    icono?: string;
    etiqueta?: string;
    /** Filas tipo recibo: [concepto, valor]. */
    detalle?: [string, string][];
  },
): { html: string; text: string } {
  const es = idioma === 'es';
  const pie = es
    ? `Recibes este correo porque tienes una cuenta en Pantalay.`
    : `You get this email because you have a Pantalay account.`;
  const firma = `© ${new Date().getFullYear()} pantalay.com · ${es ? 'Desarrollado por' : 'Developed by'} Windoce LLC`;
  const boton = datos.boton
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:30px 0 8px"><tr><td bgcolor="#e5484d" style="border-radius:12px;background:#e5484d;background-image:linear-gradient(135deg,#ff4f6d,#e5484d)">
<a href="${escapar(datos.boton.url)}" style="display:inline-block;padding:15px 30px;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;border-radius:12px">${escapar(datos.boton.texto)} &rarr;</a></td></tr></table>`
    : '';
  const detalle = datos.detalle?.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0 4px;border:1px solid #eceef2;border-radius:12px;border-collapse:separate">
${datos.detalle
  .map(
    ([k, v], i) =>
      `<tr><td style="padding:12px 16px;font-size:14px;color:#6b7280;${i ? 'border-top:1px solid #eceef2;' : ''}">${escapar(k)}</td><td align="right" style="padding:12px 16px;font-size:14px;font-weight:700;color:#16181d;${i ? 'border-top:1px solid #eceef2;' : ''}">${escapar(v)}</td></tr>`,
  )
  .join('')}
</table>`
    : '';
  const html = `<!doctype html><html lang="${idioma}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${escapar(datos.titulo)}</title></head>
<body style="margin:0;padding:0;background:#eef0f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#16181d">
<div style="display:none;max-height:0;overflow:hidden">${escapar(datos.parrafos[0] ?? '')}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#eef0f4"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px">
<tr><td bgcolor="#0f1115" style="background:#0f1115;background-image:radial-gradient(420px 180px at 85% 0%,rgba(229,72,77,.45),transparent 70%),radial-gradient(380px 180px at 0% 100%,rgba(180,107,255,.35),transparent 70%);border-radius:20px 20px 0 0;padding:28px 32px 34px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td style="font-size:20px;font-weight:800;color:#ffffff;letter-spacing:-.01em"><span style="display:inline-block;width:14px;height:14px;border-radius:50%;background:#e5484d;margin-right:9px;vertical-align:-1px;box-shadow:0 0 0 4px rgba(229,72,77,.25)"></span>Pantalay</td>
${datos.etiqueta ? `<td align="right"><span style="display:inline-block;padding:5px 12px;border-radius:999px;background:rgba(255,255,255,.12);color:#ffffff;font-size:12px;font-weight:700;letter-spacing:.04em">${escapar(datos.etiqueta)}</span></td>` : ''}
</tr></table>
${datos.icono ? `<div style="margin:26px 0 0;font-size:44px;line-height:1">${datos.icono}</div>` : ''}
<h1 style="margin:${datos.icono ? '14px' : '26px'} 0 0;font-size:28px;line-height:1.2;color:#ffffff;font-weight:800;letter-spacing:-.02em">${escapar(datos.titulo)}</h1>
</td></tr>
<tr><td height="5" style="height:5px;line-height:5px;font-size:0;background:#ff9f43;background-image:linear-gradient(90deg,#ff4fa3,#ff9f43,#ffe14d,#b46bff)">&nbsp;</td></tr>
<tr><td bgcolor="#ffffff" style="background:#ffffff;border-radius:0 0 20px 20px;padding:32px 32px 30px">
${datos.parrafos.map((p) => `<p style="margin:0 0 14px;font-size:16px;line-height:1.65;color:#3b4150">${escapar(p)}</p>`).join('')}
${detalle}
${boton}
${datos.nota ? `<p style="margin:18px 0 0;padding:14px 16px;border-radius:12px;background:#f6f7f9;font-size:13px;line-height:1.55;color:#6b7280">${escapar(datos.nota)}</p>` : ''}
</td></tr>
<tr><td align="center" style="padding:22px 16px 6px">
<p style="margin:0 0 6px;font-size:12px;color:#6b7280">${escapar(pie)}</p>
<p style="margin:0;font-size:12px;color:#9aa0ab">${escapar(firma)}</p>
</td></tr>
</table></td></tr></table></body></html>`;
  const text = [
    datos.titulo,
    '',
    ...datos.parrafos,
    ...(datos.detalle?.length ? ['', ...datos.detalle.map(([k, v]) => `${k}: ${v}`)] : []),
    ...(datos.boton ? ['', `${datos.boton.texto}: ${datos.boton.url}`] : []),
    ...(datos.nota ? ['', datos.nota] : []),
    '',
    '—',
    pie,
    firma,
  ].join('\n');
  return { html, text };
}

export type Mensaje = { para: string; nombre?: string; asunto: string; html: string; text: string };

export class ErrorCorreo extends Error {}

/** Envía un correo. Devuelve true si salió; si rebota o falla, false (y lo deja en el registro). */
export async function enviar(env: EnvCorreo, m: Mensaje): Promise<boolean> {
  if (!env.CORREO_TOKEN) {
    console.error('correo: falta CORREO_TOKEN, no se envió', m.asunto);
    return false;
  }
  try {
    const r = await fetch(ENVIO, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        sitio: env.CORREO_SITIO || 'pantalai',
        token: env.CORREO_TOKEN,
        from: REMITENTE,
        to: [{ address: m.para, ...(m.nombre ? { name: m.nombre } : {}) }],
        subject: m.asunto,
        text: m.text,
        html: m.html,
      }),
    });
    const j = (await r.json().catch(() => ({}))) as {
      success?: boolean;
      codigo?: string;
      rebotados?: string[];
    };
    if (!r.ok || !j.success) {
      console.error('correo: no salió', r.status, j.codigo, m.asunto);
      return false;
    }
    if (j.rebotados?.length) console.error('correo: rebotó', m.asunto);
    return true;
  } catch (e) {
    console.error('correo: error de red', e);
    return false;
  }
}

// ---------- los correos ----------

export function correoBienvenida(idioma: Idioma, nombre: string): Omit<Mensaje, 'para'> {
  const es = idioma === 'es';
  const p = plantilla(idioma, {
    icono: '🎬',
    etiqueta: es ? 'BIENVENIDA' : 'WELCOME',
    titulo: es ? `¡Bienvenido a Pantalay, ${nombre}!` : `Welcome to Pantalay, ${nombre}!`,
    parrafos: es
      ? [
          'Tu cuenta ya está lista. Graba tu pantalla y tu cámara, y comparte el enlace en segundos.',
          'Puedes dibujar mientras grabas, recortar las puntas, y dejar que la IA escriba el título y el resumen.',
        ]
      : [
          'Your account is ready. Record your screen and camera, and share the link in seconds.',
          'You can draw while you record, trim the ends, and let AI write the title and summary.',
        ],
    boton: { texto: es ? 'Grabar mi primer video' : 'Record my first video', url: `${DOMINIO}/record` },
    nota: es
      ? `¿Dudas? Todo está explicado en ${DOMINIO}/docs`
      : `Questions? Everything is explained at ${DOMINIO}/docs`,
  });
  return { nombre, asunto: es ? 'Tu cuenta de Pantalay está lista' : 'Your Pantalay account is ready', ...p };
}

export function correoRecuperar(idioma: Idioma, nombre: string, enlace: string): Omit<Mensaje, 'para'> {
  const es = idioma === 'es';
  const p = plantilla(idioma, {
    icono: '🔑',
    etiqueta: es ? 'SEGURIDAD' : 'SECURITY',
    titulo: es ? 'Crea una contraseña nueva' : 'Create a new password',
    parrafos: es
      ? [
          `Hola ${nombre}: alguien pidió cambiar la contraseña de tu cuenta de Pantalay.`,
          'El enlace sirve una sola vez durante una hora.',
        ]
      : [
          `Hi ${nombre}: someone asked to change the password of your Pantalay account.`,
          'The link works once, for one hour.',
        ],
    boton: { texto: es ? 'Crear contraseña nueva' : 'Create new password', url: enlace },
    nota: es
      ? 'Si no fuiste tú, ignora este correo: tu contraseña sigue igual.'
      : 'If it wasn’t you, ignore this email: your password stays the same.',
  });
  return { nombre, asunto: es ? 'Cambia tu contraseña de Pantalay' : 'Reset your Pantalay password', ...p };
}

export function correoClaveCambiada(idioma: Idioma, nombre: string): Omit<Mensaje, 'para'> {
  const es = idioma === 'es';
  const p = plantilla(idioma, {
    icono: '🛡️',
    etiqueta: es ? 'SEGURIDAD' : 'SECURITY',
    titulo: es ? 'Tu contraseña cambió' : 'Your password changed',
    parrafos: es
      ? [`Hola ${nombre}: la contraseña de tu cuenta se cambió y se cerraron las sesiones abiertas.`]
      : [`Hi ${nombre}: your account password was changed and open sessions were signed out.`],
    boton: { texto: es ? 'Entrar a Pantalay' : 'Log in to Pantalay', url: `${DOMINIO}/login` },
    nota: es
      ? 'Si no fuiste tú, recupera tu cuenta de inmediato con «¿Olvidaste tu contraseña?».'
      : 'If it wasn’t you, recover your account right away with “Forgot your password?”.',
  });
  return { nombre, asunto: es ? 'Tu contraseña de Pantalay cambió' : 'Your Pantalay password changed', ...p };
}

const dolares = (centavos: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(centavos / 100);

const NOMBRE: Record<string, string> = { business: 'Business', business_ia: 'Business + AI' };

export function correoPlanActivo(idioma: Idioma, nombre: string, plan: string): Omit<Mensaje, 'para'> {
  const es = idioma === 'es';
  const n = NOMBRE[plan] ?? plan;
  const p = plantilla(idioma, {
    icono: '⭐',
    etiqueta: es ? 'PLAN ACTIVO' : 'PLAN ACTIVE',
    titulo: es ? `Tu plan ${n} está activo` : `Your ${n} plan is active`,
    parrafos: es
      ? [
          `Gracias, ${nombre}. Ya tienes todo lo de ${n}, con el precio de fundador fijo mientras tu plan siga activo.`,
        ]
      : [
          `Thank you, ${nombre}. You now have everything in ${n}, with founder pricing locked in while your plan stays active.`,
        ],
    boton: { texto: es ? 'Ir a Pantalay' : 'Go to Pantalay', url: `${DOMINIO}/library` },
  });
  return { nombre, asunto: es ? `Bienvenido a ${n}` : `Welcome to ${n}`, ...p };
}

export function correoPagoRecibido(
  idioma: Idioma,
  nombre: string,
  datos: { monto: number; factura?: string; pdf?: string; numero?: string },
): Omit<Mensaje, 'para'> {
  const es = idioma === 'es';
  const p = plantilla(idioma, {
    icono: '🧾',
    etiqueta: es ? 'FACTURA' : 'INVOICE',
    titulo: es
      ? `Recibimos tu pago de ${dolares(datos.monto)}`
      : `We received your ${dolares(datos.monto)} payment`,
    parrafos: es
      ? [`Gracias, ${nombre}. Aquí está tu factura.`]
      : [`Thank you, ${nombre}. Here is your invoice.`],
    detalle: [
      [es ? 'Total pagado' : 'Total paid', dolares(datos.monto)],
      [es ? 'Fecha' : 'Date', new Date().toLocaleDateString(es ? 'es-US' : 'en-US', { dateStyle: 'long' })],
      ...(datos.numero ? [[es ? 'Factura' : 'Invoice', datos.numero] as [string, string]] : []),
    ],
    boton: datos.factura
      ? { texto: es ? 'Ver mi factura' : 'View my invoice', url: datos.factura }
      : undefined,
    nota: datos.pdf
      ? es
        ? `Descárgala en PDF: ${datos.pdf}`
        : `Download it as PDF: ${datos.pdf}`
      : undefined,
  });
  return { nombre, asunto: es ? 'Tu factura de Pantalay' : 'Your Pantalay invoice', ...p };
}

export function correoPagoFallido(idioma: Idioma, nombre: string, factura?: string): Omit<Mensaje, 'para'> {
  const es = idioma === 'es';
  const p = plantilla(idioma, {
    icono: '⚠️',
    etiqueta: es ? 'PAGO' : 'PAYMENT',
    titulo: es ? 'No pudimos cobrar tu plan' : 'We couldn’t charge your plan',
    parrafos: es
      ? [
          `Hola ${nombre}: tu banco rechazó el último cobro. Lo volveremos a intentar en unos días.`,
          'Para no perder tu plan ni tu precio de fundador, paga la factura o cambia tu tarjeta.',
        ]
      : [
          `Hi ${nombre}: your bank declined the last charge. We’ll try again in a few days.`,
          'To keep your plan and your founder pricing, pay the invoice or update your card.',
        ],
    boton: factura ? { texto: es ? 'Pagar la factura' : 'Pay the invoice', url: factura } : undefined,
  });
  return { nombre, asunto: es ? 'Tu pago de Pantalay no pasó' : 'Your Pantalay payment failed', ...p };
}

export function correoPlanCancelado(idioma: Idioma, nombre: string): Omit<Mensaje, 'para'> {
  const es = idioma === 'es';
  const p = plantilla(idioma, {
    icono: '👋',
    etiqueta: es ? 'PLAN' : 'PLAN',
    titulo: es ? 'Tu plan terminó' : 'Your plan has ended',
    parrafos: es
      ? [`Hola ${nombre}: tu suscripción se canceló y tu cuenta pasó al plan gratis. Tus videos siguen ahí.`]
      : [
          `Hi ${nombre}: your subscription was canceled and your account moved to the free plan. Your videos are still there.`,
        ],
    boton: { texto: es ? 'Ver los planes' : 'See plans', url: `${DOMINIO}/pricing` },
  });
  return { nombre, asunto: es ? 'Tu plan de Pantalay terminó' : 'Your Pantalay plan has ended', ...p };
}
