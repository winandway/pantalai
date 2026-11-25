// Estudio de reacciones: la página que envuelve al reproductor oficial insertado de Facebook (CANDADO C-FACEBOOK).
// El reproductor de Facebook solo se deja manejar (play, pausa, adelantar, volumen) con su propio código («SDK»).
// Ese código corre AQUÍ, en una página aparte que en el sitio público se sirve desde la dirección secundaria: otro
// origen, sin la sesión ni los datos de Pantalay. Con el Estudio se habla solo por mensajes, y solo con su origen.
import { enlaceFacebook } from '../web/src/logica/estudio';

const PADRES = new Set(['https://pantalay.com', 'https://www.pantalay.com']);

/** El origen del Estudio al que esta página le habla: el público, o el propio (pruebas y local). Nunca otro. */
export function padreFacebook(pedido: string | undefined, propio: string): string {
  return pedido && (PADRES.has(pedido) || pedido === propio) ? pedido : propio;
}

export function cspFacebook(nonce: string, padre: string): string {
  return [
    "default-src 'none'",
    `script-src 'nonce-${nonce}' https://connect.facebook.net`,
    "style-src 'unsafe-inline'",
    'img-src data: https://*.facebook.com https://*.fbcdn.net',
    'connect-src https://*.facebook.com https://connect.facebook.net',
    'frame-src https://www.facebook.com https://web.facebook.com https://staticxx.facebook.com',
    `frame-ancestors 'self' ${padre}`,
    "base-uri 'none'",
    "form-action 'none'",
  ].join('; ');
}

export function paginaFacebook(o: { id: string; reel: boolean; padre: string; nonce: string; es: boolean }) {
  const datos = JSON.stringify({ href: enlaceFacebook(o.id, o.reel), reel: o.reel, padre: o.padre });
  return `<!doctype html>
<html lang="${o.es ? 'es' : 'en'}"><head><meta charset="utf-8"><meta name="robots" content="noindex">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Facebook</title>
<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}
#caja{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);transform-origin:center center;line-height:0}</style></head>
<body><div id="fb-root"></div><div id="caja"></div>
<script nonce="${o.nonce}">
(function(){
  var D=${datos};
  var decir=function(m){m.pantalayFacebook=true;parent.postMessage(m,D.padre)};
  var caja=document.getElementById('caja');
  var r=D.reel?9/16:16/9;
  var base=Math.max(160,Math.round(Math.min(innerWidth||360,(innerHeight||640)*r)));
  var v=document.createElement('div');
  v.className='fb-video';
  v.setAttribute('data-href',D.href);
  v.setAttribute('data-width',String(base));
  v.setAttribute('data-show-text','false');
  v.setAttribute('data-allowfullscreen','false');
  // El código de Facebook crea su marco sin permiso de reproducir con sonido desde afuera: nuestro botón Reproducir
  // solo arrancaba el video en silencio. Se le da el permiso apenas aparece y se vuelve a cargar con él.
  new MutationObserver(function(){
    var f=caja.querySelector('iframe');
    if(!f||/autoplay/.test(f.getAttribute('allow')||''))return;
    f.setAttribute('allow','autoplay; encrypted-media; picture-in-picture');
    if(f.src)f.src=String(f.src);
  }).observe(caja,{childList:true,subtree:true});
  caja.appendChild(v);
  var ajustar=function(){
    var w=caja.offsetWidth,h=caja.offsetHeight;
    if(!w||!h)return;
    caja.style.transform='translate(-50%,-50%) scale('+Math.min(innerWidth/w,innerHeight/h)+')';
  };
  addEventListener('resize',ajustar);
  var listo=false;
  window.fbAsyncInit=function(){
    FB.init({xfbml:true,version:'v21.0'});
    FB.Event.subscribe('xfbml.ready',function(m){
      if(m.type!=='video'||listo)return;
      listo=true;
      var j=m.instance;
      ajustar();
      var n=0,id=setInterval(function(){ajustar();if(++n>10)clearInterval(id)},500);
      j.subscribe('startedPlaying',function(){decir({tipo:'estado',anda:true})});
      j.subscribe('paused',function(){decir({tipo:'estado',anda:false})});
      j.subscribe('finishedPlaying',function(){decir({tipo:'estado',anda:false})});
      j.subscribe('error',function(){decir({tipo:'error'})});
      setInterval(function(){decir({tipo:'tiempo',tiempo:j.getCurrentPosition(),duracion:j.getDuration()})},500);
      addEventListener('message',function(e){
        if(e.origin!==D.padre||!e.data||!e.data.pantalayFacebook)return;
        var o=e.data.orden,x=Number(e.data.valor);
        if(o==='play')j.play();
        else if(o==='pause')j.pause();
        else if(o==='seekTo'&&isFinite(x))j.seek(Math.max(0,x));
        else if(o==='mute')j.mute();
        else if(o==='unMute')j.unmute();
        else if(o==='setVolume'&&isFinite(x))j.setVolume(Math.min(1,Math.max(0,x/100)));
      });
      decir({tipo:'listo'});
    });
  };
  // Privado, borrado o bloqueado: si en 15 segundos no cargó, se avisa (nunca un cuadro negro mudo).
  setTimeout(function(){if(!listo)decir({tipo:'error'})},15000);
})();
</script>
<script nonce="${o.nonce}" async defer crossorigin="anonymous" src="https://connect.facebook.net/${o.es ? 'es_LA' : 'en_US'}/sdk.js"></script>
</body></html>`;
}
