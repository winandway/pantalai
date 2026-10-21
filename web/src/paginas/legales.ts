// Textos legales de Pantalay (21 oct 2026). Escritos para Pantalay, en inglés (el que rige) y en español
// (traducción de cortesía). Cada uno es su propia página con dirección fija, para Google y los buscadores de IA.
// Si cambia cómo funciona el servicio (proveedores, datos, cobro), se actualiza aquí y la fecha de abajo.

export type SeccionLegal = { titulo: string; parrafos: string[] };
export type TextoLegal = { titulo: string; resumen: string; secciones: SeccionLegal[] };
export type Legal = { slug: string; en: TextoLegal; es: TextoLegal };

export const ACTUALIZADO = '2026-10-21';
export const EMPRESA = 'Windoce, LLC';
export const CONTACTO = 'go@windoce.com';

export const LEGALES: Legal[] = [
  {
    slug: 'terms',
    en: {
      titulo: 'Terms of Service',
      resumen:
        'The agreement between you and Windoce, LLC for using Pantalay: accounts, your content, plans and billing, cancellations, and our responsibilities.',
      secciones: [
        {
          titulo: '1. Who we are and what this covers',
          parrafos: [
            'Pantalay is a screen and camera recorder that works in your web browser and lets you share recordings with a link. Pantalay is operated by Windoce, LLC, a Delaware limited liability company with operations in Novi, Michigan, United States (“Windoce”, “we”, “us”).',
            'These Terms apply to pantalay.com, the recorder, the video pages, the embedded player, our emails and any other part of the service (together, the “Service”). By creating an account or using the Service you accept these Terms, our Privacy Policy, our Acceptable Use Policy and our Cookie Policy. If you use Pantalay for a company, you confirm you can accept these Terms on its behalf.',
          ],
        },
        {
          titulo: '2. Your account',
          parrafos: [
            'You must be at least 13 years old (16 in the European Economic Area and the United Kingdom) to use Pantalay. Give us accurate information, keep your password private and tell us right away if you believe someone else accessed your account. You are responsible for what happens under your account.',
            'One person per account. Accounts created by bots or to get around limits or suspensions are not allowed.',
          ],
        },
        {
          titulo: '3. Your content belongs to you',
          parrafos: [
            'Your recordings, thumbnails, titles, descriptions, transcripts, comments and anything else you upload or create (“Your Content”) remain yours. We do not claim ownership of it.',
            'To run the Service you give Windoce a worldwide, non-exclusive, royalty-free license to store, copy, process, transcode, transcribe, analyze with AI tools you turn on, display and deliver Your Content only as needed to provide, secure and improve the Service for you and for the people you share it with. This license ends when you delete Your Content, except for copies in backups that are erased on their normal schedule and anything needed to comply with the law.',
            'You confirm you have the rights to everything you record and share, including the consent of people who appear or are heard in your recordings when the law requires it.',
          ],
        },
        {
          titulo: '4. Sharing and privacy settings',
          parrafos: [
            'Each video has its own setting. “Anyone with the link” means any person who has the link can watch it, and may forward it. “Only me” keeps it private to your account. You choose whether viewers can comment or download. If you embed a video on another website, it follows the same setting.',
          ],
        },
        {
          titulo: '5. AI features',
          parrafos: [
            'Some plans include AI tools such as transcription, titles, summaries, chapters and documents generated from your video. AI results can contain mistakes: review them before relying on them. Your Content is sent to our AI providers only to produce the result you asked for, and is not used by us to train AI models.',
          ],
        },
        {
          titulo: '6. Plans, billing and renewals',
          parrafos: [
            'The Starter plan is free and has limits (for example, a number of videos and minutes per recording) shown on our pricing page. Paid plans are subscriptions billed in advance, monthly or yearly, in U.S. dollars, through our payment processor Stripe. We never see or store your full card number.',
            'Your subscription renews automatically at the end of each period at the price in effect for you until you cancel. Founder pricing, when offered, stays with your subscription for as long as it remains active without interruption.',
            'If a free trial is offered, your card is charged when the trial ends unless you cancel before. If a payment fails, we will try again and tell you by email; if it keeps failing, your account goes back to the free plan.',
            'Prices may change in the future. We will tell you at least 30 days in advance, and the new price applies from your next renewal.',
            'Taxes that apply to your purchase are added where required.',
          ],
        },
        {
          titulo: '7. Cancellations and refunds',
          parrafos: [
            'You can cancel anytime from your account. You keep your paid features until the end of the period you already paid for, and then your account moves to the free plan; your videos are kept, subject to the free plan limits for new recordings.',
            'Payments are non-refundable, including for partially used periods, except where the law requires a refund or where we decide to offer one. If you think you were charged by mistake, write to us within 30 days.',
          ],
        },
        {
          titulo: '8. Rules of use',
          parrafos: [
            'You agree to follow our Acceptable Use Policy. We may remove content, limit features, suspend or close accounts that break these Terms or the law, that put other people or the Service at risk, or when the law requires it. When reasonable, we will tell you why.',
          ],
        },
        {
          titulo: '9. Copyright complaints',
          parrafos: [
            `If you believe content on Pantalay infringes your copyright, send a notice to ${CONTACTO} with: your contact details; the work you believe was infringed; the link to the content on Pantalay; a statement that you have a good-faith belief the use is not authorized; a statement, under penalty of perjury, that the information is accurate and that you are the owner or are authorized to act for the owner; and your physical or electronic signature.`,
            'If your content was removed and you believe it was a mistake, you may send a counter-notice with the same details. We close the accounts of repeat infringers.',
          ],
        },
        {
          titulo: '10. Our service and changes',
          parrafos: [
            'We work to keep Pantalay available, fast and safe, but we cannot promise it will never be interrupted. We may add, change or remove features. If we remove a paid feature you rely on, we will give you notice and, when fair, a prorated credit.',
            'Keep your own copy of anything important. You can download your videos as MP4 at any time while your account is active.',
          ],
        },
        {
          titulo: '11. Closing your account',
          parrafos: [
            'You can stop using Pantalay at any time and ask us to delete your account. When an account is closed, we delete its videos and personal data within 30 days, except what we must keep by law (for example, billing records).',
          ],
        },
        {
          titulo: '12. Disclaimers',
          parrafos: [
            'The Service is provided “as is” and “as available”. To the extent the law allows, Windoce disclaims all warranties, express or implied, including merchantability, fitness for a particular purpose and non-infringement.',
          ],
        },
        {
          titulo: '13. Limitation of liability',
          parrafos: [
            'To the extent the law allows, Windoce will not be liable for indirect, incidental, special, consequential or punitive damages, or for lost profits, revenue or data. Our total liability for any claim related to the Service is limited to the greater of the amount you paid us in the 12 months before the claim or 100 U.S. dollars. Some places do not allow these limits, so they may not apply to you.',
          ],
        },
        {
          titulo: '14. Indemnity',
          parrafos: [
            'If someone makes a claim against Windoce because of Your Content or your breach of these Terms, you agree to cover the reasonable costs, damages and legal fees that result, to the extent the law allows.',
          ],
        },
        {
          titulo: '15. Law and disputes',
          parrafos: [
            'These Terms are governed by the laws of the State of Delaware, United States, without regard to its conflict-of-law rules. Before any formal claim, write to us so we can try to solve it in good faith within 30 days. Any dispute that cannot be solved that way will be heard in the state or federal courts located in Delaware, unless the law of the country where you live gives you the right to go to your local courts.',
          ],
        },
        {
          titulo: '16. Changes to these Terms',
          parrafos: [
            'We may update these Terms. If a change is important, we will tell you by email or in the Service at least 15 days before it takes effect. If you keep using Pantalay after that, you accept the new version.',
          ],
        },
        {
          titulo: '17. Contact',
          parrafos: [`Windoce, LLC · Novi, Michigan, United States · ${CONTACTO}`],
        },
      ],
    },
    es: {
      titulo: 'Términos del servicio',
      resumen:
        'El acuerdo entre tú y Windoce, LLC para usar Pantalay: cuentas, tu contenido, planes y cobros, cancelaciones y nuestras responsabilidades.',
      secciones: [
        {
          titulo: 'Sobre esta traducción',
          parrafos: [
            'Esta es una traducción de cortesía. Si hay alguna diferencia, rige la versión en inglés.',
          ],
        },
        {
          titulo: '1. Quiénes somos y qué cubre esto',
          parrafos: [
            'Pantalay es un grabador de pantalla y cámara que funciona en el navegador y te deja compartir tus grabaciones con un enlace. Pantalay lo opera Windoce, LLC, una compañía de responsabilidad limitada de Delaware con operación en Novi, Michigan, Estados Unidos («Windoce», «nosotros»).',
            'Estos Términos aplican a pantalay.com, al grabador, a las páginas de los videos, al reproductor insertado, a nuestros correos y a cualquier otra parte del servicio (el «Servicio»). Al crear una cuenta o usar el Servicio aceptas estos Términos, la Política de privacidad, la Política de uso aceptable y la Política de cookies. Si usas Pantalay para una empresa, confirmas que puedes aceptarlos en su nombre.',
          ],
        },
        {
          titulo: '2. Tu cuenta',
          parrafos: [
            'Debes tener al menos 13 años (16 en el Espacio Económico Europeo y el Reino Unido). Danos datos reales, guarda tu contraseña y avísanos de inmediato si crees que alguien entró a tu cuenta. Eres responsable de lo que pase en ella.',
            'Una persona por cuenta. No se permiten cuentas creadas por robots ni para saltarse límites o suspensiones.',
          ],
        },
        {
          titulo: '3. Tu contenido es tuyo',
          parrafos: [
            'Tus grabaciones, miniaturas, títulos, descripciones, transcripciones, comentarios y todo lo que subas o crees («Tu Contenido») siguen siendo tuyos. No reclamamos su propiedad.',
            'Para que el Servicio funcione le das a Windoce una licencia mundial, no exclusiva y gratuita para guardar, copiar, procesar, convertir, transcribir, analizar con las herramientas de IA que tú actives, mostrar y entregar Tu Contenido, solo en lo necesario para darte el Servicio, protegerlo y mejorarlo, a ti y a las personas con quienes lo compartes. La licencia termina cuando borras Tu Contenido, salvo las copias de respaldo que se borran en su ciclo normal y lo que la ley obligue a conservar.',
            'Confirmas que tienes los derechos sobre todo lo que grabas y compartes, incluido el permiso de las personas que salen o se oyen en tus grabaciones cuando la ley lo exige.',
          ],
        },
        {
          titulo: '4. Compartir y privacidad de cada video',
          parrafos: [
            'Cada video tiene su ajuste. «Cualquiera con el enlace» significa que cualquier persona con el enlace puede verlo y reenviarlo. «Solo yo» lo deja privado en tu cuenta. Tú eliges si se puede comentar o descargar. Si insertas un video en otra página, sigue el mismo ajuste.',
          ],
        },
        {
          titulo: '5. Funciones de IA',
          parrafos: [
            'Algunos planes incluyen herramientas de IA, como transcripción, títulos, resúmenes, capítulos y documentos hechos a partir del video. Los resultados de la IA pueden tener errores: revísalos antes de confiar en ellos. Tu Contenido se envía a nuestros proveedores de IA solo para producir el resultado que pediste, y no lo usamos para entrenar modelos de IA.',
          ],
        },
        {
          titulo: '6. Planes, cobros y renovaciones',
          parrafos: [
            'El plan Starter es gratis y tiene límites (por ejemplo, cantidad de videos y minutos por grabación) que se ven en la página de precios. Los planes pagos son suscripciones que se cobran por adelantado, cada mes o cada año, en dólares, a través de nuestro procesador de pagos Stripe. Nunca vemos ni guardamos el número completo de tu tarjeta.',
            'La suscripción se renueva sola al final de cada período, al precio que tengas, hasta que la canceles. El precio de fundador, cuando se ofrece, se mantiene mientras la suscripción siga activa sin interrupción.',
            'Si se ofrece una prueba gratis, la tarjeta se cobra al terminar la prueba, salvo que canceles antes. Si un pago falla, lo intentamos otra vez y te avisamos por correo; si sigue fallando, tu cuenta vuelve al plan gratis.',
            'Los precios pueden cambiar en el futuro. Te avisamos con al menos 30 días, y el precio nuevo aplica desde tu próxima renovación.',
            'Se suman los impuestos que correspondan donde la ley lo pida.',
          ],
        },
        {
          titulo: '7. Cancelaciones y reembolsos',
          parrafos: [
            'Puedes cancelar cuando quieras desde tu cuenta. Conservas las funciones pagas hasta el final del período que ya pagaste y después tu cuenta pasa al plan gratis; tus videos se conservan, y las grabaciones nuevas siguen los límites del plan gratis.',
            'Los pagos no son reembolsables, tampoco por períodos usados a medias, salvo que la ley obligue a reembolsar o que decidamos hacerlo. Si crees que te cobramos por error, escríbenos dentro de los 30 días.',
          ],
        },
        {
          titulo: '8. Reglas de uso',
          parrafos: [
            'Aceptas cumplir la Política de uso aceptable. Podemos quitar contenido, limitar funciones, suspender o cerrar cuentas que rompan estos Términos o la ley, que pongan en riesgo a otras personas o al Servicio, o cuando la ley lo exija. Cuando sea razonable, te diremos por qué.',
          ],
        },
        {
          titulo: '9. Reclamos de derechos de autor',
          parrafos: [
            `Si crees que un contenido en Pantalay infringe tus derechos de autor, escribe a ${CONTACTO} con: tus datos de contacto; la obra que crees infringida; el enlace al contenido en Pantalay; una declaración de que crees de buena fe que el uso no está autorizado; una declaración, bajo pena de perjurio, de que la información es correcta y de que eres el titular o estás autorizado a actuar por él; y tu firma física o electrónica.`,
            'Si quitamos tu contenido y crees que fue un error, puedes mandar una contranotificación con los mismos datos. Cerramos las cuentas de quienes infringen de forma repetida.',
          ],
        },
        {
          titulo: '10. Nuestro servicio y sus cambios',
          parrafos: [
            'Trabajamos para que Pantalay esté disponible, rápido y seguro, pero no podemos prometer que nunca se interrumpa. Podemos agregar, cambiar o quitar funciones. Si quitamos una función paga que usas, te avisamos antes y, cuando sea justo, te damos un crédito proporcional.',
            'Guarda tu propia copia de lo importante. Puedes descargar tus videos en MP4 en cualquier momento mientras tu cuenta esté activa.',
          ],
        },
        {
          titulo: '11. Cerrar tu cuenta',
          parrafos: [
            'Puedes dejar de usar Pantalay cuando quieras y pedirnos que borremos tu cuenta. Al cerrarse una cuenta, borramos sus videos y datos personales dentro de los 30 días, salvo lo que la ley nos obligue a guardar (por ejemplo, los registros de facturación).',
          ],
        },
        {
          titulo: '12. Garantías',
          parrafos: [
            'El Servicio se ofrece «tal cual» y «según disponibilidad». En la medida que la ley lo permita, Windoce no da garantías, expresas ni implícitas, incluidas las de comerciabilidad, idoneidad para un fin concreto y no infracción.',
          ],
        },
        {
          titulo: '13. Límite de responsabilidad',
          parrafos: [
            'En la medida que la ley lo permita, Windoce no responde por daños indirectos, incidentales, especiales, consecuentes o punitivos, ni por pérdida de ganancias, ingresos o datos. Nuestra responsabilidad total por cualquier reclamo sobre el Servicio se limita al mayor entre lo que nos pagaste en los 12 meses anteriores al reclamo y 100 dólares. Algunos lugares no permiten estos límites, así que puede que no te apliquen.',
          ],
        },
        {
          titulo: '14. Indemnidad',
          parrafos: [
            'Si alguien le hace un reclamo a Windoce por Tu Contenido o por que no cumpliste estos Términos, aceptas cubrir los costos, daños y honorarios legales razonables que resulten, en la medida que la ley lo permita.',
          ],
        },
        {
          titulo: '15. Ley y conflictos',
          parrafos: [
            'Estos Términos se rigen por las leyes del Estado de Delaware, Estados Unidos, sin aplicar sus reglas de conflicto de leyes. Antes de un reclamo formal, escríbenos para intentar resolverlo de buena fe en 30 días. Lo que no se resuelva así se verá en los tribunales estatales o federales de Delaware, salvo que la ley del país donde vives te dé derecho a acudir a tus tribunales locales.',
          ],
        },
        {
          titulo: '16. Cambios a estos Términos',
          parrafos: [
            'Podemos actualizar estos Términos. Si el cambio es importante, te avisamos por correo o dentro del Servicio al menos 15 días antes de que aplique. Si sigues usando Pantalay después, aceptas la versión nueva.',
          ],
        },
        {
          titulo: '17. Contacto',
          parrafos: [`Windoce, LLC · Novi, Michigan, Estados Unidos · ${CONTACTO}`],
        },
      ],
    },
  },
  {
    slug: 'privacy',
    en: {
      titulo: 'Privacy Policy',
      resumen:
        'What personal data Pantalay collects, why, who processes it, how long we keep it, and how to access, export or delete it.',
      secciones: [
        {
          titulo: 'The short version',
          parrafos: [
            'We collect what we need to record, store and share your videos and to keep your account safe. We do not sell your data, we do not show ads, and we do not use your videos to train AI models. You can download or delete your data at any time.',
          ],
        },
        {
          titulo: '1. Who is responsible',
          parrafos: [
            `Windoce, LLC (Novi, Michigan, United States) is the controller of the personal data described here. Contact: ${CONTACTO}.`,
          ],
        },
        {
          titulo: '2. What we collect',
          parrafos: [
            'Account data: your name, email address and a protected (hashed) version of your password. We never store your password in plain text.',
            'Your Content: the videos you record, their thumbnails, titles, descriptions, transcripts, chapters, edits, comments and reactions. Recordings can include your image, your voice and whatever appears on your screen, so choose carefully what you share.',
            'Viewer data: when someone watches a shared video we record that a view happened and roughly how much was watched, to show you viewer insights. Viewers who comment give us the name they write.',
            'Billing data: if you buy a plan, Stripe processes your payment. We receive your customer and subscription identifiers, your plan, the amounts and the invoice links — not your full card number.',
            'Technical and security data: IP address, browser type and errors that happen in the recorder. We use them to protect accounts (for example, limiting login attempts), stop abuse and fix problems.',
          ],
        },
        {
          titulo: '3. Why we use it',
          parrafos: [
            'To provide the Service you asked for (our contract with you); to keep it secure and prevent fraud and abuse (our legitimate interest); to send you account and billing emails such as welcome, password recovery, receipts and payment issues (contract); to comply with the law (legal obligation). We only send marketing emails if you agree, and you can unsubscribe at any time.',
          ],
        },
        {
          titulo: '4. Who processes it for us',
          parrafos: [
            'We use a small number of trusted providers that process data only on our instructions: Cloudflare (hosting, storage of videos, network security and the speech-to-text model that creates transcripts); Google (the Gemini model that writes titles, summaries, chapters and documents when you use AI features, and the web fonts our pages load); Stripe (payments); YaDominios Cloud (our hosting and email platform). We may also share data if the law requires it, to protect people from harm, or as part of a merger or sale of the business, with notice to you.',
            'We never sell or rent personal data, and we do not share it for advertising.',
          ],
        },
        {
          titulo: '5. How long we keep it',
          parrafos: [
            'Your videos and account data are kept while your account is active and deleted within 30 days after you delete them or close your account. Security records (such as login attempts) are kept for a short time, usually less than 30 days. Billing records are kept as long as tax law requires.',
          ],
        },
        {
          titulo: '6. Your rights',
          parrafos: [
            `You can access and correct your data in your account, download your videos as MP4, and delete videos or your entire account. Depending on where you live (for example, the European Union, the United Kingdom or California), you may also have the right to receive a copy of your data, object to or restrict some uses, and complain to a data protection authority. Write to ${CONTACTO} and we will answer within 30 days. We do not discriminate against anyone for using these rights.`,
          ],
        },
        {
          titulo: '7. Security',
          parrafos: [
            'Connections are encrypted (HTTPS), passwords are hashed, sessions are protected, login attempts are limited and access to the administration of the Service is restricted and logged. No system is perfectly secure; if a breach affects your data, we will tell you as the law requires.',
          ],
        },
        {
          titulo: '8. International transfers',
          parrafos: [
            'We are based in the United States and our providers operate worldwide, so your data may be processed outside your country. When the law requires it, we rely on safeguards such as the European Commission’s standard contractual clauses.',
          ],
        },
        {
          titulo: '9. Children',
          parrafos: [
            'Pantalay is not for children under 13 (16 in the EEA and the UK). If you believe a child gave us personal data, contact us and we will delete it.',
          ],
        },
        {
          titulo: '10. Changes',
          parrafos: [
            'If we change this policy in a way that matters, we will tell you by email or in the Service before it takes effect.',
          ],
        },
      ],
    },
    es: {
      titulo: 'Política de privacidad',
      resumen:
        'Qué datos personales recoge Pantalay, para qué, quién los procesa, cuánto tiempo los guardamos y cómo verlos, descargarlos o borrarlos.',
      secciones: [
        {
          titulo: 'Sobre esta traducción',
          parrafos: [
            'Esta es una traducción de cortesía. Si hay alguna diferencia, rige la versión en inglés.',
          ],
        },
        {
          titulo: 'En pocas palabras',
          parrafos: [
            'Recogemos lo necesario para grabar, guardar y compartir tus videos y para proteger tu cuenta. No vendemos tus datos, no mostramos publicidad y no usamos tus videos para entrenar modelos de IA. Puedes descargar o borrar tus datos cuando quieras.',
          ],
        },
        {
          titulo: '1. Quién es el responsable',
          parrafos: [
            `Windoce, LLC (Novi, Michigan, Estados Unidos) es responsable de los datos personales descritos aquí. Contacto: ${CONTACTO}.`,
          ],
        },
        {
          titulo: '2. Qué recogemos',
          parrafos: [
            'Datos de la cuenta: tu nombre, tu correo y una versión protegida (cifrada en un solo sentido) de tu contraseña. Nunca guardamos la contraseña tal cual.',
            'Tu Contenido: los videos que grabas, sus miniaturas, títulos, descripciones, transcripciones, capítulos, ediciones, comentarios y reacciones. Las grabaciones pueden incluir tu imagen, tu voz y lo que aparezca en tu pantalla, así que elige bien lo que compartes.',
            'Datos de quien mira: cuando alguien ve un video compartido anotamos que hubo una vista y cuánto se vio aproximadamente, para mostrarte las estadísticas. Quien comenta nos da el nombre que escribe.',
            'Datos de cobro: si compras un plan, Stripe procesa el pago. Recibimos los identificadores de cliente y suscripción, tu plan, los montos y los enlaces de las facturas, no el número completo de la tarjeta.',
            'Datos técnicos y de seguridad: dirección IP, tipo de navegador y errores que ocurran en el grabador. Los usamos para proteger las cuentas (por ejemplo, limitar los intentos de entrar), frenar abusos y arreglar problemas.',
          ],
        },
        {
          titulo: '3. Para qué los usamos',
          parrafos: [
            'Para darte el Servicio que pediste (nuestro contrato contigo); para mantenerlo seguro y evitar fraudes y abusos (interés legítimo); para mandarte los correos de la cuenta y de cobro, como la bienvenida, la recuperación de contraseña, los recibos y los avisos de pago (contrato); y para cumplir la ley (obligación legal). Solo mandamos correos de promoción si lo aceptas, y puedes darte de baja cuando quieras.',
          ],
        },
        {
          titulo: '4. Quién los procesa por nosotros',
          parrafos: [
            'Usamos pocos proveedores de confianza que procesan los datos solo según nuestras instrucciones: Cloudflare (alojamiento, almacenamiento de los videos, seguridad de la red y el modelo de voz a texto que hace las transcripciones); Google (el modelo Gemini que escribe títulos, resúmenes, capítulos y documentos cuando usas la IA, y las fuentes tipográficas que cargan nuestras páginas); Stripe (pagos); y YaDominios Cloud (nuestra plataforma de alojamiento y correo). También podemos compartir datos si la ley lo exige, para proteger a alguien de un daño, o en una fusión o venta del negocio, con aviso previo.',
            'Nunca vendemos ni alquilamos datos personales, y no los compartimos para publicidad.',
          ],
        },
        {
          titulo: '5. Cuánto tiempo los guardamos',
          parrafos: [
            'Tus videos y los datos de la cuenta se guardan mientras la cuenta esté activa y se borran dentro de los 30 días después de que los borres o cierres la cuenta. Los registros de seguridad (como los intentos de entrar) se guardan poco tiempo, normalmente menos de 30 días. Los registros de facturación se guardan lo que pida la ley tributaria.',
          ],
        },
        {
          titulo: '6. Tus derechos',
          parrafos: [
            `Puedes ver y corregir tus datos en tu cuenta, descargar tus videos en MP4 y borrar videos o toda la cuenta. Según dónde vivas (por ejemplo, la Unión Europea, el Reino Unido o California), también puedes pedir una copia de tus datos, oponerte a algunos usos o limitarlos, y reclamar ante una autoridad de protección de datos. Escribe a ${CONTACTO} y respondemos en 30 días. No tratamos peor a nadie por usar estos derechos.`,
          ],
        },
        {
          titulo: '7. Seguridad',
          parrafos: [
            'Las conexiones van cifradas (HTTPS), las contraseñas se guardan protegidas, las sesiones están resguardadas, los intentos de entrar tienen límite y el acceso a la administración del Servicio es restringido y queda registrado. Ningún sistema es perfecto; si una brecha afecta tus datos, te avisamos como lo pida la ley.',
          ],
        },
        {
          titulo: '8. Transferencias internacionales',
          parrafos: [
            'Estamos en Estados Unidos y nuestros proveedores operan en todo el mundo, así que tus datos pueden procesarse fuera de tu país. Cuando la ley lo exige, usamos garantías como las cláusulas contractuales tipo de la Comisión Europea.',
          ],
        },
        {
          titulo: '9. Menores',
          parrafos: [
            'Pantalay no es para menores de 13 años (16 en el EEE y el Reino Unido). Si crees que un menor nos dio datos personales, escríbenos y los borramos.',
          ],
        },
        {
          titulo: '10. Cambios',
          parrafos: [
            'Si cambiamos esta política en algo importante, te avisamos por correo o dentro del Servicio antes de que aplique.',
          ],
        },
      ],
    },
  },
  {
    slug: 'acceptable-use',
    en: {
      titulo: 'Acceptable Use Policy',
      resumen:
        'What you can’t record, upload or share on Pantalay, and what happens if someone breaks the rules.',
      secciones: [
        {
          titulo: 'Use Pantalay to communicate, not to cause harm',
          parrafos: [
            'This policy applies to everything on Pantalay: videos, thumbnails, titles, transcripts, comments and links. It is part of our Terms of Service.',
          ],
        },
        {
          titulo: 'Not allowed',
          parrafos: [
            'Any content that sexually exploits or endangers children. We report it to the authorities.',
            'Pornography or sexually explicit content, and any intimate image shared without the consent of the person in it.',
            'Violence, threats, harassment, bullying, or hate against people for who they are.',
            'Promoting terrorism, violent extremism, self-harm, or illegal goods and services.',
            'Content you don’t have the rights to, such as movies, shows, music or courses you don’t own, or recordings of people made against the law.',
            'Private or confidential information of others (for example, IDs, financial data or medical records) shared without permission.',
            'Fraud, scams, phishing, impersonating someone, or misleading people about who you are.',
            'Malware, or links meant to harm devices or steal accounts.',
            'Spam, or using Pantalay to send unwanted bulk messages.',
          ],
        },
        {
          titulo: 'Don’t abuse the Service',
          parrafos: [
            'Don’t try to break into accounts or our systems, test our security without written permission, get around plan limits or suspensions, overload the Service, use bots to create accounts, or scrape other people’s content. Don’t use our AI features to create content that breaks this policy.',
          ],
        },
        {
          titulo: 'What happens if the rules are broken',
          parrafos: [
            'We can remove content, turn off sharing, suspend or close accounts, and block access from networks used for abuse. Serious cases (like child safety) lead to immediate closure and a report to the authorities. If you think we made a mistake, write to us and we will review it.',
          ],
        },
        {
          titulo: 'Report something',
          parrafos: [
            `If you see something on Pantalay that breaks this policy, write to ${CONTACTO} with the link.`,
          ],
        },
      ],
    },
    es: {
      titulo: 'Política de uso aceptable',
      resumen:
        'Lo que no puedes grabar, subir ni compartir en Pantalay, y qué pasa si alguien rompe las reglas.',
      secciones: [
        {
          titulo: 'Sobre esta traducción',
          parrafos: [
            'Esta es una traducción de cortesía. Si hay alguna diferencia, rige la versión en inglés.',
          ],
        },
        {
          titulo: 'Usa Pantalay para comunicar, no para hacer daño',
          parrafos: [
            'Esta política aplica a todo en Pantalay: videos, miniaturas, títulos, transcripciones, comentarios y enlaces. Es parte de los Términos del servicio.',
          ],
        },
        {
          titulo: 'No se permite',
          parrafos: [
            'Cualquier contenido que explote sexualmente a menores o los ponga en peligro. Lo denunciamos a las autoridades.',
            'Pornografía o contenido sexual explícito, y cualquier imagen íntima compartida sin el permiso de la persona que aparece.',
            'Violencia, amenazas, acoso o discurso de odio contra personas por lo que son.',
            'Promover el terrorismo, el extremismo violento, las autolesiones o productos y servicios ilegales.',
            'Contenido sobre el que no tienes derechos, como películas, series, música o cursos que no son tuyos, o grabaciones de personas hechas en contra de la ley.',
            'Información privada o confidencial de otros (por ejemplo, documentos de identidad, datos financieros o médicos) compartida sin permiso.',
            'Fraudes, estafas, robo de datos, hacerse pasar por otra persona o engañar sobre quién eres.',
            'Programas maliciosos o enlaces para dañar equipos o robar cuentas.',
            'Spam, o usar Pantalay para mandar mensajes masivos que nadie pidió.',
          ],
        },
        {
          titulo: 'No abuses del Servicio',
          parrafos: [
            'No intentes entrar a cuentas ajenas ni a nuestros sistemas, probar nuestra seguridad sin permiso escrito, saltarte los límites del plan o una suspensión, sobrecargar el Servicio, crear cuentas con robots ni copiar en masa el contenido de otros. No uses la IA para crear contenido que rompa esta política.',
          ],
        },
        {
          titulo: 'Qué pasa si se rompen las reglas',
          parrafos: [
            'Podemos quitar contenido, apagar el compartir, suspender o cerrar cuentas y bloquear el acceso desde redes usadas para abusos. Los casos graves (como la seguridad de menores) llevan al cierre inmediato y a una denuncia ante las autoridades. Si crees que nos equivocamos, escríbenos y lo revisamos.',
          ],
        },
        {
          titulo: 'Denunciar algo',
          parrafos: [`Si ves algo en Pantalay que rompe esta política, escribe a ${CONTACTO} con el enlace.`],
        },
      ],
    },
  },
  {
    slug: 'cookies',
    en: {
      titulo: 'Cookie Policy',
      resumen:
        'Pantalay uses one essential cookie to keep you signed in. No advertising or tracking cookies.',
      secciones: [
        {
          titulo: 'One cookie, and only because you need it',
          parrafos: [
            'Pantalay uses a single cookie of its own, “pantalai_sesion”, to keep you signed in. It is essential, it is protected so page scripts can’t read it, and it lasts up to 30 days or until you log out. Without it you couldn’t use your account, so it doesn’t need consent.',
            'We don’t use advertising cookies, and we don’t use third-party analytics or tracking.',
          ],
        },
        {
          titulo: 'What your browser saves for convenience',
          parrafos: [
            'Your browser also keeps, on your device only, your language choice and a draft of forms you are filling in, so nothing you write gets lost if the page closes. Drafts never include passwords or card details, and they are erased when you save, cancel or log out.',
          ],
        },
        {
          titulo: 'Our providers',
          parrafos: [
            'When you pay, Stripe’s payment form may set its own cookies to prevent fraud. When a security check appears on sign-up or log-in, Cloudflare may set a cookie to tell people from bots. Our pages load fonts from Google Fonts, which receives your IP address to deliver them. Each provider handles that data under its own privacy policy.',
          ],
        },
        {
          titulo: 'How to control them',
          parrafos: [
            'You can delete or block cookies in your browser’s settings. If you block the session cookie, you won’t be able to log in.',
          ],
        },
      ],
    },
    es: {
      titulo: 'Política de cookies',
      resumen:
        'Pantalay usa una sola cookie esencial para mantener tu sesión abierta. Nada de cookies de publicidad ni de rastreo.',
      secciones: [
        {
          titulo: 'Sobre esta traducción',
          parrafos: [
            'Esta es una traducción de cortesía. Si hay alguna diferencia, rige la versión en inglés.',
          ],
        },
        {
          titulo: 'Una cookie, y solo porque hace falta',
          parrafos: [
            'Pantalay usa una sola cookie propia, «pantalai_sesion», para mantener tu sesión abierta. Es esencial, está protegida para que los programas de la página no puedan leerla y dura hasta 30 días o hasta que salgas. Sin ella no podrías usar tu cuenta, por eso no necesita permiso.',
            'No usamos cookies de publicidad ni herramientas de análisis o rastreo de terceros.',
          ],
        },
        {
          titulo: 'Lo que tu navegador guarda para tu comodidad',
          parrafos: [
            'Tu navegador también guarda, solo en tu equipo, el idioma que elegiste y un borrador de los formularios que estás llenando, para que no pierdas lo escrito si la página se cierra. Los borradores nunca incluyen contraseñas ni datos de tarjeta, y se borran al guardar, cancelar o salir.',
          ],
        },
        {
          titulo: 'Nuestros proveedores',
          parrafos: [
            'Cuando pagas, el formulario de pago de Stripe puede poner sus propias cookies para evitar fraudes. Cuando aparece una comprobación de seguridad al crear la cuenta o entrar, Cloudflare puede poner una cookie para distinguir personas de robots. Nuestras páginas cargan fuentes de Google Fonts, que recibe tu dirección IP para entregarlas. Cada proveedor trata esos datos según su propia política de privacidad.',
          ],
        },
        {
          titulo: 'Cómo controlarlas',
          parrafos: [
            'Puedes borrar o bloquear las cookies en los ajustes de tu navegador. Si bloqueas la cookie de sesión, no podrás entrar a tu cuenta.',
          ],
        },
      ],
    },
  },
];

export function legalPorSlug(slug: string): Legal | undefined {
  return LEGALES.find((l) => l.slug === slug);
}
