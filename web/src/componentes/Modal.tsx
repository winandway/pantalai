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
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && cerrar();
    document.addEventListener('keydown', tecla);
    caja.current?.focus();
    return () => document.removeEventListener('keydown', tecla);
  }, [cerrar]);
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
