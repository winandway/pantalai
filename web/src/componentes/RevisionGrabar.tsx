// Revisión antes de grabar en el Estudio (C-REVISION-GRABAR): se abre SOLO al tocar «Grabar» y muestra lo que va a
// salir en el video. Cada dato se corrige aquí mismo (se ve al instante en el escenario) y se graba con «Todo bien».
import type { ReactNode } from 'react';
import type { AvisoRevision } from '../logica/revisionGrabar';
import type { TEXTOS_ESTUDIO } from '../logica/textosEstudio';
import { Modal } from './Modal';

type Textos = (typeof TEXTOS_ESTUDIO)['en'];

export function RevisionGrabar({
  tx,
  avisos,
  invitado,
  tema,
  tituloFinal,
  programa,
  programaDefecto,
  anfitrion,
  anfitrionDefecto,
  creador,
  nombreInvitado,
  karaoke,
  cambiar,
  alternarKaraoke,
  grabar,
  cerrar,
}: {
  tx: Textos;
  avisos: AvisoRevision[];
  invitado: boolean;
  tema: string;
  tituloFinal: string;
  programa: string;
  programaDefecto: string;
  anfitrion: string;
  anfitrionDefecto: string;
  creador: string;
  nombreInvitado: string | null;
  karaoke: boolean;
  cambiar: (campo: 'tema' | 'programa' | 'anfitrion' | 'creador', valor: string) => void;
  alternarKaraoke: () => void;
  grabar: () => void;
  cerrar: () => void;
}) {
  const campo = (
    id: string,
    etiqueta: string,
    valor: string,
    defecto: string,
    al: (v: string) => void,
    extra?: ReactNode,
  ) => (
    <div className="campo">
      <label htmlFor={id}>{etiqueta}</label>
      <input
        id={id}
        value={valor}
        placeholder={defecto}
        maxLength={120}
        onChange={(e) => al(e.target.value)}
      />
      {extra}
    </div>
  );
  return (
    <Modal titulo={tx.revisarTitulo} cerrar={cerrar} ancho={560}>
      <form
        className="revision-grabar"
        data-revision-grabar
        onSubmit={(e) => {
          e.preventDefault();
          grabar();
        }}
      >
        <p className="ayuda">{tx.revisarIntro}</p>
        {avisos.filter((a) => a !== 'karaoke').length > 0 && (
          <ul className="revision-avisos" role="alert">
            {avisos
              .filter((a) => a !== 'karaoke')
              .map((a) => (
                <li key={a} data-aviso={a}>
                  ⚠️ {tx.avisosRevision[a]}
                </li>
              ))}
          </ul>
        )}
        {campo(
          'revision-tema',
          tx.revisarTema,
          tema,
          '',
          (v) => cambiar('tema', v),
          tituloFinal ? (
            <small className="ayuda">
              {tx.revisarSeGuarda}: <b>{tituloFinal}</b>
            </small>
          ) : null,
        )}
        <div className="revision-fila">
          {campo('revision-programa', tx.revisarPrograma, programa, programaDefecto, (v) =>
            cambiar('programa', v),
          )}
          {campo('revision-anfitrion', tx.revisarAnfitrion, anfitrion, anfitrionDefecto, (v) =>
            cambiar('anfitrion', v),
          )}
        </div>
        {invitado ? (
          <p className="revision-invitado">
            {tx.revisarInvitado}: <b>{nombreInvitado || tx.revisarSinInvitado}</b>
          </p>
        ) : (
          campo('revision-creador', tx.revisarCreador, creador, '@', (v) => cambiar('creador', v))
        )}
        <div
          className={`revision-karaoke${karaoke ? ' encendido' : ''}`}
          data-aviso={karaoke ? 'karaoke' : undefined}
        >
          <span>
            {karaoke ? '🎤✨ ' : '🎤 '}
            {karaoke ? tx.revisarKaraokeOn : tx.revisarKaraokeOff}
          </span>
          <button type="button" className="boton secundario chico" onClick={alternarKaraoke}>
            {karaoke ? tx.revisarApagarKaraoke : tx.revisarEncenderKaraoke}
          </button>
        </div>
        <div className="fila-botones">
          <button type="button" className="boton secundario" onClick={cerrar}>
            {tx.revisarCancelar}
          </button>
          <button type="submit" className="boton grabar-boton">
            <span className="punto-rojo" aria-hidden="true" /> {tx.revisarGrabar}
          </button>
        </div>
      </form>
    </Modal>
  );
}
