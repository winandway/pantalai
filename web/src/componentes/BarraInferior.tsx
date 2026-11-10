// Barra de abajo en el celular (como YouTube y TikTok): Videos, Shorts, Grabar, Biblioteca (o Docs) y la cuenta.
// Solo se ve en pantallas angostas (CSS). No sale mientras se graba ni en el estudio. Candado C-MOVIL.
import { useIdioma } from '../logica/idioma';
import { sinPrefijo } from '../logica/rutasIdioma';
import { alClicEnlace, useRuta } from '../logica/ruta';
import { useSesion } from '../logica/sesion';
import { TEXTOS_RED } from '../logica/textosRed';

/** Rutas donde la barra estorba (grabar, estudio, editar, panel). */
export function sinBarraInferior(ruta: string): boolean {
  const r = sinPrefijo(ruta);
  return (
    r === '/record' ||
    r === '/studio' ||
    /^\/v\/[^/]+\/edit$/.test(r) ||
    r.startsWith('/panel/') ||
    r.startsWith('/embed/') ||
    r === '/checkout'
  );
}

const ICONOS: Record<string, React.ReactNode> = {
  videos: <path d="M4 6h16v12H4z M10 9l5 3-5 3z" />,
  shorts: (
    <path d="M8 3h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z M10.5 9.5l4 2.5-4 2.5z" />
  ),
  biblioteca: <path d="M4 5h6v14H4z M14 5h6v6h-6z M14 13h6v6h-6z" />,
  docs: <path d="M6 3h9l4 4v14H6z M14 3v5h5 M9 12h7 M9 16h7" />,
  cuenta: <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 21c0-4 4-6 8-6s8 2 8 6" />,
};

function Icono({ nombre }: { nombre: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      {ICONOS[nombre]}
    </svg>
  );
}

export function BarraInferior() {
  const { t, idioma, enlace } = useIdioma();
  const { usuario, cargando } = useSesion();
  const ruta = sinPrefijo(useRuta());
  if (sinBarraInferior(ruta) || cargando) return null;
  const tx = TEXTOS_RED[idioma];
  const items: { href: string; nombre: string; texto: string; activo: boolean }[] = [
    {
      href: enlace('/videos'),
      nombre: 'videos',
      texto: tx.videos,
      activo: ruta === '/videos' || /^\/videos\/(?!search)/.test(ruta) || ruta === '/videos/search',
    },
    { href: '/shorts', nombre: 'shorts', texto: tx.shorts, activo: ruta.startsWith('/shorts') },
    usuario
      ? { href: '/library', nombre: 'biblioteca', texto: t('biblioteca'), activo: ruta === '/library' }
      : { href: enlace('/docs'), nombre: 'docs', texto: t('docs'), activo: ruta.startsWith('/docs') },
    usuario
      ? { href: '/account', nombre: 'cuenta', texto: tx.tu, activo: ruta === '/account' }
      : {
          href: '/login',
          nombre: 'cuenta',
          texto: t('entrar'),
          activo: ruta === '/login' || ruta === '/signup',
        },
  ];
  const enlaceItem = (x: (typeof items)[number]) => (
    <a
      key={x.nombre}
      href={x.href}
      onClick={alClicEnlace}
      className={x.activo ? 'activo' : ''}
      aria-current={x.activo ? 'page' : undefined}
    >
      <Icono nombre={x.nombre} />
      <span>{x.texto}</span>
    </a>
  );
  return (
    <nav className="barra-inferior" aria-label={tx.navegacion}>
      {items.slice(0, 2).map(enlaceItem)}
      <a
        href={usuario ? '/record' : '/signup'}
        onClick={alClicEnlace}
        className="barra-grabar"
        aria-label={t('grabar')}
      >
        <span aria-hidden="true">+</span>
      </a>
      {items.slice(2).map(enlaceItem)}
    </nav>
  );
}
