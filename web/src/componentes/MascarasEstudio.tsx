// Máscaras del Estudio (CANDADO C-MASCARAS, fase 3): elegir entre el podcast, el noticiero, el minimalista y las
// máscaras guardadas de la cuenta; crear y editar una con nombre del programa, logo y colores. El formulario guarda lo
// escrito mientras se escribe (borrador) y el escenario muestra la vista previa tal como se va a grabar.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AvisoBorrador } from './AvisoBorrador';
import { ErrorApi, pedir } from '../logica/api';
import { llaveBorrador, useBorrador } from '../logica/borrador';
import { textoError, useIdioma } from '../logica/idioma';
import { aDataUrl, deDataUrl } from '../logica/imagen';
import {
  ESTILOS,
  PLANTILLAS,
  datosParaGuardar,
  esEstilo,
  pocoContraste,
  vistaDeDatos,
  vistaElegida,
  type EstiloMascara,
  type MascaraGuardada,
  type MascaraVista,
} from '../logica/mascaras';
import { TEXTOS_ESTUDIO } from '../logica/textosEstudio';
import { useAviso } from './Aviso';
import { MenuPuntos } from './MenuPuntos';
import { Confirmar } from './Modal';
import { SubirImagen } from './SubirImagen';

const FORMULARIO = {
  /** '' = no se está editando; 'nueva' = una máscara nueva; si no, el id de la que se edita. */
  editando: '',
  nombre: '',
  estilo: 'podcast' as EstiloMascara,
  programa: '',
  anfitrion: '',
  rol: '',
  principal: PLANTILLAS.podcast.principal,
  secundario: PLANTILLAS.podcast.secundario,
  fondo: PLANTILLAS.podcast.fondo,
  /** Logo nuevo elegido y todavía sin guardar («data:…»), o «quitar». */
  logoNuevo: '',
};

export function MascarasEstudio({
  usuarioId,
  eleccion,
  elegir,
  deshabilitado,
  alCambiarVista,
}: {
  usuarioId: string;
  eleccion: string;
  elegir: (e: string) => void;
  deshabilitado: boolean;
  alCambiarVista: (v: MascaraVista) => void;
}) {
  const { idioma, t } = useIdioma();
  const tx = TEXTOS_ESTUDIO[idioma];
  const avisar = useAviso();
  const [guardadas, setGuardadas] = useState<MascaraGuardada[]>([]);
  const [maximo, setMaximo] = useState(12);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [borrar, setBorrar] = useState<MascaraGuardada | null>(null);
  const f = useBorrador(llaveBorrador('estudio-mascara', usuarioId), FORMULARIO);
  const editando = typeof f.valor.editando === 'string' ? f.valor.editando : '';

  const cargar = useCallback(async () => {
    try {
      const r = await pedir<{ mascaras: MascaraGuardada[]; maximo: number }>('/datos/estudio/mascaras');
      setGuardadas(r.mascaras);
      setMaximo(r.maximo);
    } catch (e) {
      console.error('estudio: no se pudieron leer las máscaras', e);
    }
  }, []);
  useEffect(() => void cargar(), [cargar]);

  const enEdicion = editando ? guardadas.find((m) => m.id === editando) : undefined;
  const logoVista =
    f.valor.logoNuevo === 'quitar' ? null : f.valor.logoNuevo ? f.valor.logoNuevo : (enEdicion?.logo ?? null);
  const vista = useMemo(
    () => (editando ? vistaDeDatos({ ...f.valor, logo: logoVista }) : vistaElegida(eleccion, guardadas)),
    [editando, f.valor, logoVista, eleccion, guardadas],
  );
  useEffect(() => alCambiarVista(vista), [vista, alCambiarVista]);

  function abrirEditor(base: MascaraGuardada | null, estilo?: EstiloMascara) {
    setError(null);
    if (base) {
      f.setValor({ ...FORMULARIO, ...base, editando: base.id, logoNuevo: '' });
      return;
    }
    const e = estilo ?? 'podcast';
    f.setValor({ ...FORMULARIO, ...PLANTILLAS[e], estilo: e, editando: 'nueva', nombre: tx.plantillas[e] });
  }

  async function guardar() {
    setError(null);
    if (!f.valor.nombre.trim()) return setError(tx.nombreMascara);
    setGuardando(true);
    try {
      const datos = datosParaGuardar(f.valor);
      const r =
        editando === 'nueva'
          ? await pedir<{ mascara: MascaraGuardada }>('/datos/estudio/mascaras', {
              method: 'POST',
              json: datos,
            })
          : await pedir<{ mascara: MascaraGuardada }>(`/datos/estudio/mascaras/${editando}`, {
              method: 'PUT',
              json: datos,
            });
      let m = r.mascara;
      // El logo va después: si falla, la máscara ya quedó guardada y el logo sigue en el formulario para reintentar.
      if (f.valor.logoNuevo === 'quitar')
        m = (
          await pedir<{ mascara: MascaraGuardada }>(`/datos/estudio/mascaras/${m.id}/logo`, {
            method: 'DELETE',
          })
        ).mascara;
      else if (f.valor.logoNuevo.startsWith('data:')) {
        const logo = await deDataUrl(f.valor.logoNuevo);
        m = (
          await pedir<{ mascara: MascaraGuardada }>(`/datos/estudio/mascaras/${m.id}/logo`, {
            method: 'PUT',
            body: logo,
            headers: { 'content-type': logo.type },
          })
        ).mascara;
      }
      setGuardadas((l) => [...l.filter((x) => x.id !== m.id), m]);
      elegir(m.id);
      f.empezarDeNuevo();
      avisar(tx.mascaraGuardada);
    } catch (e) {
      const codigo = e instanceof ErrorApi ? e.codigo : 'servidor';
      setError(codigo === 'demasiadas_mascaras' ? tx.maximoMascaras : textoError(t, codigo));
      // Si la máscara nueva se alcanzó a guardar (falló solo el logo), lo que sigue es editarla, no otra nueva.
      await cargar();
    } finally {
      setGuardando(false);
    }
  }

  async function confirmarBorrar(m: MascaraGuardada) {
    setBorrar(null);
    try {
      await pedir(`/datos/estudio/mascaras/${m.id}`, { method: 'DELETE' });
      setGuardadas((l) => l.filter((x) => x.id !== m.id));
      if (eleccion === m.id) elegir('plantilla:podcast');
      if (editando === m.id) f.empezarDeNuevo();
      avisar(tx.mascaraBorrada);
    } catch (e) {
      setError(textoError(t, e instanceof ErrorApi ? e.codigo : 'servidor'));
    }
  }

  const contrasteBajo = editando && pocoContraste(vistaDeDatos(f.valor));

  return (
    <section className="estudio-mascaras" aria-labelledby="estudio-mascaras-titulo" data-mascaras>
      <h2 id="estudio-mascaras-titulo">🎭 {tx.mascara}</h2>
      <p className="estudio-ayuda">{tx.mascaraAyuda}</p>
      <div className="mascaras-lista" role="radiogroup" aria-label={tx.mascara}>
        {ESTILOS.map((e) => (
          <label key={e} className={`mascara-opcion${eleccion === `plantilla:${e}` ? ' activo' : ''}`}>
            <input
              type="radio"
              name="estudio-mascara"
              checked={eleccion === `plantilla:${e}`}
              disabled={deshabilitado || Boolean(editando)}
              onChange={() => elegir(`plantilla:${e}`)}
            />
            <Muestra colores={PLANTILLAS[e]} />
            {tx.plantillas[e]}
          </label>
        ))}
        {guardadas.map((m) => (
          <div key={m.id} className={`mascara-opcion guardada${eleccion === m.id ? ' activo' : ''}`}>
            <label>
              <input
                type="radio"
                name="estudio-mascara"
                checked={eleccion === m.id}
                disabled={deshabilitado || Boolean(editando)}
                onChange={() => elegir(m.id)}
              />
              {m.logo ? <img className="mascara-logo-mini" src={m.logo} alt="" /> : <Muestra colores={m} />}
              {m.nombre}
            </label>
            {!deshabilitado && !editando && (
              <MenuPuntos
                opciones={[
                  { etiqueta: `✏️ ${tx.editarMascara}`, accion: () => abrirEditor(m) },
                  {
                    etiqueta: `🗑️ ${tx.borrarMascara}`,
                    accion: () => setBorrar(m),
                    peligro: true,
                    separador: true,
                  },
                ]}
              />
            )}
          </div>
        ))}
        {!editando && !deshabilitado && (
          <button
            type="button"
            className="boton secundario"
            disabled={guardadas.length >= maximo}
            title={guardadas.length >= maximo ? tx.maximoMascaras : undefined}
            onClick={() => {
              const actual = guardadas.find((m) => m.id === eleccion);
              if (actual) return abrirEditor(actual);
              const e = eleccion.slice('plantilla:'.length);
              abrirEditor(null, esEstilo(e) ? e : 'podcast');
            }}
          >
            🎨 {guardadas.some((m) => m.id === eleccion) ? tx.editarMascara : tx.personalizar}
          </button>
        )}
      </div>

      {editando && <AvisoBorrador b={f} />}

      {editando && (
        <form
          className="mascara-editor"
          data-editor-mascara
          onSubmit={(e) => {
            e.preventDefault();
            void guardar();
          }}
        >
          <p className="estudio-ayuda">{tx.vistaPrevia}</p>
          <div className="mascara-campos">
            <div className="campo">
              <label htmlFor="mascara-nombre">{tx.nombreMascara}</label>
              <input
                id="mascara-nombre"
                value={f.valor.nombre}
                maxLength={40}
                required
                placeholder={tx.nombreMascaraPlaceholder}
                onChange={(e) => f.cambiar('nombre', e.target.value)}
              />
            </div>
            <div className="campo">
              <label htmlFor="mascara-estilo">{tx.estilo}</label>
              <select
                id="mascara-estilo"
                value={f.valor.estilo}
                onChange={(e) => {
                  const est = e.target.value as EstiloMascara;
                  // Al cambiar de estilo se proponen sus colores; después se pueden cambiar.
                  f.setValor((v) => ({ ...v, estilo: est, ...PLANTILLAS[est] }));
                }}
              >
                {ESTILOS.map((e) => (
                  <option key={e} value={e}>
                    {tx.plantillas[e]}
                  </option>
                ))}
              </select>
            </div>
            <div className="campo">
              <label htmlFor="mascara-programa">{tx.programaMascara}</label>
              <input
                id="mascara-programa"
                value={f.valor.programa}
                maxLength={40}
                onChange={(e) => f.cambiar('programa', e.target.value)}
              />
            </div>
            <div className="campo">
              <label htmlFor="mascara-anfitrion">{tx.nombreCartel}</label>
              <input
                id="mascara-anfitrion"
                value={f.valor.anfitrion}
                maxLength={24}
                onChange={(e) => f.cambiar('anfitrion', e.target.value)}
              />
            </div>
            <div className="campo">
              <label htmlFor="mascara-rol">{tx.rolCartel}</label>
              <input
                id="mascara-rol"
                value={f.valor.rol}
                maxLength={20}
                placeholder={tx.rolPlaceholder}
                onChange={(e) => f.cambiar('rol', e.target.value)}
              />
            </div>
          </div>
          <div className="mascara-colores">
            {(
              [
                ['principal', tx.colorPrincipal],
                ['secundario', tx.colorSecundario],
                ['fondo', tx.colorFondo],
              ] as const
            ).map(([campo, etiqueta]) => (
              <label key={campo} className="mascara-color">
                <input
                  type="color"
                  value={vistaDeDatos(f.valor)[campo]}
                  aria-label={etiqueta}
                  data-color={campo}
                  onChange={(e) => f.cambiar(campo, e.target.value)}
                />
                <span>{etiqueta}</span>
              </label>
            ))}
          </div>
          {contrasteBajo && <p className="estudio-aviso">{tx.pocoContraste}</p>}
          <div className="mascara-logo">
            <span className="mascara-logo-titulo">{tx.logo}</span>
            {logoVista && <img className="mascara-logo-vista" src={logoVista} alt={tx.logo} />}
            <SubirImagen
              nombre="logo-mascara"
              alElegir={(img) => void aDataUrl(img).then((d) => f.cambiar('logoNuevo', d))}
            />
            {logoVista && (
              <button type="button" className="enlace" onClick={() => f.cambiar('logoNuevo', 'quitar')}>
                {tx.quitarLogo}
              </button>
            )}
            <p className="estudio-ayuda">{tx.logoAyuda}</p>
          </div>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="fila-botones">
            <button type="submit" className="boton" disabled={guardando}>
              {guardando ? tx.guardando : editando === 'nueva' ? tx.guardarMascara : tx.guardarCambios}
            </button>
            <button type="button" className="boton secundario" onClick={() => f.empezarDeNuevo()}>
              {tx.cancelar}
            </button>
          </div>
        </form>
      )}
      {!editando && error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {borrar && (
        <Confirmar
          texto={tx.borrarMascaraSeguro}
          etiquetaSi={tx.si}
          etiquetaNo={tx.no}
          si={() => void confirmarBorrar(borrar)}
          no={() => setBorrar(null)}
        />
      )}
    </section>
  );
}

function Muestra({ colores }: { colores: { principal: string; secundario: string; fondo: string } }) {
  return (
    <span className="mascara-muestra" aria-hidden="true" style={{ background: colores.fondo }}>
      <i style={{ background: colores.principal }} />
      <i style={{ background: colores.secundario }} />
    </span>
  );
}
