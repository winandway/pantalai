// La ÚNICA casilla para subir imágenes en Pantalay (regla global, CANDADO C-CAMARA-FOTO): siempre dos botones,
// «Subir desde archivos» y «Tomar foto». En el celular, «Tomar foto» abre la cámara trasera del sistema; en la
// computadora, la cámara web en una ventanita con su botón. Sin cámara o sin permiso, se dice en palabras y queda
// «Subir desde archivos». La imagen elegida pasa por la misma validación y compresión de siempre (achicarImagen).
import { useEffect, useRef, useState } from 'react';
import { useIdioma } from '../logica/idioma';
import {
  ACEPTA_IMAGEN,
  achicarImagen,
  errorDeCamara,
  esCelular,
  imagenAceptable,
  type ErrorCamara,
  type ErrorImagen,
} from '../logica/imagen';
import { Modal } from './Modal';

const TEXTO_ERROR: Record<ErrorImagen | ErrorCamara, string> = {
  tipo: 'imgTipo',
  pesada: 'imgPesada',
  ilegible: 'imgIlegible',
  sin_permiso: 'imgSinPermiso',
  sin_camara: 'imgSinCamara',
  ocupada: 'imgOcupada',
  otro: 'imgCamaraOtro',
};

export function SubirImagen({
  alElegir,
  maximo = 512,
  deshabilitado,
  nombre = 'imagen',
}: {
  /** Recibe la imagen ya validada y achicada. */
  alElegir: (imagen: Blob) => void;
  maximo?: number;
  deshabilitado?: boolean;
  /** Para las pruebas y para distinguir varias casillas en una misma página. */
  nombre?: string;
}) {
  const { t } = useIdioma();
  const archivos = useRef<HTMLInputElement>(null);
  const camaraSistema = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [webcam, setWebcam] = useState(false);

  async function recibir(a: Blob | undefined | null) {
    if (!a) return;
    const malo = imagenAceptable(a);
    if (malo) return setError(t(TEXTO_ERROR[malo] as 'imgTipo'));
    try {
      alElegir(await achicarImagen(a, maximo));
      setError(null);
    } catch (e) {
      console.error('subir imagen: no se pudo leer', e);
      setError(t('imgIlegible'));
    }
  }

  function tomarFoto() {
    setError(null);
    const dedo = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
    if (esCelular(navigator.userAgent, dedo)) camaraSistema.current?.click();
    else setWebcam(true);
  }

  return (
    <div className="subir-imagen" data-subir-imagen={nombre}>
      <div className="fila-botones">
        <button
          type="button"
          className="boton secundario"
          disabled={deshabilitado}
          onClick={() => archivos.current?.click()}
        >
          📁 {t('imgSubir')}
        </button>
        <button type="button" className="boton secundario" disabled={deshabilitado} onClick={tomarFoto}>
          📷 {t('imgFoto')}
        </button>
      </div>
      <input
        ref={archivos}
        type="file"
        accept={ACEPTA_IMAGEN}
        hidden
        aria-label={t('imgSubir')}
        data-archivo-imagen={nombre}
        onChange={(e) => {
          void recibir(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <input
        ref={camaraSistema}
        type="file"
        accept={ACEPTA_IMAGEN}
        capture="environment"
        hidden
        aria-label={t('imgFoto')}
        onChange={(e) => {
          void recibir(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {webcam && (
        <Webcam
          cerrar={() => setWebcam(false)}
          foto={(b) => {
            setWebcam(false);
            void recibir(b);
          }}
          fallo={(e) => {
            setWebcam(false);
            setError(t(TEXTO_ERROR[e] as 'imgTipo'));
          }}
        />
      )}
    </div>
  );
}

/** Ventanita con la cámara web de la computadora y su botón para tomar la foto. */
function Webcam({
  cerrar,
  foto,
  fallo,
}: {
  cerrar: () => void;
  foto: (b: Blob) => void;
  fallo: (e: ErrorCamara) => void;
}) {
  const { t } = useIdioma();
  const video = useRef<HTMLVideoElement>(null);
  const flujo = useRef<MediaStream | null>(null);
  const [lista, setLista] = useState(false);
  const falloRef = useRef(fallo);
  falloRef.current = fallo;

  useEffect(() => {
    let vivo = true;
    if (!navigator.mediaDevices?.getUserMedia) {
      falloRef.current('sin_camara');
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })
      .then((f) => {
        if (!vivo) return f.getTracks().forEach((p) => p.stop());
        flujo.current = f;
        if (video.current) video.current.srcObject = f;
        setLista(true);
      })
      .catch((e) => {
        console.error('subir imagen: cámara', e);
        if (vivo) falloRef.current(errorDeCamara(e));
      });
    return () => {
      vivo = false;
      flujo.current?.getTracks().forEach((p) => p.stop());
    };
  }, []);

  function capturar() {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    const lienzo = document.createElement('canvas');
    lienzo.width = v.videoWidth;
    lienzo.height = v.videoHeight;
    lienzo.getContext('2d')!.drawImage(v, 0, 0);
    lienzo.toBlob((b) => (b ? foto(b) : falloRef.current('otro')), 'image/png');
  }

  return (
    <Modal titulo={t('imgCamaraTitulo')} cerrar={cerrar} ancho={560}>
      <video ref={video} className="subir-imagen-webcam" autoPlay playsInline muted data-webcam />
      <div className="fila-botones">
        <button type="button" className="boton" disabled={!lista} onClick={capturar}>
          📸 {t('imgCapturar')}
        </button>
        <button type="button" className="boton secundario" onClick={cerrar}>
          {t('imgCancelar')}
        </button>
      </div>
    </Modal>
  );
}
