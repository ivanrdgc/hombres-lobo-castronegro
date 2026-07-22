# Registro de bugs de la mesa

Registro vivo de todo lo que Iván reporta jugando. **Norma de trabajo**: cada
reporte se anota aquí ANTES de arreglarlo y se cierra con el commit del
arreglo. Si un bug vuelve, se **reabre la misma entrada** (nada de duplicados):
así queda a la vista cuántas veces se ha reportado y qué se hizo cada vez.

Estados: 🔴 abierto · 🟢 arreglado (con commit) · 🟡 re-reportado tras un arreglo (en verificación)

---

## B1 · Caballero de la Espada Oxidada: devorado en partida de 4 con 1 lobo, no mata a su lobo
- **2026-07-19 · reporte 1.** «No ha matado a su lobo más cercano al amanecer una vez devorado durante la noche.»
  Diagnóstico: la partida se cerraba en ese mismo amanecer con «ganan los lobos» por **paridad**
  (el lobo sentenciado contaba como fuerza lobuna), así que el óxido nunca llegaba a actuar.
- **2026-07-19 · 🟢 arreglado** en `0265ee8`: el lobo sentenciado es un muerto andante — no cuenta
  para la paridad, la partida sigue y el óxido lo reclama al amanecer siguiente. Test de regresión
  con la partida exacta (4 jugadores, 1 lobo).
- **2026-07-20 · 🟡 re-reportado.** Verificado de punta a punta el flujo real desplegado:
  creación del óxido en la cadena de muertes → persistencia en el doc (`Object.assign(game, gameUpdates)`,
  también con día sin linchamiento) → consumo al amanecer siguiente aunque el lobo muerda esa noche.
  Todo correcto en el código actual; test extra «flujo real» añadido. **La partida reportada es
  anterior al despliegue del arreglo** (e20d361 se desplegó el 19). Si vuelve a pasar en una partida
  jugada a partir del 20-07, reabrir con la crónica y el nombre de la mesa.
- **2026-07-20 · 🟡 re-reportado (3ª vez), con crónica.** La crónica lo aclara: el amanecer 1 anuncia
  al caballero devorado y el lobo sigue vivo — que es EXACTAMENTE la regla oficial («el lobo muere
  la noche siguiente», anunciado al amanecer 2), pero ese retardo es invisible en la app y para la
  mesa equivale a «no funciona». Iván descartó también la hipótesis de la mesa redonda: el recorrido
  hacia la izquierda ya da la vuelta (`(idx+d)%n`, con test).
- **2026-07-20 · 🟢 cerrado como REGLA DE LA MESA** (`8fee7ea`): el óxido responde EN EL ACTO —
  el primer lobo hacia la izquierda del caballero muere en el MISMO amanecer, dentro de la cadena de
  muertes (como el disparo del cazador). Desviación deliberada del oficial, decidida tras tres
  reportes idénticos. Se desmonta todo el mecanismo demorado (`caballeroRust`) y la excepción de
  paridad que lo acompañaba; textos del rol actualizados; e2e nuevo `e2e-caballero.mjs` que reproduce
  la partida de la crónica contra la app desplegada.
- **2026-07-21 · 🟡 re-reportado (4ª vez) → era CACHÉ del móvil.** Verificado que ambas URLs servían
  el build nuevo (grep del bundle desplegado) y el e2e en verde; Iván recargó de verdad y confirmó:
  «era cache. Funciona!». Las cabeceras ya eran correctas (html `no-cache`, assets inmutables); el
  culpable fue una pestaña abierta de antes del despliegue. Prevención: el sello del build (fecha y
  hora) ahora está visible al pie de la portada y de la mesa — ante cualquier reporte, comprobar
  primero ese sello.

## B2 · Gaitero: llamaba a los mismos encantados con la misma palabra clave cada noche
- **2026-07-19 · reporte.** Repetir la palabra delataba al encantado de noches anteriores.
- **2026-07-19 · 🟢 arreglado** en `97dd711`: todos los encantados despiertan cada noche (como en el
  juego físico), la palabra se **quema al sonar** y rota desde la reserva al confirmar; la llamada
  falsa crece en proporción.

## B3 · Encantados: la palabra clave rota pero el jugador no se entera
- **2026-07-20 · reporte.** «No queda claro, se debe indicar en la pantalla de confirmación.»
  La palabra nueva solo se veía enterrada en la carta de rol (👁 Mostrar mi rol).
- **2026-07-20 · 🟢 arreglado** (este commit): el panel de encantados avisa antes de confirmar
  («tu palabra queda quemada») y, tras confirmar, muestra la palabra **nueva** en grande mientras
  dura el paso. Igual para los enamorados cuando su palabra rota.

## B4 · Final con solo los enamorados vivos: decía «gana el Pueblo» y Cupido sin crédito
- **2026-07-20 · reporte.** Partida real: Cupido devorado, lobo linchado, quedan los dos enamorados
  (ambos del pueblo) → la pancarta decía «¡El Pueblo ha ganado!». Iván: «si quedan solo los
  enamorados, gana Cupido».
- Causa: la auditoría `e20d361` había cambiado a propósito la etiqueta de la pareja del mismo bando
  («ganan CON su bando»). Iván revierte esa decisión.
- **2026-07-20 · 🟢 arreglado** (este commit): si solo quedan los enamorados, gana el amor sea cual
  sea el bando de la pareja, y la pantalla final acredita a Cupido («la pareja fue obra de sus flechas»).

## B5 · Gaitero: no podía encantarse a sí mismo
- **2026-07-20 · reporte.** Regla general de la mesa: **todo rol puede incluirse a sí mismo salvo
  prohibición oficial expresa** (como el Niño Salvaje con «otro jugador» o el Albino con «uno de sus
  compañeros lobos»).
- **2026-07-20 · 🟢 arreglado** (este commit): el gaitero puede auto-encantarse (entra al círculo de
  encantados con palabra clave propia). Su victoria no lo necesita: exige a todos los **demás** vivos.

## B6 · Cuervo (y otros): no podían señalarse/votarse a sí mismos
- **2026-07-19 · reporte.** Misma regla general que B5.
- **2026-07-19 · 🟢 arreglado** en `97dd711`: vidente, zorro, cuervo, actor y feroz pueden elegirse a
  sí mismos; siguen prohibidos los casos con veto oficial (niño salvaje, albino).

## B7 · Infecto: el infectado no se enteraba de su conversión (y el paso delataba al Infecto)
- **2026-07-21 · reporte.** «Cuando infecta a alguien, se debe despertar a esa persona con palabras
  clave e informarle. La próxima noche tendrá que formar parte de los lobos y despertar cuando lo
  hagan los otros lobos. Para disimular, aunque se decida no infectar, se tiene que llamar a dos
  nombres aleatorios y fingir que esperas a que despierten.»
  Estado previo: la decisión era muda, la víctima se marcaba al amanecer y solo lo descubría si
  abría su carta (👁) — en la práctica, nunca a tiempo; y el silencio de las noches sin infección
  habría delatado el poder si algo hubiera sonado en las noches con ella.
- **2026-07-21 · 🟢 arreglado** (este commit): paso nuevo `infectado` («la llamada de la sangre»)
  justo tras la decisión del Infecto. Con infección: la voz llama SIEMPRE dos palabras (la del
  mordido + un señuelo, en orden sorteado), el mordido ve el panel con su palabra nueva junto al
  botón y confirma; su palabra se quema y rota (kwNext), y la noche siguiente despierta con la
  manada. Sin infección (poder guardado, ya gastado u oculto): suenan dos señuelos con espera
  humana muestreada — indistinguible. Los señuelos del Infecto avanzan desde el FINAL del mazo
  (los de encantados, desde el principio): ninguna palabra suena dos veces. E2E `e2e-infecto.mjs`
  contra la app desplegada + tests de motor y de escena (paridad temporal real/falsa).

## B8 · Al empezar la partida suenan dos audios a la vez (solo la primera locución)
- **2026-07-22 · reporte.** «En algunos casos, suenan dos audios a la vez justo cuando empieza el
  juego (solo la primera locución, luego se arregla).»
  Diagnóstico: la lectura local en voz alta (explicación del lobby o detalle de un rol) no se
  detenía en los dispositivos NO narradores al arrancar la partida: seguía sonando por encima de
  la bienvenida del narrador hasta terminar («luego se arregla»). En el narrador no pasaba: su
  relevo ya corta el audio en seco.
- **2026-07-22 · 🟢 arreglado** (este commit): en cuanto aparece tu partida, TODO dispositivo corta
  su lectura local en curso antes de que el narrador abra la boca.

## B9 · Enamorados: la palabra clave no se renovaba si no había Gaitero (con Infecto sí toca)
- **2026-07-22 · reporte.** «La palabra clave se debe quemar si convive Cupido + un rol que pueda
  usarlas de nuevo como el Gaitero o el Infecto. Se debe mostrar la nueva antes de confirmar, no
  después. Y se deben renovar (ahora no se renueva — parece un bug).»
  Diagnóstico: la reserva de palabra nueva al flechar (kwNext) solo se hacía con GAITERO repartido;
  con Cupido + Infecto (partida del reporte) no se reservaba nada → ni palabra nueva a la vista ni
  renovación al confirmar.
- **2026-07-22 · 🟢 arreglado** (este commit): la reserva se hace si convive cualquier rol que
  pueda volver a llamarlos (Gaitero o Infecto), también con composición secreta que los active
  (para no delatar que no están). La nueva se enseña JUNTO al botón antes de confirmar, como en
  encantados e infectado; sin ningún reutilizador posible, el panel aclara «tu palabra no cambia».
  E2E ampliado: cupido + infecto conviviendo, con la renovación verificada antes del toque.
