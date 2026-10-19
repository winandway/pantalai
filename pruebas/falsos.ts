// Base de datos y almacén falsos para las pruebas: nunca se toca nada real.
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';

type Valor = string | number | null;

class Sentencia {
  constructor(
    private db: DatabaseSync,
    private sql: string,
    private valores: Valor[] = [],
  ) {}
  bind(...v: Valor[]) {
    return new Sentencia(this.db, this.sql, v);
  }
  async first<T>() {
    return (this.db.prepare(this.sql).get(...this.valores) as T) ?? null;
  }
  async all<T>() {
    return { results: this.db.prepare(this.sql).all(...this.valores) as T[] };
  }
  async run() {
    const r = this.db.prepare(this.sql).run(...this.valores);
    return { meta: { changes: Number(r.changes) } };
  }
}

export function baseFalsa() {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../schema.sql', import.meta.url), 'utf8'));
  return {
    prepare: (sql: string) => new Sentencia(db, sql),
    batch: async (lista: Sentencia[]) => Promise.all(lista.map((s) => s.run())),
    exec: async (sql: string) => db.exec(sql),
    crudo: db,
  } as unknown as D1Database & { crudo: DatabaseSync };
}

type Objeto = { datos: Uint8Array; tipo?: string };

function rangoDe(h: Headers | undefined, tam: number): { offset: number; length: number } | undefined {
  const r = h?.get('range');
  const m = r && /bytes=(\d+)-(\d*)/.exec(r);
  if (!m) return undefined;
  const ini = Number(m[1]);
  const fin = m[2] ? Math.min(Number(m[2]), tam - 1) : tam - 1;
  return { offset: ini, length: fin - ini + 1 };
}

async function aBytes(v: unknown): Promise<Uint8Array> {
  if (v instanceof Uint8Array) return v;
  if (v instanceof ArrayBuffer) return new Uint8Array(v);
  if (typeof v === 'string') return new TextEncoder().encode(v);
  return new Uint8Array(await new Response(v as BodyInit).arrayBuffer());
}

export function almacenFalso() {
  const objetos = new Map<string, Objeto>();
  const subidas = new Map<string, { clave: string; tipo?: string; partes: Map<number, Uint8Array> }>();
  const cuerpo = (clave: string, o: Objeto, rango?: { offset: number; length: number }) => {
    const datos = rango ? o.datos.slice(rango.offset, rango.offset + rango.length) : o.datos;
    return {
      key: clave,
      size: o.datos.length,
      httpEtag: `"${o.datos.length}"`,
      range: rango,
      body: new Response(datos as unknown as BodyInit).body,
      httpMetadata: { contentType: o.tipo },
      writeHttpMetadata: (h: Headers) => o.tipo && h.set('content-type', o.tipo),
      arrayBuffer: async () => datos.buffer,
    };
  };
  const bucket = {
    objetos,
    async put(clave: string, v: unknown, op?: { httpMetadata?: { contentType?: string } }) {
      objetos.set(clave, { datos: await aBytes(v), tipo: op?.httpMetadata?.contentType });
      return { key: clave };
    },
    async get(clave: string, op?: { range?: Headers }) {
      const o = objetos.get(clave);
      return o ? cuerpo(clave, o, rangoDe(op?.range, o.datos.length)) : null;
    },
    async head(clave: string) {
      return objetos.has(clave) ? { key: clave } : null;
    },
    async delete(claves: string | string[]) {
      for (const c of Array.isArray(claves) ? claves : [claves]) objetos.delete(c);
    },
    async createMultipartUpload(clave: string, op?: { httpMetadata?: { contentType?: string } }) {
      const id = `sub-${subidas.size + 1}`;
      subidas.set(id, { clave, tipo: op?.httpMetadata?.contentType, partes: new Map() });
      return { uploadId: id, key: clave };
    },
    resumeMultipartUpload(clave: string, id: string) {
      return {
        async uploadPart(n: number, v: unknown) {
          const s = subidas.get(id);
          if (!s || s.clave !== clave) throw new Error('subida no existe');
          s.partes.set(n, await aBytes(v));
          return { partNumber: n, etag: `etag-${n}` };
        },
        async complete(partes: { partNumber: number; etag: string }[]) {
          const s = subidas.get(id);
          if (!s) throw new Error('subida no existe');
          const trozos = partes.map((p) => {
            const t = s.partes.get(p.partNumber);
            if (!t || p.etag !== `etag-${p.partNumber}`) throw new Error(`parte ${p.partNumber} inválida`);
            return t;
          });
          const total = new Uint8Array(trozos.reduce((a, t) => a + t.length, 0));
          let i = 0;
          for (const t of trozos) {
            total.set(t, i);
            i += t.length;
          }
          objetos.set(clave, { datos: total, tipo: s.tipo });
          subidas.delete(id);
          return { size: total.length, key: clave };
        },
        async abort() {
          subidas.delete(id);
        },
      };
    },
  };
  return bucket as unknown as R2Bucket & { objetos: Map<string, Objeto> };
}
