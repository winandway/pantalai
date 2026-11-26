import { useEffect, useRef, type ReactNode } from 'react';

export function Modal({
  titulo,
  cerrar,
  children,
  ancho = 520,
}: {
  titulo: string;
  cerrar: () => void;
  children: ReactNode;
  ancho?: number;
}) {
  const caja = useRef<HTMLDivElement>(null);
  // «cerrar» suele ser una función nueva en cada pintada de la página. Si el efecto dependiera de ella, la ventana
  // se volvería a enfocar en cada pintada y le quitaría el cursor a la casilla donde se está escribiendo: en el
  // Estudio (que se repinta varias veces por segundo) no se podía escribir (Richard, 25 nov 2026; C-MODAL-FOCO).
  const alCerrar = useRef(cerrar);
  alCerrar.current = cerrar;
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && alCerrar.current();
    document.addEventListener('keydown', tecla);
    // Solo al abrir, y solo si el cursor no está ya adentro.
    if (!caja.current?.contains(document.activeElement)) caja.current?.focus();
    return () => document.removeEventListener('keydown', tecla);
  }, []);
  return (
    <div className="modal-fondo" onMouseDown={(e) => e.target === e.currentTarget && cerrar()}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        tabIndex={-1}
        ref={caja}
        style={{ maxWidth: ancho }}
      >
        <div className="modal-cabecera">
          <h2>{titulo}</h2>
          <button type="button" className="boton-icono" aria-label="Close" onClick={cerrar}>
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Confirmar({
  texto,
  si,
  no,
  etiquetaSi,
  etiquetaNo,
}: {
  texto: string;
  si: () => void;
  no: () => void;
  etiquetaSi: string;
  etiquetaNo: string;
}) {
  return (
    <Modal titulo={etiquetaSi} cerrar={no} ancho={420}>
      <p>{texto}</p>
      <div className="fila-botones">
        <button type="button" className="boton secundario" onClick={no}>
          {etiquetaNo}
        </button>
        <button type="button" className="boton peligro" onClick={si}>
          {etiquetaSi}
        </button>
      </div>
    </Modal>
  );
}
