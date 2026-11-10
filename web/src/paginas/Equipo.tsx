// Espacios de equipo (CANDADO C-EQUIPOS): la página del equipo, la página que abre la invitación, la ventanita para
// crear un equipo y la de «Compartir con un equipo» (de un video o de una carpeta entera, C-CARPETAS-EQUIPO), y la
// página de una carpeta compartida. Las acciones que quitan algo viven SOLO en el menú de tres puntos.
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useAviso } from '../componentes/Aviso';
import { MenuPuntos, type Opcion } from '../componentes/MenuPuntos';
import { Confirmar, Modal } from '../componentes/Modal';
import {
  ErrorApi,
  miniaturaVideo,
  pedir,
  type CarpetaEquipo,
  type DatosCarpetaEquipo,
  type DatosEquipo,
  type EquipoLista,
  type MiembroEquipo,
} from '../logica/api';
import { borrarBorradoresDeCuenta, llaveBorrador, useBorrador } from '../logica/borrador';
import { haceCuanto, textoError, useIdioma, type Traductor } from '../logica/idioma';
import { alClicEnlace, navegar } from '../logica/ruta';
import { useSesion } from '../logica/sesion';
import { formatoTiempo } from '../logica/tiempo';
import { copiar } from './Biblioteca';

const codigo = (e: unknown) => (e instanceof ErrorApi ? e.codigo : 'servidor');

type Pendiente =
  | { tipo: 'eliminar' }
  | { tipo: 'salir' }
  | { tipo: 'quitar'; miembro: MiembroEquipo }
  | { tipo: 'renombrar' }
  | { tipo: 'carpeta'; carpeta: CarpetaEquipo };

export function PaginaEquipo({ id }: { id: string }) {
  const { t, idioma } = useIdioma();
  const { usuario, cargando } = useSesion();
  const avisar = useAviso();
  const [datos, setDatos] = useState<DatosEquipo | null>(null);
  const [error, setError] = useState('');
  const [pendiente, setPendiente] = useState<Pendiente | null>(null);

  useEffect(() => {
    if (!cargando && !usuario) navegar(`/login?volver=${encodeURIComponent(`/team/${id}`)}`, true);
  }, [cargando, usuario, id]);

  const cargar = useCallback(async () => {
    if (!usuario) return;
    try {
      setDatos(await pedir<DatosEquipo>(`/datos/equipos/${id}`));
      setError('');
    } catch (e) {
      setError(codigo(e) === 'no_existe' ? t('noEncontrado') : textoError(t, codigo(e)));
    }
  }, [usuario, id, t]);

  useEffect(() => void cargar(), [cargar]);

  async function hacer(ruta: string, metodo: string, json?: unknown, despues?: () => void) {
    try {
      await pedir(ruta, { method: metodo, json });
      if (despues) despues();
      else void cargar();
    } catch (e) {
      avisar(textoError(t, codigo(e)));
    }
  }

  if (!usuario) return null;
  if (error && !datos)
    return (
      <section className="vacio pagina-angosta">
        <p className="error">{error}</p>
        <a className="boton" href="/library" onClick={alClicEnlace}>
          {t('biblioteca')}
        </a>
      </section>
    );
  if (!datos) return <p className="vacio">…</p>;
  const { equipo, miembros, invitaciones, videos } = datos;
  const carpetas = datos.carpetas ?? [];
  const admin = equipo.rol === 'admin';
  const opcionesEquipo: Opcion[] = [];
  if (admin)
    opcionesEquipo.push({
      etiqueta: t('renombrarEquipo'),
      accion: () => setPendiente({ tipo: 'renombrar' }),
    });
  if (equipo.es_dueno)
    opcionesEquipo.push({
      etiqueta: t('eliminarEquipo'),
      peligro: true,
      separador: true,
      accion: () => setPendiente({ tipo: 'eliminar' }),
    });
  else
    opcionesEquipo.push({
      etiqueta: t('salirEquipo'),
      peligro: true,
      separador: true,
      accion: () => setPendiente({ tipo: 'salir' }),
    });

  return (
    <div className="equipo-pagina">
      <a className="ayuda" href="/library" onClick={alClicEnlace}>
        ← {t('biblioteca')}
      </a>
      <div className="equipo-cabecera">
        <h1>👥 {equipo.nombre}</h1>
        <MenuPuntos opciones={opcionesEquipo} />
      </div>
      <div className="equipo-columnas">
        <section>
          <h2>
            {t('carpetasEquipo')} <span className="contador">{carpetas.length}</span>
          </h2>
          {carpetas.length === 0 && <p className="ayuda">{t('sinCarpetasEquipo')}</p>}
          <ul className="equipo-carpetas">
            {carpetas.map((k) => (
              <li key={k.id} className="tarjeta equipo-carpeta">
                <a href={`/team/${equipo.id}/folder/${k.id}`} onClick={alClicEnlace}>
                  <span className="equipo-carpeta-icono" aria-hidden="true">
                    📁
                  </span>
                  <span>
                    <strong>{k.nombre}</strong>
                    <span className="ayuda">
                      {t('carpetaDe')} {k.autor} · {k.videos}{' '}
                      {k.videos === 1 ? t('unVideo') : t('resumenVideos')}
                    </span>
                  </span>
                </a>
                {(admin || k.es_mia) && (
                  <MenuPuntos
                    opciones={[
                      {
                        etiqueta: t('dejarDeCompartirCarpeta'),
                        peligro: true,
                        accion: () => setPendiente({ tipo: 'carpeta', carpeta: k }),
                      },
                    ]}
                  />
                )}
              </li>
            ))}
          </ul>
          <h2>{t('videosEquipo')}</h2>
          {videos.length === 0 && <p className="vacio">{t('sinVideosEquipo')}</p>}
          <div className="rejilla">
            {videos.map((v) => (
              <TarjetaVideoEquipo
                key={v.id}
                v={v}
                pie={`${v.autor} · ${haceCuanto(v.compartido, idioma)}`}
                opciones={
                  admin || v.usuario_id === usuario.id
                    ? [
                        {
                          etiqueta: t('dejarDeCompartir'),
                          peligro: true,
                          accion: () => void hacer(`/datos/equipos/${equipo.id}/videos/${v.id}`, 'DELETE'),
                        },
                      ]
                    : []
                }
              />
            ))}
          </div>
        </section>

        <aside className="equipo-lateral">
          {admin && <Invitar equipo={equipo.id} cuenta={usuario.id} invitada={() => void cargar()} />}
          <h2>
            {t('miembros')} <span className="contador">{miembros.length}</span>
          </h2>
          <ul className="equipo-miembros">
            {miembros.map((m) => {
              const opciones: Opcion[] = [];
              if (equipo.es_dueno && !m.es_dueno)
                opciones.push({
                  etiqueta: m.rol === 'admin' ? t('dejarMiembro') : t('hacerAdmin'),
                  accion: () =>
                    void hacer(`/datos/equipos/${equipo.id}/miembros/${m.id}`, 'PATCH', {
                      rol: m.rol === 'admin' ? 'miembro' : 'admin',
                    }),
                });
              if (admin && !m.es_dueno && m.id !== usuario.id)
                opciones.push({
                  etiqueta: t('quitarDelEquipo'),
                  peligro: true,
                  separador: opciones.length > 0,
                  accion: () => setPendiente({ tipo: 'quitar', miembro: m }),
                });
              return (
                <li key={m.id}>
                  <span className="avatar" aria-hidden="true">
                    {(m.nombre[0] ?? '?').toUpperCase()}
                  </span>
                  <div className="equipo-persona">
                    <strong>{m.nombre}</strong>
                    <p className="ayuda">
                      {m.correo} ·{' '}
                      {m.es_dueno ? t('rolDueno') : m.rol === 'admin' ? t('rolAdmin') : t('rolMiembro')}
                    </p>
                  </div>
                  {opciones.length > 0 && <MenuPuntos opciones={opciones} />}
                </li>
              );
            })}
          </ul>
          {admin && invitaciones.length > 0 && (
            <>
              <h3>{t('invitacionesPendientes')}</h3>
              <ul className="equipo-miembros">
                {invitaciones.map((i) => (
                  <li key={i.correo}>
                    <span className="avatar gris" aria-hidden="true">
                      ✉
                    </span>
                    <div className="equipo-persona">
                      <strong>{i.correo}</strong>
                    </div>
                    <MenuPuntos
                      opciones={[
                        {
                          etiqueta: t('cancelarInvitacion'),
                          peligro: true,
                          accion: () =>
                            void hacer(`/datos/equipos/${equipo.id}/invitaciones`, 'DELETE', {
                              correo: i.correo,
                            }),
                        },
                      ]}
                    />
                  </li>
                ))}
              </ul>
            </>
          )}
        </aside>
      </div>

      {pendiente?.tipo === 'renombrar' && (
        <NombreEquipo
          titulo={t('renombrarEquipo')}
          inicial={equipo.nombre}
          llave={llaveBorrador(`equipo-nombre-${equipo.id}`, usuario.id)}
          cerrar={() => setPendiente(null)}
          guardar={async (nombre) => {
            await pedir(`/datos/equipos/${equipo.id}`, { method: 'PATCH', json: { nombre } });
            setPendiente(null);
            void cargar();
          }}
        />
      )}
      {pendiente?.tipo === 'eliminar' && (
        <Confirmar
          texto={t('confirmarEliminarEquipo')}
          etiquetaSi={t('eliminarEquipo')}
          etiquetaNo={t('cancelar')}
          no={() => setPendiente(null)}
          si={() => {
            setPendiente(null);
            void hacer(`/datos/equipos/${equipo.id}`, 'DELETE', undefined, () => navegar('/library'));
          }}
        />
      )}
      {pendiente?.tipo === 'salir' && (
        <Confirmar
          texto={t('confirmarSalirEquipo')}
          etiquetaSi={t('salirEquipo')}
          etiquetaNo={t('cancelar')}
          no={() => setPendiente(null)}
          si={() => {
            setPendiente(null);
            void hacer(`/datos/equipos/${equipo.id}/miembros/${usuario.id}`, 'DELETE', undefined, () =>
              navegar('/library'),
            );
          }}
        />
      )}
      {pendiente?.tipo === 'carpeta' && (
        <Confirmar
          texto={`📁 ${pendiente.carpeta.nombre}: ${t('dejarDeCompartirCarpeta')}?`}
          etiquetaSi={t('dejarDeCompartirCarpeta')}
          etiquetaNo={t('cancelar')}
          no={() => setPendiente(null)}
          si={() => {
            const k = pendiente.carpeta;
            setPendiente(null);
            void hacer(`/datos/equipos/${equipo.id}/carpetas/${k.id}`, 'DELETE');
          }}
        />
      )}
      {pendiente?.tipo === 'quitar' && (
        <Confirmar
          texto={`${pendiente.miembro.nombre}: ${t('confirmarQuitarMiembro')}`}
          etiquetaSi={t('quitarDelEquipo')}
          etiquetaNo={t('cancelar')}
          no={() => setPendiente(null)}
          si={() => {
            const m = pendiente.miembro;
            setPendiente(null);
            void hacer(`/datos/equipos/${equipo.id}/miembros/${m.id}`, 'DELETE');
          }}
        />
      )}
    </div>
  );
}

/** Tarjeta de un video que se ve en el equipo (suelto o dentro de una carpeta compartida). */
function TarjetaVideoEquipo({
  v,
  pie,
  opciones,
}: {
  v: { id: string; titulo: string; duracion: number; tiene_miniatura: number; privacidad: string };
  pie: string;
  opciones: Opcion[];
}) {
  const { t } = useIdioma();
  return (
    <article className="tarjeta-video">
      <a href={`/v/${v.id}`} onClick={alClicEnlace} className="tarjeta-video-imagen">
        {v.tiene_miniatura ? (
          <img src={miniaturaVideo(v.id)} alt="" loading="lazy" />
        ) : (
          <div className="sin-miniatura" />
        )}
        <span className="duracion">{formatoTiempo(v.duracion)}</span>
        {v.privacidad === 'privado' && <span className="etiqueta-privado">{t('privado')}</span>}
      </a>
      <div className="tarjeta-video-pie">
        <div>
          <a href={`/v/${v.id}`} onClick={alClicEnlace} className="tarjeta-video-titulo">
            {v.titulo}
          </a>
          <p className="ayuda">{pie}</p>
        </div>
        {opciones.length > 0 && <MenuPuntos opciones={opciones} />}
      </div>
    </article>
  );
}

/**
 * Una carpeta compartida con el equipo (C-CARPETAS-EQUIPO): marcada con el nombre del equipo y de quién es. Solo
 * mirar: los miembros no editan, mueven ni borran lo que no es suyo (el servidor tampoco lo deja).
 */
export function PaginaCarpetaEquipo({ equipo, carpeta }: { equipo: string; carpeta: string }) {
  const { t, idioma } = useIdioma();
  const { usuario, cargando } = useSesion();
  const [datos, setDatos] = useState<DatosCarpetaEquipo | null>(null);
  const [error, setError] = useState('');
  const ruta = `/team/${equipo}/folder/${carpeta}`;
  useEffect(() => {
    if (!cargando && !usuario) navegar(`/login?volver=${encodeURIComponent(ruta)}`, true);
  }, [cargando, usuario, ruta]);
  useEffect(() => {
    if (!usuario) return;
    pedir<DatosCarpetaEquipo>(`/datos/equipos/${equipo}/carpetas/${carpeta}`)
      .then((d) => {
        setDatos(d);
        setError('');
      })
      .catch((e: unknown) =>
        setError(codigo(e) === 'no_existe' ? t('noEncontrado') : textoError(t, codigo(e))),
      );
  }, [usuario, equipo, carpeta, t]);
  if (!usuario) return null;
  if (error)
    return (
      <section className="vacio pagina-angosta">
        <p className="error">{error}</p>
        <a className="boton" href="/library" onClick={alClicEnlace}>
          {t('biblioteca')}
        </a>
      </section>
    );
  if (!datos) return <p className="vacio">…</p>;
  return (
    <div className="equipo-pagina">
      <a className="ayuda" href={`/team/${datos.equipo.id}`} onClick={alClicEnlace}>
        ← 👥 {datos.equipo.nombre}
      </a>
      <div className="equipo-cabecera">
        <div>
          <p className="ayuda carpeta-compartida-marca">
            {t('carpetaCompartidaEn')} <strong>👥 {datos.equipo.nombre}</strong> · {t('carpetaDe')}{' '}
            <strong>{datos.carpeta.autor}</strong>
          </p>
          <h1>📁 {datos.carpeta.nombre}</h1>
        </div>
      </div>
      {!datos.carpeta.es_mia && <p className="ayuda">{t('soloLectura')}</p>}
      {datos.videos.length === 0 && <p className="vacio">{t('sinVideosCarpeta')}</p>}
      <div className="rejilla">
        {datos.videos.map((v) => (
          <TarjetaVideoEquipo
            key={v.id}
            v={v}
            pie={`${v.autor} · ${haceCuanto(v.creado, idioma)}`}
            opciones={[]}
          />
        ))}
      </div>
    </div>
  );
}

/** Formulario para invitar por correo. Guarda lo escrito (useBorrador) y deja el enlace a mano para copiarlo. */
function Invitar({ equipo, cuenta, invitada }: { equipo: string; cuenta: string; invitada: () => void }) {
  const { t } = useIdioma();
  const avisar = useAviso();
  const b = useBorrador(llaveBorrador(`invitar-equipo-${equipo}`, cuenta), { correo: '' });
  const [enlace, setEnlace] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  async function enviar(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    try {
      const r = await pedir<{ enlace: string }>(`/datos/equipos/${equipo}/invitar`, {
        method: 'POST',
        json: { correo: b.valor.correo },
      });
      // Solo se vacía con la confirmación del servidor: si falla, lo escrito se queda en pantalla.
      b.empezarDeNuevo();
      setEnlace(r.enlace);
      setError('');
      invitada();
    } catch (err) {
      setError(textoError(t, codigo(err)));
    } finally {
      setEnviando(false);
    }
  }
  return (
    <form className="tarjeta equipo-invitar" onSubmit={enviar}>
      <h2>{t('invitarGente')}</h2>
      {b.recuperado && (
        <p className="recuperado">
          {t('recuperado')}{' '}
          <button type="button" className="enlace" onClick={b.empezarDeNuevo}>
            {t('empezarDeNuevo')}
          </button>
        </p>
      )}
      <div className="campo">
        <label htmlFor="correo-invitado">{t('correoInvitado')}</label>
        <input
          id="correo-invitado"
          type="email"
          placeholder="correo@ejemplo.com"
          value={b.valor.correo}
          onChange={(e) => b.cambiar('correo', e.target.value)}
          maxLength={200}
          required
        />
      </div>
      {error && <p className="error">{error}</p>}
      <button className="boton ancho" disabled={enviando}>
        {t('enviarInvitacion')}
      </button>
      {enlace && (
        <div className="equipo-enlace" role="status">
          <p className="ayuda">{t('invitacionEnviada')}</p>
          <input
            readOnly
            value={enlace}
            aria-label={t('copiarInvitacion')}
            onFocus={(e) => e.target.select()}
          />
          <button
            type="button"
            className="boton secundario ancho"
            onClick={() => void copiar(enlace).then((ok) => ok && avisar(t('enlaceCopiado')))}
          >
            {t('copiarInvitacion')}
          </button>
        </div>
      )}
    </form>
  );
}

/** Ventanita para el nombre del equipo (crear o renombrar). Nunca el cuadro del navegador. */
function NombreEquipo({
  titulo,
  inicial,
  llave,
  cerrar,
  guardar,
}: {
  titulo: string;
  inicial: string;
  /** Llave del borrador: lo escrito se guarda solo y vuelve si se cierra la ventana. */
  llave: string;
  cerrar: () => void;
  guardar: (nombre: string) => Promise<void>;
}) {
  const { t } = useIdioma();
  const b = useBorrador(llave, { nombre: inicial });
  const [error, setError] = useState('');
  const nombre = b.valor.nombre;
  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) return;
    try {
      await guardar(nombre.trim());
      b.limpiar();
    } catch (err) {
      setError(textoError(t, codigo(err)));
    }
  }
  return (
    <Modal titulo={titulo} cerrar={cerrar} ancho={420}>
      <form onSubmit={enviar}>
        {b.recuperado && (
          <p className="recuperado">
            {t('recuperado')}{' '}
            <button type="button" className="enlace" onClick={b.empezarDeNuevo}>
              {t('empezarDeNuevo')}
            </button>
          </p>
        )}
        <div className="campo">
          <label htmlFor="nombre-equipo">{t('nombreEquipo')}</label>
          <input
            id="nombre-equipo"
            value={nombre}
            onChange={(e) => b.cambiar('nombre', e.target.value)}
            maxLength={80}
            required
            autoFocus
          />
        </div>
        {error && <p className="error">{error}</p>}
        <div className="fila-botones">
          <button type="button" className="boton secundario" onClick={cerrar}>
            {t('cancelar')}
          </button>
          <button className="boton">{inicial ? t('guardar') : t('crearEquipo')}</button>
        </div>
      </form>
    </Modal>
  );
}

export function NuevoEquipo({ cuenta, cerrar }: { cuenta: string; cerrar: () => void }) {
  const { t } = useIdioma();
  return (
    <NombreEquipo
      titulo={t('nuevoEquipo')}
      inicial=""
      llave={llaveBorrador('equipo', cuenta)}
      cerrar={cerrar}
      guardar={async (nombre) => {
        const r = await pedir<{ equipo: EquipoLista }>('/datos/equipos', {
          method: 'POST',
          json: { nombre },
        });
        navegar(`/team/${r.equipo.id}`);
      }}
    />
  );
}

/**
 * «Compartir con un equipo»: los equipos de la cuenta con su casilla. Cada casilla comparte o deja de compartir un
 * video, o una carpeta entera (C-CARPETAS-EQUIPO: sus videos de hoy y los que se agreguen después).
 */
export function CompartirConEquipo({
  video,
  carpeta,
  cerrar,
}: {
  video?: string;
  carpeta?: string;
  cerrar: () => void;
}) {
  const { t } = useIdioma();
  const avisar = useAviso();
  const [equipos, setEquipos] = useState<{ id: string; nombre: string; compartido: boolean }[] | null>(null);
  const [error, setError] = useState('');
  const origen = carpeta ? `/datos/carpetas/${carpeta}/equipos` : `/datos/videos/${video ?? ''}/equipos`;
  useEffect(() => {
    pedir<{ equipos: { id: string; nombre: string; compartido: boolean }[] }>(origen)
      .then((r) => setEquipos(r.equipos))
      .catch((e: unknown) => setError(textoError(t, codigo(e))));
  }, [origen, t]);
  // La casilla cambia al instante; si el servidor no lo guarda, vuelve como estaba y se dice por qué.
  const marcar = (id: string, compartido: boolean) =>
    setEquipos((l) => l?.map((e) => (e.id === id ? { ...e, compartido } : e)) ?? null);
  async function cambiar(id: string, compartir: boolean) {
    marcar(id, compartir);
    try {
      if (carpeta) {
        if (compartir)
          await pedir(`/datos/equipos/${id}/carpetas`, { method: 'POST', json: { carpeta_id: carpeta } });
        else await pedir(`/datos/equipos/${id}/carpetas/${carpeta}`, { method: 'DELETE' });
      } else if (compartir)
        await pedir(`/datos/equipos/${id}/videos`, { method: 'POST', json: { video_id: video } });
      else await pedir(`/datos/equipos/${id}/videos/${video ?? ''}`, { method: 'DELETE' });
      avisar(t('guardado'));
    } catch (e) {
      marcar(id, !compartir);
      avisar(textoError(t, codigo(e)));
    }
  }
  return (
    <Modal
      titulo={carpeta ? t('compartirCarpetaConEquipo') : t('compartirConEquipo')}
      cerrar={cerrar}
      ancho={420}
    >
      {error && <p className="error">{error}</p>}
      {equipos && equipos.length === 0 && <p className="ayuda">{t('sinEquipos')}</p>}
      {equipos && equipos.length > 0 && (
        <>
          <p className="ayuda">{carpeta ? t('compartirCarpetaAyuda') : t('compartirConEquipoAyuda')}</p>
          <div className="lista-casillas">
            {equipos.map((e) => (
              <label key={e.id}>
                <input
                  type="checkbox"
                  checked={e.compartido}
                  onChange={(ev) => void cambiar(e.id, ev.target.checked)}
                />{' '}
                👥 {e.nombre}
              </label>
            ))}
          </div>
        </>
      )}
      <div className="fila-botones">
        <button type="button" className="boton" onClick={cerrar}>
          {t('cerrar')}
        </button>
      </div>
    </Modal>
  );
}

/** Página que abre el enlace de la invitación: une y lleva al equipo. Sin sesión, manda a entrar y vuelve. */
export function UnirseEquipo() {
  const { t } = useIdioma();
  const { usuario, cargando } = useSesion();
  const [error, setError] = useState('');
  const hecho = useRef(false);
  useEffect(() => {
    if (cargando || hecho.current) return;
    hecho.current = true;
    const volver = `/join${location.search}`;
    if (!usuario) {
      navegar(`/signup?volver=${encodeURIComponent(volver)}`, true);
      return;
    }
    const token = new URLSearchParams(location.search).get('token') ?? '';
    pedir<{ equipo_id: string }>('/datos/equipos/unirse', { method: 'POST', json: { token } })
      .then((r) => navegar(`/team/${r.equipo_id}`, true))
      .catch((e: unknown) => setError(textoError(t, codigo(e))));
  }, [cargando, usuario, t]);
  return (
    <section className="vacio pagina-angosta">
      {error ? <UnirseError error={error} t={t} cuenta={usuario?.id ?? ''} /> : <p>{t('uniendoEquipo')}</p>}
    </section>
  );
}

function UnirseError({ error, t, cuenta }: { error: string; t: Traductor; cuenta: string }) {
  // Cierra la sesión y vuelve a entrar con la cuenta del correo invitado, sin perder la invitación.
  async function otraCuenta() {
    if (cuenta) borrarBorradoresDeCuenta(cuenta);
    try {
      await pedir('/datos/salir', { method: 'POST' });
    } catch (e) {
      console.error('salir: el servidor no respondió, se sale igual', e);
    }
    window.location.href = `/login?volver=${encodeURIComponent(`/join${location.search}`)}`;
  }
  return (
    <>
      <p className="error">{error}</p>
      <div className="fila-botones">
        <a className="boton secundario" href="/library" onClick={alClicEnlace}>
          {t('biblioteca')}
        </a>
        <button type="button" className="boton" onClick={() => void otraCuenta()}>
          {t('cambiarCuenta')}
        </button>
      </div>
    </>
  );
}
