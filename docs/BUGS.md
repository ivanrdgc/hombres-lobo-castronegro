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
- **2026-07-22 · afinado por Iván (2 reglas).** (1) La llamada pasa a UNA sola palabra — real o
  señuelo — «todos saben los motivos, no hace falta llamar a 2»; el compás real/falso no cambia.
  (2) Regla general de renovación: **rotar solo si otro rol podría volver a llamar al mismo
  jugador**. El mordisco es la última llamada posible del propio Infecto, así que la palabra del
  mordido solo rota si además juega el Gaitero (o la composición secreta lo activa); sin
  reutilizador, su panel aclara «tu palabra no cambia».

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
- **2026-07-22 · re-reportado («la palabra debe cambiar con cupido + infecto») → verificado.**
  El arreglo ya estaba desplegado en ambas URLs: e2e en verde también contra producción (los dos
  enamorados ven su palabra nueva antes de confirmar). Si se vio otra cosa, comprobar el sello del
  build al pie (pestaña antigua).

## B10 · Una Noche · Modal del mazo: los botones +/− ocupaban 3/4 del ancho y tapaban la ℹ️
- **2026-07-22 · reporte.** «El modal de elección de mazo se ve mal: los botones de selección de
  número de cartas ocupan 3/4 partes del ancho.» + «Muestra la i de info en cada carta al crear el
  mazo.» (Ambos son el MISMO bug de maquetación.)
  Diagnóstico: el stepper de cada carta (ℹ️ − nº +) usaba la clase `.btnrow`, cuya regla global
  `.btnrow button { flex:1; min-width:130px }` (pensada para botones de acción a ancho completo)
  estiraba cada botón a 130px; con 4 botones eso desbordaba la fila en el móvil, hacía `flex-wrap`
  y empujaba la ℹ️ a otra línea (por eso «no se veía»).
- **2026-07-22 · 🟢 arreglado** (este commit): el stepper deja de usar `.btnrow` y usa una clase
  propia `.stepper` (flex compacto, `flex:0 0 auto`), así sus botones ya no heredan el estirado.
  La ℹ️ vuelve a ser visible en cada fila. De paso, Una Noche pasa al 2º puesto del catálogo
  (SpyFall queda 3º).

## B11 · iPhone sin voz: síntesis 403 al entrar por `*.firebaseapp.com`
- **2026-07-23 · reporte.** Diagnóstico de voz en iPhone: clave presente, desbloqueo OK, pero
  «síntesis 403 … Requests from referer https://jd-….firebaseapp.com/ are blocked
  (API_KEY_HTTP_REFERRER_BLOCKED)».
  Diagnóstico: cada site de Firebase Hosting responde en DOS dominios (`<site>.web.app` y
  `<site>.firebaseapp.com`), pero la clave TTS restringe referers a `*.web.app`; quien entre por
  la URL vieja (marcador antiguo) carga la app entera… sin voz.
- **2026-07-23 · 🟢 arreglado** (este commit): `index.html` canonicaliza a `.web.app` ANTES de
  cargar nada (un `location.replace` inline). Nota: el `localStorage` es por origen — la sesión
  guardada en `firebaseapp.com` no viaja; al aterrizar en `web.app` toca reconectar una vez con
  el mismo nombre (takeover), y ya queda la URL buena. Alternativa descartada: añadir
  `*.firebaseapp.com` a los referers de la clave (dejaría DOS orígenes vivos con sesiones
  distintas, el lío persistiría).

## B12 · Una Noche · Volver de un modal apilado devuelve el modal anterior arriba del todo
- **2026-07-23 · reporte.** «Los modals sobre modals hacen scroll del modal anterior a arriba al
  volver (one night).» Al abrir el detalle de un rol desde el mazo (ℹ️) o desde «Cómo se juega»
  (chips) y pulsar «volver», el modal de origen reaparecía con el scroll perdido (arriba).
  Diagnóstico: el mecanismo ya existía (ModalHost restaura `modal.scroll`, y Los Hombres Lobo lo
  usa desde Roles/Explicación con `backScroll`), pero los modales de Una Noche abrían el detalle
  sin capturar el scroll y su «volver» devolvía `{ type: back }` a secas. De paso, volver al mazo
  desde «Empezar partida» perdía también `targetN` (el nº exacto de jugadores del objetivo).
- **2026-07-23 · 🟢 arreglado** (este commit): DeckModal (ℹ️) y HelpModal (chips ×2) capturan el
  scroll del modal al saltar al detalle (`backScroll`, patrón de Los HL) y el detalle lo devuelve
  al volver (`scroll`), junto con `targetN` si venía del mazo de «Empezar». E2E: reabrir con
  scroll restaurado verificado en `e2e-una-noche.mjs`.

## B13 · El ▶️ del detalle de rol seguía visible durante la partida (guardia muerta)
- **2026-07-23 · reporte.** «Una vez empezado el juego, oculta el botón de reproducir en los
  modals de roles.» Durante la partida, abrir el detalle de un rol (desde la tira de cartas en
  juego: DeckStrip en Una Noche, RolesStrip en Los HL) mostraba el ▶️ de lectura en voz alta —
  que en mitad de una mesa real es un «tell» (leer un rol en alto delata / molesta).
  Diagnóstico: los RoleDetailModal SÍ tenían la guardia `canPlay = app.group.status !== 'playing'`,
  pero desde la refactorización multi-partida el `status` del DOC del grupo se queda en `'lobby'`
  SIEMPRE (las partidas viven en `matches/`; quien marca `'playing'` es `matchView`/`viewGroup()`,
  no el doc). Así que la guardia era siempre `true` → el botón nunca se ocultaba.
- **2026-07-23 · 🟢 arreglado** (este commit): `canPlay` pasa a leer `viewGroup()?.status` (la
  vista con la partida en contexto superpuesta), que sí vale `'playing'` cuando hay una partida
  mía o observada por URL. Afecta a los dos RoleDetailModal (Los HL + Una Noche) y, por
  coherencia, al `canPlay` idéntico de la ayuda de Una Noche. El ▶️ sigue en el LOBBY (leer las
  reglas en alto antes de empezar es lo suyo). E2E: detalle in-game sin ▶️ en `e2e.mjs` (HL) y
  `e2e-una-noche.mjs` (Una Noche); el detalle del lobby lo conserva.

## B14 · Lecturas en voz alta: el título de sección se funde con su contenido (sin pausa)
- **2026-07-24 · reporte.** «Algunos cómo jugar con títulos de secciones no hacen pausa entre el
  título de la sección y su contenido.» Al leer en voz alta la explicación/«cómo se juega», el
  título («Cómo se juega», «De qué va»…) sonaba pegado al primer párrafo.
- **Diagnóstico.** Dos causas que se suman: (1) TODA síntesis pasa por `buildSsml()`, que solo
  inserta `<break>` tras `. ! ? …` — y los títulos no llevan punto, así que se funden con la
  frase siguiente; el SSML fino de `buildExplainSpeech()` (pausas de 450–1100 ms por sección)
  se DESCARTA en runtime: `toggleExplainAudio` pasa solo `segments[].text` (párrafos agregados
  en bloques de ≤3200 chars) y el clip se sintetiza desde texto plano. (2) En los «cómo se
  juega» de los 8 juegos por apartados, el ▶️ ni siquiera leía el título (solo `sec.items`).
- **2026-07-24 · 🟢 arreglado** (este commit): la explicación se locuta por PIEZAS (párrafo a
  párrafo) con segmentos `gap` reales entre ellas (el título, con su propia pausa); los ▶️ por
  apartado leen ahora `[título, …párrafos]` con pausa de 550 ms entre piezas. De paso, todos los
  textos de ayuda/lobby/demos se pregeneran como clips (antes se sintetizaban en vivo al tocar ▶️).

## B15 · Tutorial de Los Hombres Lobo: la palabra clave NO es de la Vidente
- **2026-07-24 · reporte.** «En el ejemplo del tutorial, la vidente sí se llama por el rol, ya que
  se conoce desde el principio. Un mal ejemplo. Palabras clave se usan para los enamorados de
  Cupido.» El paso «Ponte a prueba» del tutorial nuevo de Hombres Lobo ponía a la Vidente con una
  palabra clave («Luna de Plata») y a la voz llamándola por ella.
- **Diagnóstico.** Falso: las palabras clave (`KW_ROLES = ['cupido','gaitero','infecto']`, actions.ts)
  solo se activan con esos roles y sirven para llamar a IDENTIDADES QUE NACEN DURANTE LA PARTIDA
  (enamorados de Cupido, encantados del Gaitero, infectado) sin nombrarlas en voz alta. Un rol fijo
  y conocido desde el reparto como la Vidente se llama por su nombre (`STEP_CALL.vidente`:
  «Vidente, abre los ojos…»). `enamoradosCallUtterance` (compose.ts) es quien locuta la llamada por
  palabra clave, con `ENAMORADOS_INTRO`.
- **2026-07-24 · 🟢 arreglado** (este commit): el ejemplo del tutorial pasa a los ENAMORADOS de
  Cupido (paso «las palabras clave»), con el fraseo real de la voz; la carta de ejemplo de la
  Vidente ya no lleva palabra clave y aclara que se la llama por su nombre.

## B16 · El fondo hace scroll bajo un modal en móvil (iOS)
- **2026-07-24 · reporte.** «El back hace scroll cuando se toca la pantalla de tutorial. Se puede
  bloquear el scroll del back igual que hacen otros modals?» Con el tutorial abierto (un modal
  largo, llena la pantalla), arrastrar sobre él desplazaba la página de detrás.
- **Diagnóstico.** El bloqueo era `body.modal-open { overflow: hidden }`, que en iOS Safari NO
  frena el scroll táctil del documento (bug clásico de WebKit). No se notaba en los modales cortos
  (no invitan a arrastrar); el tutorial, a pantalla completa y con scroll interno, sí lo destapaba.
  «Los otros modales» en realidad tenían la misma fuga sutil.
- **2026-07-24 · 🟢 arreglado** (este commit): ModalHost FIJA el body mientras hay cualquier modal
  abierto (`position:fixed` + `top:-scrollY`, guardando y restaurando la posición al cerrar); el
  effect depende solo de «¿hay modal?» para no saltar al cambiar de un modal a otro. Afecta a TODOS
  los modales. E2E: e2e-demos comprueba body fijo al abrir y restaurado al cerrar.

## B17 · La mesa perdía el scroll al volver de un juego
- **2026-07-24 · petición.** «Al volver de la pantalla de juego al menú principal, se puede
  conservar la posición del scroll que había en la pantalla principal?» Al entrar en el lobby de un
  juego y volver a la mesa con ←, el catálogo aparecía arriba del todo.
- **Diagnóstico.** MesaScreen se DESMONTA al navegar al lobby (GroupScreen renderiza otro
  componente) y se remonta al volver, así que el scroll del documento se pierde.
- **2026-07-24 · 🟢 arreglado** (este commit): MesaScreen recuerda su scroll en una variable de
  módulo (sobrevive al desmontaje) y lo restaura al remontar, reintentando unos frames porque el
  catálogo tarda en alcanzar su alto (si no, el scroll se recortaría a 0). E2E: e2e-navegacion
  comprueba que el scroll de la mesa se conserva al ir a un juego y volver (viewport de móvil).

## B18 · Scroll de navegación: adelante arranca arriba; solo la mesa conserva
- **2026-07-24 · matiz.** «Al pasar de la página principal a una página de juego o a la de empezar
  a jugar, scrollea hacia arriba. Solo mantienes scroll cuando vas atrás.» Tras B17, la mesa
  conservaba su scroll, pero al ir HACIA ADELANTE (mesa → lobby → empezar) las pantallas nuevas
  heredaban el scroll del window (se notaba en «Empezar», que es larga: aparecía a media página).
- **2026-07-24 · 🟢 arreglado** (este commit): GroupScreen lleva la cuenta de qué pantalla se
  muestra (mesa / lobby / empezar / partida; la partida no distingue fase, para no resetear el
  scroll en cada fase) y, al cambiar a cualquiera que NO sea la mesa, hace `scrollTo(0,0)`. La mesa
  sigue restaurando su propio scroll (B17). E2E: e2e-navegacion comprueba que ir a «empezar»
  arranca arriba y que volver a la mesa conserva la posición.

## B19 · La carta propia no es accesible en todas las fases
- **2026-07-24 · reporte.** «En todos los juegos hay que poder seguir accediendo a la carta en todo
  momento, incluso en la primera fase donde el resto todavía no la ha visto, o en medio de una
  votación. En muchos momentos no se puede acceder a la carta inicial.»
- **2026-07-24 · 🟢 arreglado**: botón flotante «🎴» compartido (shell/CardFab) presente en TODAS
  las pantallas de partida de TODOS los juegos, en cualquier fase; abre un modal con tu carta
  privada + la referencia completa del juego (B21). data-a="open-mycard" uniforme.

## B20 · Audios que se leen mal (emojis en medio, abreviaturas)
- **2026-07-24 · reporte.** «Revisa bien todos los audios. Hay varias cosas que se leen mal, sobre
  todo abreviaciones o imágenes.»
- **Diagnóstico.** Los narradores de diario (Coup, Two Rooms, Codenames, Skull, Love Letter,
  Decrypto) limpiaban solo el emoji INICIAL de cada línea (`speakable`), pero muchas líneas llevan
  emojis en medio («… 🐷 2 · 🕊️ 3») que la síntesis lee como su nombre. Y abreviaturas tipo
  «3 min», «p. ej.», «+2», «1/5» o «4-2-1» se leen literalmente.
- **2026-07-24 · 🟢 arreglado**: `cleanForSpeech` (core/util/speech) ahora normaliza para voz:
  quita TODOS los emojis, expande abreviaturas (min→minutos, p. ej.→por ejemplo, nº→número),
  «+N»→«más N», «a/b»→«a de b» y «4-2-1»→«4, 2, 1» (solo entre dígitos). Todos los narradores de
  diario pasan por ella (antes solo las ayudas). El toSpeech del corpus/explicación de Hombres
  Lobo NO se toca (contrato golden de la v1).

## B21 · Referencia del juego siempre visible (mazo/roles y sus efectos)
- **2026-07-24 · reporte.** «Las cartas totales del mazo deben ser visibles y se debe poder
  consultar lo que hace cada una … en todo momento control de conocer su carta y las otras
  disponibles en la mesa, viendo lo que hace cada una y sus efectos.» (Probado en Love Letter.)
- **2026-07-24 · 🟢 arreglado**: el modal del botón «🎴» incluye SIEMPRE la referencia completa del
  juego: en Love Letter las 8 cartas con sus copias, valores y efectos; en Coup los 5 personajes y
  acciones; en cada juego su mazo/roles/valores. Uniforme en los 14 juegos.

## B22 · Two Rooms: el reloj de la ronda siguiente arrancaba sin dejar colocarse
- **2026-07-24 · reporte.** «Una vez hecha la votación empieza el contador inmediatamente. Estaría
  bien dar tiempo a que los jugadores se coloquen y que confirmen con un botón.»
- **2026-07-24 · 🟢 arreglado**: tras el intercambio de rehenes la partida entra en una fase de
  COLOCACIÓN (`move`) sin reloj: los rehenes cruzan de sala con calma y, cuando todos están,
  cualquiera pulsa «▶️ Empezar la ronda N» (igual que al arrancar la ronda 1). La voz lo anuncia.

## B23 · Audios: cuando el emoji ERA el contenido, la frase se queda coja (🟡 re-reporte de B20)
- **2026-07-24 · reporte.** «Todavía hay algunos iconos que no se leen bien en los audios. En
  concreto estoy en el tutorial de 🚔 Good Cop Bad Cop y *Tus cartas: 👮 👮 🦹 → eres HONESTO
  (mayoría). Y una de ellas es… el 🕵️ Agente…* **no lee mis cartas**.»
- **Diagnóstico.** B20 arregló el ruido (la voz ya no lee «policía policía villano»), pero abrió el
  agujero contrario: `cleanForSpeech` borra TODOS los emojis, así que cuando el emoji era el
  sustantivo de la frase, la voz dice «Tus cartas: eres HONESTO». Un lint sobre las 739 piezas
  habladas (intro del lobby + «cómo se juega» + los 17 tutoriales) destapa 28 casos del mismo
  patrón, repartidos por 11 juegos: «toca al 💀», «con 9 ❤️», «gastan 3 ⚡», «la tira del Azul:
  ⬅️⬅️⬇️», «Dos tripulaciones (🔴 y 🔵)», «míralo en 🎴»… Además `→` caía dentro del rango de
  flechas y «G3→F3→E3» se leía «G3F3E3», y al quitar el emoji quedaba un espacio antes del punto.
- **2026-07-24 · 🟢 arreglado** (este commit): tres capas.
  1. `cleanForSpeech` recompone la puntuación tras quitar los emojis (nada de « ,» ni «( )») y
     traduce los símbolos que sí significan algo: `→` a coma, `×` entre dígitos a «por».
  2. Los textos afectados se reescriben para que la frase **se sostenga sola en voz**, sin perder
     el emoji en pantalla: «Tus cartas: 👮 👮 🦹 — dos honestas y una corrupta».
  3. `speech-lint.test.ts` recorre TODAS las piezas habladas de TODOS los juegos y falla si una
     frase se queda con un signo colgando, con un artículo sin sustantivo o con una ristra de
     emojis que era el contenido. Así el agujero no se puede reabrir sin que salte un test.
- **2026-07-24 · ampliación.** La revisión juego a juego (B24) destapó que el rango de purga se
  quedaba corto: `⏱ ⏫ ▶ ⋯` (U+2300-23FF, U+25A0-25FF, U+22EF) llegaban al sintetizador y sonaban
  como un carraspeo o un símbolo leído — «⏱️ Ronda 1 de 3», «pulsa ▶️ Empezar la ronda», «⏫ emerge»,
  «el menú ⋯». Ahora la purga combina los rangos explícitos con la propiedad Unicode
  `\p{Extended_Pictographic}` (cubre también los que vengan), `↔` se traduce a «frente a» (el
  «Frío ↔ Caliente» de Wavelength se leía «Frío Caliente») y el lint falla si sobrevive cualquier
  pictograma. Dos reglas nuevas cazan lo que se escapaba: determinante + emoji + palabra que no
  puede ser el sustantivo («consulta tu 🎴 siempre que…») y paréntesis que arrancan con un signo
  suelto. Y el ▶️ del tutorial lee además el enunciado de la pregunta del paso (`ask.prompt`), que
  antes dejaba mudos los pasos cuya enseñanza vivía en la pregunta.

## B24 · Revisión juego a juego de los 17 juegos (mesa novata)
- **2026-07-24 · petición.** «Por favor revisa todos los juegos de nuevo. Siéntete libre de
  reescribir lo que haga falta para que todo funcione de la mejor forma posible de cara a una mesa
  con jugadores reales jugando, donde muchos juegos serán nuevos para nosotros y queremos entender
  bien cómo jugar y pasar un buen rato. […] Por favor revisa uno a uno todos los juegos.»
- **Método.** Un revisor por juego (17 en paralelo) leyendo motor, tests, acciones, textos,
  tutorial, narrador, TODA la UI y el e2e, con una rejilla fija: reglas y bloqueos, tutorial,
  ayuda, voz, UI en la mesa y fugas. Varios fuzzearon el motor (Coup 2.500 partidas, Love Letter
  20.000 rondas, Skull 4.000, Sonar 6.000) para descartar atascos. Después, un ejecutor por juego
  aplicando los hallazgos dentro de su carpeta, más los arreglos transversales del coordinador.
- **2026-07-24 · 🟢 aplicado** (este commit). Transversal: la purga de voz (B23 ampliado), el
  catálogo de la mesa con duración y «🌱 fácil de explicar» por juego, el tutorial de los 17 en el
  e2e (antes solo 9) y `window.__hlc` sin secretos fuera de modo test (un curioso leía los roles de
  todos desde la consola del móvil). Lo de cada juego, en el resumen de abajo.

## B25 · Love Letter: en tu turno no ves qué hace cada carta (ni el mazo entero)
- **2026-07-24 · reporte.** «Cuando me toca en mi turno jugar una carta, no veo todas las cartas
  disponibles y lo que hacen. Tampoco veo qué hace cada una de las dos cartas que puedo jugar (solo
  veo el nombre y me deja elegir un jugador al que aplicarlo). Es muy difícil de jugar y recordar.
  Imaginaba una UI donde se pueda revisar en cualquier momento lo que hace y cómo se juega cada una
  de las cartas, cuántas hay de cada, etc. Además de poder ver sencillamente el efecto que va a
  hacer cualquiera de mis dos cartas antes de seleccionar otro jugador.»
- **Diagnóstico.** B21 dejó la referencia completa dentro del modal 🎴, pero **a dos toques y fuera
  del sitio donde se decide**. En el panel de turno el botón de cada carta solo lleva emoji, nombre
  y valor: el efecto y las copias hay que recordarlos o ir a buscarlos, justo cuando la mesa te
  está esperando. Y elegir carta y elegir objetivo van en el mismo gesto, sin poder «asomarse» a lo
  que haría cada opción.

## B26 · «En general las UIs son bastante poco intuitivas»
- **2026-07-24 · reporte.** «En general las UIs son bastante poco intuitivas, no sé si se podría
  mejorar?» (a raíz de B25, jugando a Love Letter).
- **Criterio de trabajo que sale de aquí** (aplica a los 17 juegos): en la pantalla donde se
  DECIDE, cada opción debe decir lo que hace antes de tocarla — nada de botones que solo llevan un
  nombre; elegir qué y elegir a quién son dos pasos, con lo elegido a la vista y vuelta atrás; y la
  referencia del juego (mazo/roles/costes) se consulta desde el propio panel de acción, no solo
  desde el 🎴.

### B24 · Lo que se arregló en cada juego (resumen)
- **Hombres Lobo** — 🔴 BLOQUEO: con el Cabeza de Turco designando al Tonto ya descubierto, nadie
  podía registrar el voto del día siguiente (`canRegisterVote` + el Cabeza ya no puede designarlo).
  🔴 Sin salida si un móvil moría de noche en modo automático («⏭️ Continuar sin él» y «Saltar
  paso»). La partida no cerraba por paridad si el pueblo mataba al Anciano. El aviso de los
  encantados solo repetía la palabra de los nuevos. La Gitana prometía una lista de preguntas que
  la app no daba (ahora sí). Tres redacciones distintas de la victoria lobuna, unificadas.
- **Una Noche** — 🔴 la 2.ª partida y siguientes se narraban EN SILENCIO (`playAgain` no renovaba
  `startedAt`, el ledger daba todo por dicho). 🔴 FUGA: el diario público cantaba «el Doble ha
  copiado a alguien», delatando que el Doble estaba repartido. Escape para pasos encallados,
  temporizador de debate, panel del narrador, y la ayuda con cómo se vota de verdad.
- **Ávalon** — el contador de rechazos mentía en la pantalla del destape; con 5-7 jugadores los
  especiales del Mal se descartaban en silencio Y la carta de Merlín le mentía; «Repetir» era un
  botón muerto; sin tabla de misiones en partida.
- **Secret Hitler** — los votos no se destapaban por nombre (la prueba principal del juego); la
  ayuda no decía la composición del mazo (11/6); la voz callaba en toda la ronda legislativa, en el
  resultado de la elección, en el caos y en las ejecuciones.
- **El Camaleón** — la rejilla se veía al 45 % de opacidad (ilegible); no se sabía a quién le tocaba
  dar pista; un toque de cualquiera cortaba las pistas sin vuelta atrás; el momento de pillar al
  Camaleón era mudo; el recuento prometido no se enseñaba nunca.
- **Insider** — el sorteo de «quién pregunta primero» podía caer en el Maestro (instrucción
  imposible 1 de cada N rondas); la votación se atascaba sin nombres ni recuento forzado; pausar
  mataba al narrador el resto de la ronda; el Insider era el único con un botón suelto en pantalla
  (se le distinguía de reojo).
- **Coup** — se podía robar a quien tenía 0 monedas; una ventana sin respuesta no se cerraba nunca;
  la Condesa no figuraba en la lista de personajes; «queda ELIMINADO» en masculino fijo.
- **Two Rooms** — 🔴 el voto de rehén se bloqueaba si faltaba un móvil; con más de 10 jugadores 3
  rondas y 1 rehén hacían irrelevante el juego; el cartel final mentía en las rendiciones; una sala
  veía a quién mandaba la otra antes de decidir; el modo de voz por defecto dejaba muda la Sala 2.
- **Codenames** — el tablero al 45 % de opacidad y los tintes del Jefe casi idénticos; el arranque
  no decía qué equipo empieza; al recargar el altavoz se releía el diario entero; 282 palabras tras
  quitar los pares que se tapan por significado.
- **Decrypto** — el empate en la ronda 8 coronaba al azul «por decreto»; la transmisión ganadora no
  se destapaba nunca; los códigos podían repetirse (72 % de los equipos en 8 rondas); la hoja de
  pistas —el corazón del juego— era una lista plana.
- **Good Cop Bad Cop** — la voz nunca decía de quién era el turno; un muerto conservaba pistola y
  mira; el reparto (2+1 y cuántos de cada bando) era información pública que la app ocultaba;
  disparar era un solo toque.
- **Shadow Hunters** — la carta de pista desaparecía de la pantalla del que la recibía; el diario
  cantaba curas que no ocurrían (delatando el efecto); la voz no decía de quién era el turno;
  `MAX_HP` 10 → 8 para que la partida no se eternice.
- **Captain Sonar** — 🔴 si un torpedo hundía a los dos, ganaba **el que se hundía** (y la ayuda
  prometía lo contrario); sin herramienta para triangular el 80 % de las partidas no terminaba
  (cuaderno de sonar local); «de el submarino» en cada torpedo; los dos altavoces podían caer en la
  misma tripulación.
- **Wavelength** — 🔴 FUGA: el móvil que solo ponía la voz enseñaba la diana en plena adivinanza;
  el dial era local a cada móvil; no había fin de partida; «Frío ↔ Caliente» se leía «Frío Caliente»
  en cada ronda.
- **Skull** — 🔴 `RangeError` al abrir la carta tras fallar un reto (dejaba el móvil colgado); el
  eliminado veía un panel muerto cada ronda; abrir la puja al tope obligaba a una vuelta de «pasar».
- **Love Letter** — 🔴 el Barón cantaba en el diario la carta del GANADOR del duelo; el vistazo del
  Sacerdote se borraba en cuanto otro jugaba; el desempate por descartes era mudo; «queda
  protegida» en femenino fijo. Y la reforma de UI de B25.
- **El Espía** — el espía no podía adivinar tras el tiempo pero tres textos lo prometían; «otra
  ronda» no comprobaba el mínimo; una acusación abierta no se podía retirar; la voz hablaba de un
  reloj que ya no existía.

## B27 · La cabecera repetía el nombre de la mesa en vez de decir a qué juegas
- **2026-07-24 · petición.** «En vez de mostrar el nombre del grupo de la sala arriba como header,
  se puede hacer únicamente en la pantalla principal? En la vista de juego muestra el nombre del
  juego.»
- **Diagnóstico.** Las 17 pantallas de lobby y de partida ponían `<emoji> {group.name}` en la
  `topbar`: dentro de la partida el dato ya lo sabes (estás en tu mesa) y ocupa el único sitio donde
  cabría lo que de verdad orienta — a qué estás jugando. Con varias partidas simultáneas por mesa,
  además, todas las cabeceras se ven iguales.
- **2026-07-24 · 🟢 arreglado** (este commit): la mesa (`MesaScreen`), la portada y la pantalla de
  invitación siguen luciendo el nombre del grupo; lobby, «empezar partida» y partida pasan a decir
  el nombre del juego.
