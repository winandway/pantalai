// Máscaras del Estudio (CANDADO C-MASCARAS, fase 3): lo puro. Tres estilos de base (podcast, noticiero, minimal) y las
// máscaras que cada cuenta guarda con su nombre de programa, su logo y sus colores. El escenario las pinta con
// variables de CSS, así lo que se ve es lo que se graba (la grabación es la propia pestaña recortada al escenario).

export type EstiloMascara = 'podcast' | 'noticiero' | 'minimal';
export const ESTILOS: EstiloMascara[] = ['podcast', 'noticiero', 'minimal'];

export type Colores = { principal: string; secundario: string; fondo: string };

/** Colores de cada estilo de base. El podcast es el neón de siempre (el escenario no cambia si no se elige otra). */
export const PLANTILLAS: Record<EstiloMascara, Colores> = {
  podcast: { principal: '#ff3ea5', secundario: '#22d3ee', fondo: '#0b0a1a' },
  noticiero: { principal: '#d7263d', secundario: '#1d4ed8', fondo: '#0d1b2a' },
  minimal: { principal: '#f8fafc', secundario: '#94a3b8', fondo: '#111111' },
};

export type MascaraGuardada = Colores & {
  id: string;
  nombre: string;
  estilo: EstiloMascara;
  programa: string;
  anfitrion: string;
  rol: string;
  logo: string | null;
  actualizado: number;
};

/** Lo que el escenario necesita para pintarse. */
export type MascaraVista = Colores & {
  estilo: EstiloMascara;
  programa: string;
  anfitrion: string;
  rol: string;
  logo: string | null;
  /** false = el podcast de siempre, sin tocar nada del escenario. */
  propia: boolean;
};

/** La elección se guarda como «plantilla:podcast» o el id de una máscara guardada. */
export const ELECCION_DEFECTO = 'plantilla:podcast';

export function esEstilo(x: unknown): x is EstiloMascara {
  return typeof x === 'string' && (ESTILOS as string[]).includes(x);
}

export function colorValido(c: unknown): c is string {
  return typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c);
}

/** El color tal cual o el de respaldo si llega roto (de un borrador viejo, por ejemplo). */
export function colorO(c: unknown, respaldo: string): string {
  return colorValido(c) ? c.toLowerCase() : respaldo;
}

/** La máscara de una plantilla, sin textos propios. */
export function vistaDePlantilla(estilo: EstiloMascara): MascaraVista {
  return {
    ...PLANTILLAS[estilo],
    estilo,
    programa: '',
    anfitrion: '',
    rol: '',
    logo: null,
    propia: estilo !== 'podcast',
  };
}

/** La máscara que toca según la elección guardada; si la elegida ya no existe, el podcast de siempre. */
export function vistaElegida(eleccion: string, guardadas: MascaraGuardada[]): MascaraVista {
  if (eleccion.startsWith('plantilla:')) {
    const e = eleccion.slice('plantilla:'.length);
    return vistaDePlantilla(esEstilo(e) ? e : 'podcast');
  }
  const m = guardadas.find((x) => x.id === eleccion);
  if (!m) return vistaDePlantilla('podcast');
  return { ...vistaDeDatos(m), logo: m.logo };
}

/** Una máscara a partir de lo que tiene el formulario (vista previa mientras se edita). */
export function vistaDeDatos(d: {
  estilo: unknown;
  programa?: unknown;
  anfitrion?: unknown;
  rol?: unknown;
  principal: unknown;
  secundario: unknown;
  fondo: unknown;
  logo?: string | null;
}): MascaraVista {
  const estilo = esEstilo(d.estilo) ? d.estilo : 'podcast';
  const base = PLANTILLAS[estilo];
  const texto = (x: unknown, n: number) => (typeof x === 'string' ? x.trim().slice(0, n) : '');
  return {
    estilo,
    principal: colorO(d.principal, base.principal),
    secundario: colorO(d.secundario, base.secundario),
    fondo: colorO(d.fondo, base.fondo),
    programa: texto(d.programa, 40),
    anfitrion: texto(d.anfitrion, 24),
    rol: texto(d.rol, 20),
    logo: d.logo ?? null,
    propia: true,
  };
}

function rgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Luminancia relativa (WCAG) de un color #rrggbb. */
export function luminancia(hex: string): number {
  const [r, g, b] = rgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contraste WCAG entre dos colores (1 a 21). */
export function contraste(a: string, b: string): number {
  const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p) as [number, number];
  return (x + 0.05) / (y + 0.05);
}

/** Letras claras u oscuras, las que se lean mejor encima de ese color. */
export function letraSobre(fondo: string): string {
  return contraste(fondo, '#ffffff') >= contraste(fondo, '#111827') ? '#ffffff' : '#111827';
}

/** ¿Se pierde el color principal contra el fondo? (Se avisa con amabilidad; no se impide.) */
export function pocoContraste(c: Colores): boolean {
  return contraste(c.principal, c.fondo) < 1.6;
}

/** Variables de CSS del escenario. El podcast de siempre no lleva ninguna (queda exactamente igual que antes). */
export function variablesEscenario(m: MascaraVista): Record<string, string> {
  if (!m.propia) return {};
  return {
    '--neon-a': m.principal,
    '--neon-b': m.secundario,
    '--fondo-mascara': m.fondo,
    '--texto': letraSobre(m.fondo),
    '--sobre-a': letraSobre(m.principal),
    '--sobre-b': letraSobre(m.secundario),
  };
}

/** Clases extra del escenario para la máscara. */
export function claseMascara(m: MascaraVista): string {
  return m.propia ? ` mascara-propia estilo-${m.estilo}` : '';
}

/** Lo que se manda al servidor al guardar (los textos ya recortados). */
export function datosParaGuardar(d: {
  nombre: string;
  estilo: unknown;
  programa: string;
  anfitrion: string;
  rol: string;
  principal: unknown;
  secundario: unknown;
  fondo: unknown;
}) {
  const v = vistaDeDatos(d);
  return {
    nombre: d.nombre.trim().slice(0, 40),
    estilo: v.estilo,
    programa: v.programa,
    anfitrion: v.anfitrion,
    rol: v.rol,
    principal: v.principal,
    secundario: v.secundario,
    fondo: v.fondo,
  };
}
