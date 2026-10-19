// Subida por partes MIENTRAS se graba (como Loom: el enlace está listo al terminar).
// La primera parte se guarda hasta el final para escribirle la duración al archivo.
// Cada pedazo se guarda también en el navegador (IndexedDB): si algo falla, la grabación no se pierde.
import { ErrorApi, pedir } from './api';

export type ParteSubida = { partNumber: number; etag: string };

type Opciones = {
  videoId: string;
  parteMinima: number;
  progreso?: (subidos: number, total: number) => void;
  subirParte?: (videoId: string, n: number, datos: Blob) => Promise<ParteSubida>;
  esperar?: (ms: number) => Promise<void>;
};

const esperarMs = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function subirParteHttp(videoId: string, n: number, datos: Blob): Promise<ParteSubida> {
  const r = await pedir<{ parte: ParteSubida }>(`/datos/videos/${videoId}/partes/${n}`, {
    method: 'PUT',
    body: datos,
    headers: { 'content-type': 'application/octet-stream' },
  });
  return r.parte;
}

export class Subidor {
  private pendiente: Blob[] = [];
  private pendienteBytes = 0;
  private primera: Blob | null = null;
  private siguiente = 2;
  private partes = new Map<number, { blob: Blob; p: Promise<ParteSubida>; fallo: boolean }>();
  private finalizado = false;
  private subidos = 0;
  private total = 0;
  readonly todo: Blob[] = [];
  private o: Required<Omit<Opciones, 'progreso'>> & Pick<Opciones, 'progreso'>;

  constructor(o: Opciones) {
    this.o = { subirParte: subirParteHttp, esperar: esperarMs, ...o };
  }

  agregar(pedazo: Blob) {
    if (!pedazo.size) return;
    this.todo.push(pedazo);
    this.pendiente.push(pedazo);
    this.pendienteBytes += pedazo.size;
    this.total += pedazo.size;
    if (this.pendienteBytes >= this.o.parteMinima) this.cortar();
  }

  private cortar() {
    const blob = new Blob(this.pendiente);
    this.pendiente = [];
    this.pendienteBytes = 0;
    if (!this.primera) {
      this.primera = blob;
      return;
    }
    this.encolar(this.siguiente++, blob);
  }

  private encolar(n: number, blob: Blob) {
    const entrada = { blob, fallo: false, p: null as unknown as Promise<ParteSubida> };
    entrada.p = this.conReintentos(n, blob).then((parte) => {
      this.subidos += blob.size;
      this.o.progreso?.(this.subidos, this.total);
      return parte;
    });
    entrada.p.catch(() => (entrada.fallo = true)); // el error se recoge en terminar()
    this.partes.set(n, entrada);
  }

  private async conReintentos(n: number, blob: Blob): Promise<ParteSubida> {
    let ultimo: unknown;
    for (let intento = 0; intento < 6; intento++) {
      try {
        return await this.o.subirParte(this.o.videoId, n, blob);
      } catch (e) {
        ultimo = e;
        // Un error de datos no se arregla reintentando.
        if (e instanceof ErrorApi && e.estado >= 400 && e.estado < 500 && e.estado !== 429) break;
        await this.o.esperar(Math.min(15000, 800 * 2 ** intento));
      }
    }
    throw ultimo;
  }

  /** Sube lo que falta y devuelve la lista de partes para cerrar el archivo. */
  async terminar(arreglarPrimera?: (b: Blob) => Promise<Blob>): Promise<ParteSubida[]> {
    if (this.finalizado) {
      // Reintento: solo se vuelven a subir las partes que fallaron.
      for (const [n, e] of [...this.partes]) if (e.fallo) this.encolar(n, e.blob);
      return Promise.all([...this.partes.values()].map((e) => e.p));
    }
    this.finalizado = true;
    if (this.pendienteBytes > 0 || !this.primera) {
      const resto = new Blob(this.pendiente);
      this.pendiente = [];
      this.pendienteBytes = 0;
      if (!this.primera) this.primera = resto;
      else if (resto.size) this.encolar(this.siguiente++, resto);
    }
    let primera = this.primera!;
    if (arreglarPrimera) {
      try {
        const arreglada = await arreglarPrimera(primera);
        if (arreglada.size >= primera.size) {
          this.total += arreglada.size - primera.size;
          primera = arreglada;
        }
      } catch (e) {
        console.error('no se pudo escribir la duración; se sube como está', e);
      }
    }
    this.encolar(1, primera);
    return Promise.all([...this.partes.values()].map((e) => e.p));
  }

  /** Toda la grabación junta, para descargarla si la subida falla. */
  archivo(tipo: string): Blob {
    return new Blob(this.todo, { type: tipo });
  }
}

// ---------- respaldo en el navegador ----------

const BASE = 'pantalai-respaldo';

function abrir(): Promise<IDBDatabase> {
  return new Promise((ok, mal) => {
    const r = indexedDB.open(BASE, 1);
    r.onupgradeneeded = () => {
      r.result.createObjectStore('pedazos', { autoIncrement: true });
      r.result.createObjectStore('grabaciones', { keyPath: 'id' });
    };
    r.onsuccess = () => ok(r.result);
    r.onerror = () => mal(r.error);
  });
}

export type Respaldo = { id: string; tipo: string; creado: number; duracion: number };

export async function respaldarPedazo(grabacion: Respaldo, pedazo: Blob) {
  try {
    const db = await abrir();
    const tx = db.transaction(['pedazos', 'grabaciones'], 'readwrite');
    tx.objectStore('grabaciones').put(grabacion);
    tx.objectStore('pedazos').add({ grabacion: grabacion.id, pedazo });
    await new Promise((ok, mal) => {
      tx.oncomplete = ok;
      tx.onerror = () => mal(tx.error);
    });
    db.close();
  } catch (e) {
    console.error('respaldo local no disponible', e);
  }
}

export async function listarRespaldos(): Promise<Respaldo[]> {
  try {
    const db = await abrir();
    const r = db.transaction('grabaciones').objectStore('grabaciones').getAll();
    const lista = await new Promise<Respaldo[]>((ok, mal) => {
      r.onsuccess = () => ok(r.result as Respaldo[]);
      r.onerror = () => mal(r.error);
    });
    db.close();
    return lista;
  } catch {
    return [];
  }
}

export async function leerRespaldo(id: string, tipo: string): Promise<Blob> {
  const db = await abrir();
  const r = db.transaction('pedazos').objectStore('pedazos').getAll();
  const filas = await new Promise<{ grabacion: string; pedazo: Blob }[]>((ok, mal) => {
    r.onsuccess = () => ok(r.result as { grabacion: string; pedazo: Blob }[]);
    r.onerror = () => mal(r.error);
  });
  db.close();
  return new Blob(
    filas.filter((f) => f.grabacion === id).map((f) => f.pedazo),
    { type: tipo },
  );
}

export async function borrarRespaldo(id: string) {
  try {
    const db = await abrir();
    const tx = db.transaction(['pedazos', 'grabaciones'], 'readwrite');
    tx.objectStore('grabaciones').delete(id);
    const cursor = tx.objectStore('pedazos').openCursor();
    cursor.onsuccess = () => {
      const c = cursor.result;
      if (!c) return;
      if ((c.value as { grabacion: string }).grabacion === id) c.delete();
      c.continue();
    };
    await new Promise((ok) => (tx.oncomplete = ok));
    db.close();
  } catch (e) {
    console.error('no se pudo borrar el respaldo', e);
  }
}
