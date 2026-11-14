// Página del INVITADO remoto (/join/<código>): entra sin cuenta, desde computadora o celular (Safari de iPhone
// incluido), escribe su nombre, ve su cámara, y se conecta directo con el anfitrión que lo graba en su Estudio.
// CANDADO C-INVITADO.
import { useEffect, useRef, useState } from 'react';
import { AvisoBorrador } from '../componentes/AvisoBorrador';
import { ErrorApi, pedir } from '../logica/api';
import { llaveBorrador, useBorrador } from '../logica/borrador';
import { useIdioma } from '../logica/idioma';
import { LlamadaInvitado, VOZ, nuevoAsiento, type EstadoLlamada } from '../logica/llamada';
import { TEXTOS_INVITADO } from '../logica/textosInvitado';

type Sala = { anfitrion: string; vence: number; ocupada: boolean };

/** El asiento de este navegador para esta invitación: con él vuelve a entrar a su mismo puesto si recarga. */
function asientoDe(codigo: string): string {
  const llave = `pantalai:asiento:${codigo}`;
  try {
    const guardado = localStorage.getItem(llave);
    if (guardado && /^[a-f0-9]{32}$/.test(guardado)) return guardado;
    const nuevo = nuevoAsiento();
    localStorage.setItem(llave, nuevo);
    return nuevo;
  } catch {
    return nuevoAsiento();
  }
}

export function PaginaInvitado({ codigo }: { codigo: string }) {
  const { idioma } = useIdioma();
  const tx = TEXTOS_INVITADO[idioma];
  const b = useBorrador(llaveBorrador(`invitado-${codigo}`, null), { nombre: '' });
  const [sala, setSala] = useState<Sala | null>(null);
  const [problema, setProblema] = useState<'no_existe' | 'ocupada' | null>(null);
  const [local, setLocal] = useState<MediaStream | null>(null);
  const [sinCamara, setSinCamara] = useState(false);
  const [estado, setEstado] = useState<EstadoLlamada | null>(null);
  const [remoto, setRemoto] = useState<MediaStream | null>(null);
  const [mudo, setMudo] = useState(false);
  const [sinSonido, setSinSonido] = useState(false);
  const [rendido, setRendido] = useState(false);
  const llamada = useRef<LlamadaInvitado | null>(null);
  const asiento = useRef(asientoDe(codigo));
  const vistaPropia = useRef<HTMLVideoElement>(null);
  const vistaRemota = useRef<HTMLVideoElement>(null);

  // La invitación: quién invita y si sigue vigente (solo lee).
  useEffect(() => {
    pedir<Sala>(`/datos/invitado/${codigo}`, { headers: { 'x-asiento': asiento.current } })
      .then((s) => {
        setSala(s);
        if (s.ocupada) setProblema('ocupada');
      })
      .catch((e) => {
        console.error('invitado: invitación', e);
        setProblema('no_existe');
      });
  }, [codigo]);

  const encender = async () => {
    setSinCamara(false);
    try {
      const f = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: { ...VOZ },
      });
      setLocal(f);
    } catch (e) {
      console.error('invitado: sin cámara', e);
      setSinCamara(true);
    }
  };
  // La vista previa se enciende sola al abrir (si el navegador pide permiso, lo pide aquí).
  useEffect(() => {
    if (sala && !problema && !local) void encender();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sala, problema]);
  useEffect(() => () => local?.getTracks().forEach((p) => p.stop()), [local]);

  useEffect(() => {
    if (vistaPropia.current && local) {
      vistaPropia.current.srcObject = local;
      void vistaPropia.current.play().catch(() => undefined);
    }
  }, [local, estado]);
  useEffect(() => {
    const v = vistaRemota.current;
    if (!v) return;
    v.srcObject = remoto;
    if (remoto)
      // Safari puede pedir un toque para sonar: se ofrece el botón.
      void v.play().then(
        () => setSinSonido(false),
        () => setSinSonido(true),
      );
  }, [remoto]);

  // Al cerrar la pestaña se avisa al anfitrión por el canal directo.
  useEffect(() => {
    const irse = () => llamada.current?.salir();
    window.addEventListener('pagehide', irse);
    return () => {
      window.removeEventListener('pagehide', irse);
      llamada.current?.salir();
    };
  }, []);

  const entrar = () => {
    const nombre = b.valor.nombre.trim();
    if (!nombre || !local) return;
    setRendido(false);
    const l = new LlamadaInvitado(codigo, asiento.current, nombre, local, {
      estado: (e) => {
        setEstado(e);
        setRendido(l.rendida());
      },
      remoto: setRemoto,
    });
    llamada.current = l;
    void l.unir().catch((e) => {
      console.error('invitado: unir', e);
      if (e instanceof ErrorApi && e.estado === 404) setProblema('no_existe');
    });
  };

  const salir = () => {
    llamada.current?.salir();
    llamada.current = null;
  };

  const alternarMudo = () => {
    const nuevo = !mudo;
    local?.getAudioTracks().forEach((p) => (p.enabled = !nuevo));
    setMudo(nuevo);
  };

  if (problema || (estado && ['vencida', 'ocupada'].includes(estado)))
    return (
      <section className="pagina-angosta invitado" data-invitado>
        <h1>{tx.titulo}</h1>
        <p className="error" role="alert">
          {estado === 'ocupada' || problema === 'ocupada'
            ? tx.ocupadaAntes
            : estado === 'vencida'
              ? tx.invitado_.vencida
              : tx.noExiste}
        </p>
      </section>
    );
  if (!sala) return <section className="pagina-angosta invitado" data-invitado aria-busy="true" />;

  const enLlamada = estado !== null && estado !== 'salio';
  return (
    <section className={`invitado${enLlamada ? ' invitado-en-llamada' : ''}`} data-invitado>
      <header className="invitado-cabeza">
        <h1>{tx.titulo}</h1>
        <p>{tx.te(sala.anfitrion)}</p>
      </header>

      {enLlamada ? (
        <>
          <div className="invitado-escena">
            <div className="invitado-remoto">
              <video ref={vistaRemota} playsInline autoPlay data-video-anfitrion />
              {!remoto && <span className="invitado-espera">{sala.anfitrion}</span>}
              <span className="invitado-cartel">{sala.anfitrion}</span>
            </div>
            <div className="invitado-propio">
              <video ref={vistaPropia} playsInline autoPlay muted aria-hidden="true" />
            </div>
          </div>
          <p className={`invitado-estado estado-${estado}`} role="status" data-estado={estado}>
            {rendido ? tx.rendido : tx.invitado_[estado!]}
          </p>
          {sinSonido && remoto && (
            <button
              type="button"
              className="boton"
              onClick={() =>
                void vistaRemota.current
                  ?.play()
                  .then(() => setSinSonido(false))
                  .catch(() => undefined)
              }
            >
              🔊 {tx.tocarParaOir}
            </button>
          )}
          <div className="invitado-botones">
            <button type="button" className="boton secundario" onClick={alternarMudo} aria-pressed={mudo}>
              {mudo ? `🎤 ${tx.activar}` : `🔇 ${tx.silenciar}`}
            </button>
            {rendido ? (
              <button type="button" className="boton" onClick={entrar}>
                {tx.volver}
              </button>
            ) : (
              <button type="button" className="boton peligro" onClick={salir}>
                {tx.salir}
              </button>
            )}
          </div>
          <p className="ayuda">🎧 {tx.audifonos}</p>
        </>
      ) : (
        <form
          className="tarjeta invitado-formulario"
          onSubmit={(e) => {
            e.preventDefault();
            entrar();
          }}
        >
          {estado === 'salio' && (
            <p className="invitado-estado" role="status">
              {tx.invitado_.salio}
            </p>
          )}
          <p className="ayuda">{tx.sinCuenta}</p>
          <div className="invitado-previa">
            {local ? (
              <video ref={vistaPropia} playsInline autoPlay muted aria-label={tx.vistaPrevia} />
            ) : (
              <span className="invitado-espera">📷</span>
            )}
          </div>
          {sinCamara && (
            <p className="error" role="alert">
              {tx.sinCamara}{' '}
              <button type="button" className="enlace" onClick={() => void encender()}>
                {tx.camara}
              </button>
            </p>
          )}
          <div className="campo">
            <label htmlFor="invitado-nombre">{tx.tuNombre}</label>
            <input
              id="invitado-nombre"
              value={b.valor.nombre}
              maxLength={40}
              autoComplete="name"
              placeholder={tx.tuNombrePlaceholder}
              onChange={(e) => b.cambiar('nombre', e.target.value)}
            />
          </div>
          <AvisoBorrador b={b} />
          <p className="invitado-audifonos">🎧 {tx.audifonos}</p>
          <button type="submit" className="boton" disabled={!local || !b.valor.nombre.trim()}>
            {tx.entrar}
          </button>
        </form>
      )}
    </section>
  );
}
