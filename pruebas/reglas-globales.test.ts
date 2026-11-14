// CANDADOS de las reglas globales de Richard que valen para TODAS las pantallas (no solo para la pieza):
// - C-BORRADOR: cada componente con un formulario o un cuadro de texto usa useBorrador y muestra AvisoBorrador.
// - C-OJITO: ninguna casilla de contraseña suelta; todas pasan por CampoClave.
// - C-SELECTOR-IDIOMA: un solo selector (SelectorIdioma) y nunca la bandera de México ni otra de América.
// Si alguien agrega una pantalla que rompe la regla, esta prueba se pone en rojo.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const RAIZ = join(__dirname, '..');

function archivos(dir: string, ext: RegExp): string[] {
  return readdirSync(dir).flatMap((n) => {
    const f = join(dir, n);
    if (statSync(f).isDirectory()) return archivos(f, ext);
    return ext.test(n) ? [f] : [];
  });
}

const PANTALLAS = archivos(join(RAIZ, 'web/src'), /\.tsx$/);

/** Parte un archivo en sus funciones de primer nivel (cada componente con su cuerpo). */
export function componentes(texto: string): { nombre: string; cuerpo: string }[] {
  const marcas = [...texto.matchAll(/^(?:export )?(?:default )?function (\w+)/gm)];
  return marcas.map((m, i) => ({
    nombre: m[1]!,
    cuerpo: texto.slice(m.index, marcas[i + 1]?.index ?? texto.length),
  }));
}

// Formularios que NO guardan borrador, con su motivo. Agregar aquí exige un motivo real.
const SIN_BORRADOR: Record<string, string> = {
  'web/src/componentes/RevisionGrabar.tsx#RevisionGrabar':
    'los valores viven en el Estudio, que ya guarda borrador',
  'web/src/paginas/Cuenta.tsx#CambiarClave': 'solo contraseñas: nunca se guardan',
  'web/src/paginas/Cuenta.tsx#BorrarCuenta': 'solo la contraseña: nunca se guarda',
  'web/src/paginas/Entrar.tsx#Restablecer': 'solo contraseñas: nunca se guardan',
  'web/src/paginas/Red.tsx#BuscadorRed': 'un buscador: lo buscado queda en la dirección de la página',
};

export function revisarBorrador(archivo: string, texto: string): string[] {
  const fallos: string[] = [];
  for (const c of componentes(texto)) {
    const llave = `${archivo}#${c.nombre}`;
    // Un cuadro de solo lectura (código para copiar) no es algo que se escriba.
    const cuerpo = c.cuerpo.replace(/<textarea\s+readOnly\b/g, '');
    const tieneFormulario = /<form[\s>]|<textarea[\s>]/.test(cuerpo);
    const usaBorrador = /useBorrador(<[^>]*>)?\(/.test(c.cuerpo);
    if (tieneFormulario && !usaBorrador && !SIN_BORRADOR[llave])
      fallos.push(`${llave}: formulario sin useBorrador`);
    if (usaBorrador && !/<AvisoBorrador[\s/]/.test(c.cuerpo))
      fallos.push(`${llave}: useBorrador sin AvisoBorrador`);
  }
  return fallos;
}

describe('CANDADO C-BORRADOR en todas las pantallas', () => {
  it('cada formulario guarda lo escrito y avisa «Recuperamos lo que estabas escribiendo»', () => {
    const fallos = PANTALLAS.flatMap((f) => revisarBorrador(relative(RAIZ, f), readFileSync(f, 'utf8')));
    expect(fallos).toEqual([]);
  });

  it('la revisión detecta un formulario suelto y un borrador sin aviso', () => {
    expect(revisarBorrador('x.tsx', 'function A() {\n return <form></form>;\n}')).toHaveLength(1);
    expect(
      revisarBorrador('x.tsx', 'function A() {\n const b = useBorrador(k, {});\n return <textarea />;\n}'),
    ).toEqual(['x.tsx#A: useBorrador sin AvisoBorrador']);
    expect(
      revisarBorrador(
        'x.tsx',
        'function A() {\n const b = useBorrador(k, {});\n return <form><AvisoBorrador b={b} /></form>;\n}',
      ),
    ).toEqual([]);
  });

  it('cada excepción sigue existiendo (no quedan permisos viejos)', () => {
    for (const llave of Object.keys(SIN_BORRADOR)) {
      const [archivo, nombre] = llave.split('#');
      const texto = readFileSync(join(RAIZ, archivo!), 'utf8');
      expect(
        componentes(texto).map((c) => c.nombre),
        llave,
      ).toContain(nombre);
    }
  });
});

describe('CANDADO C-OJITO en todas las pantallas', () => {
  it('ninguna casilla de contraseña fuera de CampoClave (web y extensión)', () => {
    const todos = [...PANTALLAS, ...archivos(join(RAIZ, 'extension'), /\.(html|js|ts|tsx)$/)].filter(
      (f) => !f.endsWith('CampoClave.tsx'),
    );
    const sueltas = todos.filter((f) => /type=\{?["'`]password["'`]/.test(readFileSync(f, 'utf8')));
    expect(sueltas.map((f) => relative(RAIZ, f))).toEqual([]);
  });
});

describe('CANDADO C-SELECTOR-IDIOMA en todas las pantallas', () => {
  const todos = [
    ...archivos(join(RAIZ, 'web/src'), /\.(tsx|ts)$/),
    ...archivos(join(RAIZ, 'extension'), /\.(html|js|ts|json)$/),
  ];
  it('nunca la bandera de México ni de otro país de América para el idioma', () => {
    const malas = /🇲🇽|🇨🇴|🇻🇪|🇦🇷|🇨🇱|🇵🇪/;
    expect(todos.filter((f) => malas.test(readFileSync(f, 'utf8'))).map((f) => relative(RAIZ, f))).toEqual(
      [],
    );
  });
  it('un solo selector: nadie más dibuja la lista de idiomas', () => {
    const otros = PANTALLAS.filter(
      (f) => !f.endsWith('SelectorIdioma.tsx') && /IDIOMAS\.map\(/.test(readFileSync(f, 'utf8')),
    );
    expect(otros.map((f) => relative(RAIZ, f))).toEqual([]);
  });
  it('la cabecera usa SelectorIdioma', () => {
    const usan = PANTALLAS.filter((f) => /<SelectorIdioma[\s/]/.test(readFileSync(f, 'utf8')));
    expect(usan.length).toBeGreaterThan(0);
  });
});
