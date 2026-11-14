import { useIdioma } from '../logica/idioma';

/**
 * Aviso discreto de la regla «ningún formulario pierde lo escrito»: una línea, nunca una ventana,
 * con la opción de empezar de nuevo. Todo formulario que use useBorrador lo muestra (candado C-BORRADOR).
 */
export function AvisoBorrador({ b }: { b: { recuperado: boolean; empezarDeNuevo: () => void } }) {
  const { t } = useIdioma();
  if (!b.recuperado) return null;
  return (
    <p className="recuperado" role="status" data-aviso-borrador>
      {t('recuperado')}{' '}
      <button type="button" className="enlace" onClick={b.empezarDeNuevo}>
        {t('empezarDeNuevo')}
      </button>
    </p>
  );
}
