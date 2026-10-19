import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

const Contexto = createContext<(texto: string) => void>(() => undefined);
export const useAviso = () => useContext(Contexto);

/** Aviso corto abajo de la pantalla que se va solo. Nunca una ventana que haya que cerrar. */
export function ProveedorAviso({ children }: { children: ReactNode }) {
  const [texto, setTexto] = useState<string | null>(null);
  const avisar = useCallback((t: string) => {
    setTexto(t);
    window.setTimeout(() => setTexto((a) => (a === t ? null : a)), 2600);
  }, []);
  return (
    <Contexto.Provider value={avisar}>
      {children}
      <div className="aviso" role="status" aria-live="polite">
        {texto}
      </div>
    </Contexto.Provider>
  );
}
