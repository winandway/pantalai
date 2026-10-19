// CANDADO DE GASTO (regla global: modelos caros bloqueados en código).
// Solo estos modelos pueden llamarse. Nada más corre, ni como respaldo. Cambiar esta lista exige
// el sí de Richard con el costo escrito.
export const MODELOS_PERMITIDOS = {
  '@cf/openai/whisper-large-v3-turbo': { proveedor: 'cloudflare', usdPorMinuto: 0.000513 },
  'gemini-2.5-flash': { proveedor: 'google', usdEntradaMillon: 0.3, usdSalidaMillon: 2.5 },
  'gemini-2.5-flash-lite': { proveedor: 'google', usdEntradaMillon: 0.1, usdSalidaMillon: 0.4 },
} as const;

export type ModeloPermitido = keyof typeof MODELOS_PERMITIDOS;

export function asegurarModelo(modelo: string): asserts modelo is ModeloPermitido {
  if (!(modelo in MODELOS_PERMITIDOS)) throw new Error(`modelo bloqueado: ${modelo}`);
}

export function costoWhisper(segundos: number): number {
  return (segundos / 60) * MODELOS_PERMITIDOS['@cf/openai/whisper-large-v3-turbo'].usdPorMinuto;
}

export function costoGemini(
  modelo: 'gemini-2.5-flash' | 'gemini-2.5-flash-lite',
  entrada: number,
  salida: number,
): number {
  const m = MODELOS_PERMITIDOS[modelo];
  return (entrada / 1e6) * m.usdEntradaMillon + (salida / 1e6) * m.usdSalidaMillon;
}
