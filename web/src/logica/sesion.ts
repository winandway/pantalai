import { createContext, useContext } from 'react';
import type { Usuario } from './api';

export const ContextoSesion = createContext<{
  usuario: Usuario | null;
  cargando: boolean;
  setUsuario: (u: Usuario | null) => void;
  salir: () => Promise<void>;
}>({ usuario: null, cargando: true, setUsuario: () => undefined, salir: async () => undefined });

export const useSesion = () => useContext(ContextoSesion);
