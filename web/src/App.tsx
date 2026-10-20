import { Pagar } from './paginas/Pagar';
import { Precios } from './paginas/Precios';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ProveedorAviso } from './componentes/Aviso';
import { Encabezado, Pie } from './componentes/Marco';
import { pedir, type Usuario } from './logica/api';
import { borrarBorradoresDeCuenta } from './logica/borrador';
import { ContextoIdioma, TEXTOS, idiomaGuardado, useIdioma, type Idioma } from './logica/idioma';
import { alClicEnlace, useRuta } from './logica/ruta';
import { ContextoSesion } from './logica/sesion';
import { Biblioteca } from './paginas/Biblioteca';
import { Docs } from './paginas/Docs';
import { Editar } from './paginas/Editar';
import { Entrar } from './paginas/Entrar';
import { Grabar } from './paginas/Grabar';
import { Inicio } from './paginas/Inicio';
import { PaginaVideo } from './paginas/Video';

export function App() {
  const ruta = useRuta();
  const [idioma, setIdioma] = useState<Idioma>(idiomaGuardado);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    pedir<{ usuario: Usuario | null }>('/datos/yo')
      .then((r) => setUsuario(r.usuario))
      .catch(() => setUsuario(null))
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => {
    document.documentElement.lang = idioma;
  }, [idioma]);

  const cambiar = useCallback((i: Idioma) => {
    setIdioma(i);
    try {
      localStorage.setItem('pantalai:idioma', i);
    } catch {
      /* sin almacenamiento */
    }
  }, []);

  const salir = useCallback(async () => {
    if (usuario) borrarBorradoresDeCuenta(usuario.id);
    try {
      await pedir('/datos/salir', { method: 'POST' });
    } catch (e) {
      console.error('salir: el servidor no respondió, se sale igual', e);
    }
    // Carga completa: que nada de la sesión quede en pantalla.
    window.location.href = '/';
  }, [usuario]);

  const valorIdioma = useMemo(
    () => ({ idioma, cambiar, t: (c: keyof (typeof TEXTOS)['en']) => TEXTOS[idioma][c] }),
    [idioma, cambiar],
  );
  const valorSesion = useMemo(() => ({ usuario, cargando, setUsuario, salir }), [usuario, cargando, salir]);

  const partes = ruta.split('/').filter(Boolean);
  const embebido = partes[0] === 'embed';
  let pagina: React.ReactNode;
  if (embebido && partes[1]) pagina = <PaginaVideo id={partes[1]} embebido />;
  else if (partes[0] === 'v' && partes[1] && partes[2] === 'edit') pagina = <Editar id={partes[1]} />;
  else if (partes[0] === 'v' && partes[1]) pagina = <PaginaVideo id={partes[1]} />;
  else if (ruta === '/login' || ruta === '/signup') pagina = <Entrar registro={ruta === '/signup'} />;
  else if (ruta === '/library') pagina = <Biblioteca />;
  else if (ruta === '/record') pagina = <Grabar />;
  else if (partes[0] === 'docs') pagina = <Docs slug={partes[1] ?? ''} />;
  else if (ruta === '/pricing') pagina = <Precios />;
  else if (ruta === '/checkout' || ruta === '/checkout/done') pagina = <Pagar />;
  else if (ruta === '/') pagina = <Inicio />;
  else pagina = <NoEncontrado />;

  return (
    <ContextoIdioma.Provider value={valorIdioma}>
      <ContextoSesion.Provider value={valorSesion}>
        <ProveedorAviso>
          {embebido ? (
            pagina
          ) : (
            <div className="marco">
              <Encabezado />
              <main id="contenido">{pagina}</main>
              <Pie />
            </div>
          )}
        </ProveedorAviso>
      </ContextoSesion.Provider>
    </ContextoIdioma.Provider>
  );
}

function NoEncontrado() {
  const { t } = useIdioma();
  return (
    <section className="vacio pagina-angosta">
      <h1>404</h1>
      <p>{t('noEncontrado')}</p>
      <a className="boton" href="/" onClick={alClicEnlace}>
        {t('irInicio')}
      </a>
    </section>
  );
}
