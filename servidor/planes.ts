// Planes de Pantalay (aprobados por Richard el 20 oct 2026, ver docs/PLANES-Y-PRECIOS.md).
// Los límites solo se aplican con la variable COBRO_ACTIVO=1: sin pasarela de pago probada nadie queda
// bloqueado sin poder subir de plan. Mientras está apagado, todos tienen todo (como hasta hoy).

export type Plan = 'starter' | 'business' | 'business_ia' | 'enterprise';

export type Limites = {
  /** Videos que puede tener la cuenta (null = sin límite). */
  videos: number | null;
  /** Minutos por grabación (null = sin límite). */
  minutos: number | null;
  calidad: '720' | '1080' | '2160';
  /** Título, resumen, capítulos, muletillas y documentos con IA. */
  ia: boolean;
  lapices: boolean;
  /** «Hecho con Pantalay» en la página del video y en el reproductor insertado. */
  marca: boolean;
};

export const LIMITES: Record<Plan, Limites> = {
  starter: { videos: 25, minutos: 5, calidad: '720', ia: false, lapices: false, marca: true },
  business: { videos: null, minutos: null, calidad: '2160', ia: false, lapices: true, marca: false },
  business_ia: { videos: null, minutos: null, calidad: '2160', ia: true, lapices: true, marca: false },
  enterprise: { videos: null, minutos: null, calidad: '2160', ia: true, lapices: true, marca: false },
};

/** Precios en centavos de dólar por usuario al mes. «fundador» = 50 % de por vida. */
export const PRECIOS = {
  business: { mensual: 1800, anual: 1500, fundadorMensual: 900, fundadorAnual: 750 },
  business_ia: { mensual: 2400, anual: 2000, fundadorMensual: 1200, fundadorAnual: 1000 },
} as const;

export function cobroActivo(env: { COBRO_ACTIVO?: string }): boolean {
  return env.COBRO_ACTIVO === '1';
}

/** Lo que de verdad aplica a una cuenta: con el cobro apagado, nada limita. */
export function limitesDe(plan: Plan, activo: boolean): Limites {
  return activo ? LIMITES[plan] : LIMITES.enterprise;
}

export function esPlan(p: unknown): p is Plan {
  return typeof p === 'string' && p in LIMITES;
}
