// Tipos mínimos de las APIs de Chrome que usa la extensión (sin agregar un paquete de tipos al proyecto).
declare namespace chrome {
  namespace runtime {
    const id: string;
    const lastError: { message?: string } | undefined;
    type Remitente = { tab?: tabs.Tab; url?: string; origin?: string; id?: string };
    type Oyente = (mensaje: unknown, remitente: Remitente, responder: (r: unknown) => void) => boolean | void;
    const onMessage: { addListener(f: Oyente): void };
    const onMessageExternal: { addListener(f: Oyente): void };
    function sendMessage(mensaje: unknown): Promise<unknown>;
    function getURL(ruta: string): string;
  }
  namespace tabs {
    type Tab = { id?: number; url?: string; title?: string; active?: boolean; windowId?: number };
    function query(q: { active?: boolean; currentWindow?: boolean; url?: string | string[] }): Promise<Tab[]>;
    function get(id: number): Promise<Tab>;
    function create(p: { url: string; openerTabId?: number; active?: boolean }): Promise<Tab>;
  }
  namespace scripting {
    type Resultado<T> = { result?: T; frameId: number };
    function executeScript<T = unknown>(p: {
      target: { tabId: number; allFrames?: boolean };
      files?: string[];
      func?: (...args: never[]) => T;
      args?: unknown[];
      world?: 'ISOLATED' | 'MAIN';
    }): Promise<Resultado<Awaited<T>>[]>;
  }
  namespace storage {
    const session: {
      get(clave: string): Promise<Record<string, unknown>>;
      set(v: Record<string, unknown>): Promise<void>;
      remove(clave: string): Promise<void>;
    };
  }
  namespace commands {
    const onCommand: { addListener(f: (comando: string, tab?: tabs.Tab) => void): void };
  }
  namespace i18n {
    function getMessage(clave: string): string;
    function getUILanguage(): string;
  }
}
