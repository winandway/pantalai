// CANDADO C-RELOJ-SIN-COLA: el reloj que marca los cuadros de la grabación nunca manda un aviso nuevo mientras la
// página no terminó de dibujar el anterior. Con avisos sin tope, en una máquina lenta la página se congelaba.
import { describe, expect, it } from 'vitest';
import { CODIGO_RELOJ_DIBUJO, crearRelojDibujo } from '../web/src/logica/relojDibujo';

/** Un reloj de mentira: «paso()» hace sonar el intervalo una vez. */
function armar(crear: typeof crearRelojDibujo = crearRelojDibujo) {
  let avisos = 0;
  let paso: () => void = () => undefined;
  let parado = false;
  const reloj = crear(
    () => avisos++,
    (f) => {
      paso = f;
      return 7;
    },
    (id) => {
      parado = id === 7;
    },
  );
  return { reloj, paso: () => paso(), avisos: () => avisos, parado: () => parado };
}

describe('reloj de los cuadros de la grabación', () => {
  it('con la página al día, manda un aviso por paso', () => {
    const r = armar();
    for (let i = 0; i < 5; i++) {
      r.paso();
      r.reloj.recibir('listo');
    }
    expect(r.avisos()).toBe(5);
  });

  it('con la página trabada NO amontona avisos: nunca hay más de uno sin dibujar', () => {
    const r = armar();
    for (let i = 0; i < 300; i++) r.paso(); // diez segundos sin que la página conteste
    expect(r.avisos()).toBe(1);
    r.reloj.recibir('listo'); // la página dibujó: sale enseguida el que tocaba, uno solo
    expect(r.avisos()).toBe(2);
    r.reloj.recibir('listo');
    expect(r.avisos()).toBe(2); // sin paso nuevo no hay aviso nuevo
    r.paso();
    expect(r.avisos()).toBe(3);
  });

  it('«fin» para el reloj', () => {
    const r = armar();
    r.reloj.recibir('fin');
    expect(r.parado()).toBe(true);
  });

  it('el código que va dentro del Worker hace lo mismo (tal como se publica)', () => {
    let avisos = 0;
    let paso: () => void = () => undefined;
    const ambito: { onmessage?: (e: { data: unknown }) => void } = {};
    new Function(
      'postMessage',
      'setInterval',
      'clearInterval',
      'ambito',
      `let onmessage; ${CODIGO_RELOJ_DIBUJO}; ambito.onmessage = onmessage;`,
    )(
      () => avisos++,
      (f: () => void) => {
        paso = f;
        return 1;
      },
      () => undefined,
      ambito,
    );
    for (let i = 0; i < 100; i++) paso();
    expect(avisos).toBe(1);
    ambito.onmessage!({ data: 'listo' });
    expect(avisos).toBe(2);
  });
});
