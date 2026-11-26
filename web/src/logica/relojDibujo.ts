// Reloj que marca el paso de los cuadros de la grabación (CANDADO C-RELOJ-SIN-COLA).
// Vive en un Worker porque los relojes de la página se frenan cuando la pestaña queda atrás. La regla: NUNCA manda
// un aviso nuevo mientras la página no terminó de dibujar el anterior. Antes mandaba 30 por segundo sin mirar; en una
// máquina lenta (sin tarjeta gráfica, o la de GitHub) cada dibujo tarda más que el paso, los avisos se amontonaban sin
// tope y la página se iba trabando hasta congelarse: el video salía a menos de un cuadro por segundo.

/** Lo que hace el reloj, aparte del Worker para poder probarlo. */
export function crearRelojDibujo(
  avisar: () => void,
  cada: (f: () => void, ms: number) => unknown,
  parar: (id: unknown) => void,
  cuadrosPorSegundo = 30,
) {
  let libre = true; // la página ya dibujó el aviso anterior
  let debe = false; // tocó un paso mientras la página seguía dibujando: se manda apenas quede libre
  const mandar = () => {
    libre = false;
    debe = false;
    avisar();
  };
  const id = cada(() => {
    if (libre) mandar();
    else debe = true;
  }, 1000 / cuadrosPorSegundo);
  return {
    /** Mensaje de la página: «listo» (terminó de dibujar) o «fin». */
    recibir(mensaje: unknown) {
      if (mensaje === 'fin') return parar(id);
      libre = true;
      if (debe) mandar();
    },
  };
}

/** El código que corre dentro del Worker. */
// (La función va entre paréntesis y se llama ahí mismo: al publicar se le cambia el nombre y no se puede nombrar.)
export const CODIGO_RELOJ_DIBUJO = `const reloj = (${crearRelojDibujo.toString()})(() => postMessage(0), setInterval, clearInterval);
onmessage = (e) => reloj.recibir(e.data);`;

/** Arranca el reloj: llama a «dibujar» a 30 por segundo como mucho, y nunca con avisos en cola. */
export function arrancarRelojDibujo(dibujar: () => void): Worker {
  const reloj = new Worker(URL.createObjectURL(new Blob([CODIGO_RELOJ_DIBUJO], { type: 'text/javascript' })));
  reloj.onmessage = () => {
    try {
      dibujar();
    } finally {
      reloj.postMessage('listo');
    }
  };
  return reloj;
}
