# 🎲 Juegos digitales

Colección de juegos de mesa para jugar con amigos en la misma sala, cada uno desde su móvil. La portada (`/`) es un menú de juegos; de momento contiene uno:

# 🐺 Los Hombres Lobo de Castronegro (`/hombres_lobo`)

Adaptación web completa del juego de mesa.

*(La URL de la instancia no se publica: el sitio vive en un subdominio aleatorio no indexable —`robots.txt`, meta `noindex` y cabecera `X-Robots-Tag`— para que solo el grupo de amigos lo conozca. Despliega la tuya con `firebase deploy` sobre tu propio proyecto.)*

## Cómo funciona

- **Crear partida**: entra en `/`, escribe tu nombre y el del grupo (se sugiere uno aleatorio con un 🎲 para regenerarlo). Quien crea el grupo es el **máster**. Se genera una URL única (`/g/nombre-del-grupo`) para compartir. Si el grupo ya existe, la web ofrece entrar en él como jugador o **entrar como nuevo máster** (el anterior pasa a jugador): nadie se queda bloqueado.
- **Unirse**: abre la URL del grupo, escribe tu nombre y listo. Sin registros ni contraseñas; la sesión se guarda en el dispositivo (localStorage). Si tu nombre ya existe, puedes desconectar el dispositivo anterior y continuar como ese jugador (útil si se te cierra el navegador).
- **Lobby**: todos ven la lista de jugadores. El máster puede expulsar jugadores, ceder el rol de máster, eliminar el grupo (libera el nombre), elegir los roles de la partida y los ajustes: revelar rol al morir, composición pública, alguacil, **primera noche sin sangre** (los lobos se reconocen pero no devoran), **vidente solo ve el bando** (lobo o no, sin rol exacto), y **ocultar causas de muerte nocturnas** (solo se anuncia quién murió). El **número de lobos** (auto oficial o fijado del 1 al 4) se elige en el menú de roles.
- **Partida en curso**: no se puede entrar ni salir del grupo; los visitantes ven un aviso con botón de reintentar. Los jugadores existentes sí pueden reconectarse.

## Modos de juego

En el **lobby no hay máster**: cualquier dispositivo configura los roles, ajusta las opciones e inicia la partida. Cada dispositivo se marca como **jugador o solo-pantalla** (📺, recordado entre partidas) y solo los marcados reciben rol. El narrador se decide **al arrancar** (también recordado): en **automático** se elige qué dispositivo narrará — puede ser un jugador (mismo móvil para jugar y narrar) o un dispositivo sin jugador (tele/altavoz: durante la partida muestra solo un aviso y pone la voz); en **guiado** y **manual** narra quien pulsa empezar y no juega. Los dispositivos que ni juegan ni narran ven solo «partida en curso». Todos los jugadores tienen en su barra: 🔁 repetir la última locución (suena en el narrador), ⏭️ forzar un paso atascado y 🏳️ terminar la partida revelando todos los roles (en automático nadie ve los roles hasta el final: ni siquiera el narrador tiene ya ese botón).

**Reglas oficiales aplicadas**: de **8 a 18 jugadores** además del narrador; **2 lobos** con 8-11 jugadores, **3** con 12-17 y **4** con 18. Con el Ladrón se añaden **2 cartas de Aldeano extra** al mazo y las 2 sobrantes del reparto quedan en el centro (si ambas son de lobo, el cambio es obligatorio). Las Dos Hermanas piden mesas de ≥12 y los Tres Hermanos de ≥16 (aldeas grandes según su reglamento); si no se cumplen, no se reparten y se anuncia. Para grupos pequeños existe el **modo casual** (ajuste del máster): permite jugar desde 3 jugadores, señalado como fuera de las reglas oficiales. La partida termina también por **paridad**: si los lobos igualan o superan al resto (p. ej. 1 lobo + 1 aldeano), ganan — salvo que siga vivo un Cazador o una Bruja con veneno (aún podrían dar la vuelta), o que el único lobo sea el Albino (que busca su victoria en solitario).

- **🤖 Automático**: la app dirige la partida sin narrador humano. El dispositivo del máster narra con voz sintetizada (mantenlo encendido y con volumen) y muestra un panel de narrador (paso actual, a quién se espera). Desde 🗣️ Voz se elige el motor: **voz neuronal en la nube** (Google Chirp3-HD, prácticamente humana; requiere una API key de Cloud TTS restringida por dominio en `public/js/tts-key.js`, fuera del repo) con seis voces y caché local (cada frase se sintetiza una sola vez), o la voz del dispositivo como respaldo automático. También hay **🎵 ambiente de fondo** procedural (viento, grillos y búhos de noche; pájaros de día) generado con WebAudio, que se atenúa mientras habla el narrador. Cada rol actúa desde su móvil por turnos; de día cualquiera registra la decisión del pueblo (primera elección gana, se asume buena fe). Los lobos igual: el primero que elige decide por la manada.
- **📖 Guiado**: tú narras en persona y la app no habla — la pantalla del máster muestra el guion paso a paso (qué rol despierta, el texto para leer en voz alta y las opciones de cada uno) y él registra las decisiones; los jugadores solo ven su carta. Sin palabras clave ni temporizadores: el máster marca el ritmo.
- **🎩 Manual**: control total sin guion. La app reparte los roles, se los muestra todos al máster, y desde el menú de cada jugador puede: marcarlo muerto/vivo (sin causa), enseñar su rol a pantalla completa (p. ej. a la vidente), marcar enamorados (si hay Cupido) o aplicar el cambio de carta del Ladrón.

## Roles implementados (juego base + todas las expansiones)

- **Base**: Hombre Lobo, Aldeano, Vidente, Bruja, Cazador, Cupido, Ladrón, Niña (+ Alguacil como ajuste).
- **Luna Nueva**: Defensor, Anciano, Cabeza de Turco, Tonto del Pueblo, Gaitero, Gitana.
- **El Pueblo**: Cuervo. (Los oficios/edificios del tablero físico no se incluyen.)
- **Personajes**: Aldeano-Aldeano, Dos Hermanas, Tres Hermanos, Ángel, Zorro, Caballero de la Espada Oxidada, Juez Tartamudo, Abnegada Sirvienta, Actor, Abominable Sectario, Domador de Osos, Niño Salvaje, Hombre Lobo Albino, Gran Lobo Feroz, Perro Lobo, Infecto Padre de los Lobos.

Lobos y aldeanos se reparten automáticamente según el número de jugadores (1 lobo hasta 6 jugadores, 2 hasta 11, 3 hasta 17, 4 desde 18). Los roles especiales de lobo (Feroz, Albino, Infecto) sustituyen lobos comunes.

### Adaptaciones digitales (buena fe)

- **Palabras clave** 🔑: si hay Cupido o Gaitero en juego, cada jugador recibe una palabra clave secreta junto a su rol (p. ej. «Cuervo de Ceniza»), distinta en cada partida. De noche todos juegan con los ojos cerrados; cuando hay que despertar a jugadores elegidos en oculto (enamorados, encantados), la voz los llama por sus palabras clave y solo ellos abren los ojos con disimulo para mirar su pantalla: nadie sabe a quién habla, como el toque en el hombro del narrador. Si el Gaitero muere con roles ocultos, la voz hace llamadas falsas para disimular.
- **La manada se reconoce físicamente** 🐺: al revelarse el rol solo sabes que eres lobo. La primera noche, con todo el pueblo con los ojos cerrados, la voz pide a los lobos que abran los ojos y se reconozcan; cada lobo lo confirma en la app y solo entonces esta muestra la manada. Las Dos Hermanas y los Tres Hermanos se reconocen igual.
- **La voz insiste (solo de noche)**: si nadie actúa en ~30 s, el narrador repite avisos con frases de ánimo («Los hombres lobo se lo están pensando…», «¡Cupido, abre los ojos!»). Para los enamorados, cada aviso repite sus palabras clave. Si tras ~2 minutos sigue sin respuesta, asume que alguien olvidó su rol: **pausa la noche y todo el pueblo abre los ojos para repasar su rol y su palabra clave**; al confirmar todos, la noche continúa donde estaba y el paso se vuelve a anunciar. De día y durante el reparto no insiste.
- **Cierre de ojos con margen**: al terminar cada paso, la voz despide al rol («Los hombres lobo vuelven a cerrar los ojos…») y espera ~5 segundos antes de seguir, dando tiempo a bloquear el móvil. La despedida suena igual aunque el rol estuviera muerto o sin poderes: pura cortina de humo.
- **Narración viva**: cada locución tiene varias variantes (elegidas por partida y noche) y la voz improvisa pinceladas aleatorias — presagios nocturnos, rumores del pueblo al amanecer, coñas durante el debate y transiciones al ocaso — para que cada partida suene distinta. Además intercala murmullos de despiste: a veces sigue hablando aunque el rol ya haya actuado, para que el audio no delate a nadie.
- **Sin pistas por tiempos**: la vidente (y el zorro o el actor-vidente) ven su resultado y confirman «lo he visto»; entre paso y paso de la noche hay siempre una pausa aleatoria de 4-9 s, idéntica para roles vivos, muertos o sin poderes, para que nadie pueda deducir nada observando quién suelta el móvil ni cuánto tarda la voz.
- **Disimulo total**: con roles ocultos, la voz sigue llamando a los roles eliminados con esperas falsas. Y los roles vivos sin poderes (bruja sin pociones, zorro sin olfato, castigo del Anciano) **despiertan igualmente**: ven un panel de «disimula y termina tu turno» y su comportamiento externo es idéntico al de siempre.
- **Rol oculto por defecto** 🙈: durante la partida la carta no se muestra; un botón discreto «👁 Mostrar mi rol» la enseña (con la palabra clave) y se auto-oculta a los 12 segundos, para que nadie la vea de reojo.
- **Los muertos ven la mesa** 💀: un jugador eliminado puede tocar a cualquier jugador para descubrir su rol (solo lo ve él), como quien observa la noche con los ojos abiertos. Los muertos no hablan.
- **Votación**: el debate es verbal; cualquiera registra el resultado en la app y la primera elección es definitiva. Hay botones «el pueblo perdona» y «hubo empate» (el empate activa al Cabeza de Turco).
- **Niña**: espía con los ojos, como en el juego físico — entreabre los párpados mientras los lobos eligen. La app no le muestra nada ni le pide nada.
- **Los lobos pueden devorar a cualquiera**, incluidos miembros de la propia manada, o declarar que «no se ponen de acuerdo» (nadie muere, regla oficial de la unanimidad). Durante el reconocimiento, su pantalla muestra la manada — y el lobo solitario puede confirmar sin esperar a nadie.
- **Actor**: elige cada noche entre tres poderes fijos (ver rol, proteger, señalar como el cuervo).
- **Gitana**: elige una pregunta; el primer jugador muerto la responde desde «el más allá» al amanecer.
- **Sectario**: la mesa se divide en dos mitades automáticas por orden de llegada.
- **Zorro/Domador/Caballero**: la «vecindad» es el círculo por orden de llegada al grupo, saltando muertos.

## Estructura técnica

```
public/
  index.html         Shell de la SPA
  css/styles.css     Tema nocturno
  js/fb.js           Init de Firebase (Firestore, SDK por CDN, sin build)
  js/roles.js        Catálogo de roles + reparto (puro, testeable)
  js/engine.js       Motor: pasos de noche, amanecer, votos, victorias (puro)
  js/narration.js    Locuciones en español + síntesis de voz (Web Speech API)
  js/store.js        Sesión (localStorage), rutas y listeners de Firestore
  js/actions.js      Todas las escrituras (transacciones)
  js/conductor.js    «Narrador» del modo automático (solo dispositivo del máster)
  js/ui.js           Renderizado
  js/main.js         Enrutado y eventos
tests/engine.test.mjs  54 tests del motor (node --test tests/engine.test.mjs)
e2e/                   Pruebas de extremo a extremo con Playwright (URL por variable de entorno):
                       cd e2e && npm i playwright && npx playwright install chromium
                       BASE=https://TU-SITIO.web.app node e2e.mjs
```

- **Firebase**: proyecto `castronegro-zui5sg`, Firestore (eur3) + Hosting. Deploy: `firebase deploy --project castronegro-zui5sg`.
- **Datos**: `groups/{slug}` (doc del grupo con el estado de la partida) + `groups/{slug}/players/{p-nombre}`. Todos los clientes escuchan ambos con `onSnapshot`.
- **Sin autenticación**: reglas abiertas limitadas a `groups/**`. Los roles son técnicamente legibles con las DevTools; es un juego amistoso entre amigos y se asume buena fe (la UI solo muestra a cada uno lo suyo).
- **Concurrencia**: todas las acciones sensibles usan transacciones de Firestore (la primera elección gana; los pasos avanzan de forma atómica).
- El modo automático necesita el dispositivo del máster despierto (usa Wake Lock cuando el navegador lo permite).
