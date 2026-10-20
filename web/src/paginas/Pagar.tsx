// Pagar el plan SIN salir de Pantalay: la tarjeta se escribe en el cuadro seguro de Stripe (Payment Element)
// que vive dentro de esta página. Pantalay nunca ve ni guarda el número de la tarjeta.
// El plan se enciende cuando Stripe avisa (webhook firmado); aquí solo se espera ese aviso.
import { loadStripe, type Stripe, type StripeElements } from '@stripe/stripe-js';
import { useEffect, useRef, useState } from 'react';
import { ErrorApi, pedir } from '../logica/api';
import { textoError, useIdioma } from '../logica/idioma';
import { alClicEnlace, navegar } from '../logica/ruta';
import { useSesion } from '../logica/sesion';
import { DOMINIO } from '../logica/sitio';
import { precio, TARJETAS } from './Precios';

type PlanPago = 'business' | 'business_ia';
type Ciclo = 'mensual' | 'anual';

/** Ahorro del anual frente a pagar 12 meses sueltos, en dólares. */
export function ahorroAnual(mensual: number, anualPorMes: number): number {
  return Math.round((mensual - anualPorMes) * 12 * 100) / 100;
}

export function Pagar() {
  const { t, idioma } = useIdioma();
  const { usuario, cargando } = useSesion();
  const q = new URLSearchParams(location.search);
  const plan: PlanPago = q.get('plan') === 'business' ? 'business' : 'business_ia';
  const [ciclo, setCiclo] = useState<Ciclo>(q.get('ciclo') === 'mensual' ? 'mensual' : 'anual');
  const [listo, setListo] = useState<boolean | null>(null);
  // Al volver de una verificación del banco (3-D Secure), Stripe trae de vuelta a /checkout/done.
  const [paso, setPaso] = useState<'elegir' | 'tarjeta' | 'confirmando' | 'hecho'>(
    location.pathname === '/checkout/done' ? 'hecho' : 'elegir',
  );
  const [error, setError] = useState('');
  const [prueba, setPrueba] = useState(0);
  const tarjeta = useRef<HTMLDivElement>(null);
  const stripe = useRef<{ s: Stripe; e: StripeElements; tipo: 'pago' | 'tarjeta' } | null>(null);
  const datos = TARJETAS.find((x) => x.id === plan)!;
  const [mensual, anual] = datos.fundador!;

  useEffect(() => {
    if (!cargando && !usuario)
      navegar(`/signup?volver=${encodeURIComponent(`/checkout${location.search}`)}`, true);
  }, [cargando, usuario]);
  useEffect(() => {
    pedir<{ listo: boolean; dias_prueba: number }>('/datos/pago/config')
      .then((r) => {
        setListo(r.listo);
        setPrueba(r.dias_prueba);
      })
      .catch(() => setListo(false));
  }, []);

  async function continuar() {
    setError('');
    setPaso('confirmando');
    try {
      const r = await pedir<{
        secreto: string;
        tipo: 'pago' | 'tarjeta';
        publicable: string;
        dias_prueba: number;
      }>('/datos/pago/suscripcion', { method: 'POST', json: { plan, ciclo } });
      setPrueba(r.dias_prueba);
      const s = await loadStripe(r.publicable, { locale: idioma });
      if (!s || !tarjeta.current) throw new Error('stripe');
      const e = s.elements({
        clientSecret: r.secreto,
        appearance: { theme: 'stripe', variables: { colorPrimary: '#16181d', borderRadius: '10px' } },
      });
      e.create('payment', { layout: 'tabs' }).mount(tarjeta.current);
      stripe.current = { s, e, tipo: r.tipo };
      setPaso('tarjeta');
    } catch (e) {
      setError(textoError(t, e instanceof ErrorApi ? e.codigo : 'stripe'));
      setPaso('elegir');
    }
  }

  async function pagar() {
    const x = stripe.current;
    if (!x) return;
    setError('');
    setPaso('confirmando');
    const opciones = {
      elements: x.e,
      redirect: 'if_required' as const,
      confirmParams: { return_url: `${DOMINIO}/checkout/done` },
    };
    const r = x.tipo === 'pago' ? await x.s.confirmPayment(opciones) : await x.s.confirmSetup(opciones);
    if (r.error) {
      // Lo escrito se queda en el cuadro de la tarjeta para corregir y reintentar.
      setError(r.error.message ?? t('error.tarjeta'));
      setPaso('tarjeta');
      return;
    }
    // Stripe aprobó: se espera su aviso para encender el plan (unos segundos).
    for (let i = 0; i < 20; i++) {
      const p = await pedir<{ plan: string }>('/datos/plan').catch(() => null);
      if (p?.plan === plan) break;
      await new Promise((ok) => setTimeout(ok, 1500));
    }
    setPaso('hecho');
  }

  if (!usuario) return <div className="cargando" aria-busy="true" />;
  if (listo === false)
    return (
      <section className="pagina-angosta vacio">
        <h1>{datos.nombre}</h1>
        <p>{t('preciosProximamente')}</p>
        <a className="boton" href="/pricing" onClick={alClicEnlace}>
          {t('verPlanes')}
        </a>
      </section>
    );
  if (paso === 'hecho')
    return (
      <section className="pagina-angosta pagar-hecho" role="status">
        <p className="pagar-check" aria-hidden="true">
          ✓
        </p>
        <h1>{t('pagoListo')}</h1>
        <p>{t('pagoListoAyuda').replace('{plan}', datos.nombre)}</p>
        <a className="boton" href="/record" onClick={alClicEnlace}>
          {t('grabar')}
        </a>
      </section>
    );

  const ahorro = ahorroAnual(datos.lista![0], datos.lista![1]);
  return (
    <div className="pagar">
      <a className="enlace" href="/pricing" onClick={alClicEnlace}>
        ← {t('verPlanes')}
      </a>
      <h1>{datos.nombre}</h1>
      <p className="precios-fundador">⭐ {t('preciosFundador')}</p>

      <fieldset className="pagar-ciclos" disabled={paso !== 'elegir'}>
        <legend>{t('preciosCobro')}</legend>
        <label className={`pagar-ciclo ${ciclo === 'anual' ? 'activo' : ''}`}>
          <input type="radio" name="ciclo" checked={ciclo === 'anual'} onChange={() => setCiclo('anual')} />
          <span className="pagar-ciclo-nombre">
            {t('preciosAnual')} <span className="etiqueta-ahorro">{t('recomendado')}</span>
          </span>
          <strong>
            {precio(anual, idioma)} <small>{t('preciosPorUsuario')}</small>
          </strong>
          <span className="pagar-detalle">
            {precio(anual * 12, idioma)} {t('preciosAlAno')} · {t('ahorras')}{' '}
            {precio(ahorroAnual(mensual, anual), idioma)}
          </span>
        </label>
        <label className={`pagar-ciclo ${ciclo === 'mensual' ? 'activo' : ''}`}>
          <input
            type="radio"
            name="ciclo"
            checked={ciclo === 'mensual'}
            onChange={() => setCiclo('mensual')}
          />
          <span className="pagar-ciclo-nombre">{t('preciosMensual')}</span>
          <strong>
            {precio(mensual, idioma)} <small>{t('preciosPorUsuario')}</small>
          </strong>
          <span className="pagar-detalle">{t('cancelaCuandoQuieras')}</span>
        </label>
      </fieldset>
      <p className="ayuda">
        {t('precioListaAyuda')
          .replace('{lista}', precio(ciclo === 'anual' ? datos.lista![1] : datos.lista![0], idioma))
          .replace('{ahorro}', precio(ahorro, idioma))}
      </p>

      <div ref={tarjeta} className="pagar-tarjeta" data-testid="cuadro-tarjeta" />
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {paso === 'elegir' || (paso === 'confirmando' && !stripe.current) ? (
        <button
          type="button"
          className="boton grande ancho"
          disabled={paso !== 'elegir' || listo === null}
          onClick={() => void continuar()}
        >
          {paso === 'confirmando' ? t('procesandoPago') : t('continuarPago')}
        </button>
      ) : (
        <button
          type="button"
          className="boton grande ancho"
          disabled={paso === 'confirmando'}
          onClick={() => void pagar()}
        >
          {paso === 'confirmando'
            ? t('procesandoPago')
            : stripe.current?.tipo === 'tarjeta'
              ? t('empezarPrueba').replace('{dias}', String(prueba))
              : t('pagarAhora')}
        </button>
      )}
      <p className="ayuda centro">
        🔒 {t('pagoSeguro')}
        {prueba > 0 ? ` ${t('pruebaAyuda').replace('{dias}', String(prueba))}` : ''}
      </p>
    </div>
  );
}
