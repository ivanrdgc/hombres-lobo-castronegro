# Castronegro — Rediseño de UI/UX (julio 2026)

Contrato de diseño del rediseño completo pedido por Iván: hacer la app mucho más
intuitiva y sencilla, con el mínimo de toques por decisión, y dejar la
estructura lista para añadir más juegos con la misma UX.

## Principios

1. **Un momento, una pantalla, un gesto.** Cada decisión se toma con el menor
   número de toques posible y sin listas duplicadas (nunca «menú de acción con
   jugadores + parrilla de jugadores debajo»).
2. **La parrilla de jugadores ES la superficie de acción.** Cuando te toca
   elegir a alguien, tocas su nombre en la única lista visible y confirmas con
   un botón que ya dice a quién («🩸 Devorar a Bea»). Dos toques.
3. **La mesa solo gestiona personas.** Ver quién está, invitar y expulsar.
   Nada de configurar quién juega o narra por adelantado.
4. **Todo lo de una partida se decide al empezarla.** Quién juega, en qué
   orden se sientan y quién narra se eligen en la pantalla «Empezar partida»,
   justo antes de arrancar, con valores por defecto sensatos (se recuerdan).
5. **El grupo manda sobre la partida.** Cualquier dispositivo del grupo —
   juegue o no — puede pausar y terminar la partida en curso (con
   confirmación). Nadie se queda bloqueado porque el móvil de otro no esté a
   mano.
6. **Salir limpio a media partida.** Un jugador puede abandonar: su rol se
   revela a todos y sale inmediatamente, sin efectos de última hora (ni flecha
   del cazador, ni muerte de pena del enamorado).
7. **Presencia visible.** Todos los dispositivos laten; los inactivos se
   marcan 💤 y no se preseleccionan al empezar una partida.
8. **Cada rol se entiende antes de jugarlo.** Explicación estructurada (qué
   es, cómo se desarrolla paso a paso con la app) disponible en la
   configuración, en «Cómo se juega», dentro de la partida (tira de roles
   clicable) y sobre todo en tu propia carta. La palabra clave va destacada en
   un recuadro imposible de pasar por alto.
9. **El menú ⋯ es solo función de partida.** Pausar, voz, repetir, abandonar,
   terminar. La información (cartas en juego) vive abajo, junto a la crónica.

## Pantallas

### Mesa (página principal del grupo)

- Tarjeta **Invita**: enlace + copiar (como hoy).
- Tarjeta **Dispositivos**: lista plana en orden de mesa; badges: `Tú`, `💤`
  (inactivo). Tocar un dispositivo → modal con **👢 Expulsar** (si no eres tú).
  Sin asas de arrastre, sin «no juega», sin «narrador».
- Tarjeta **¿A qué jugamos?**: catálogo (como hoy).
- **🗑️ Eliminar la mesa** abajo.
- Fuera: tarjeta de configuración de voz (pasa al flujo de inicio y al menú ⋯).

### Lobby del juego (Hombres Lobo)

Sin cambios de fondo: introducción + «Cómo se juega», «Roles y configuración»
(roles + ajustes) y **🎬 Empezar partida**, que ahora abre la **pantalla de
inicio** (no un modal).

### Pantalla «Empezar partida» (`ui.lobbyView = 'start'`)

Una sola página, tres bloques y un botón:

1. **¿Quién juega?** — una única lista con TODOS los dispositivos en orden de
   mesa. Tocar = incluir/excluir (✓); arrastrar ⠿ = orden (sentido horario).
   Preselección: dispositivos activos con `isPlayer !== false`. Los inactivos
   aparecen 💤 y des-seleccionados (tocables si su dueño está presente).
   Los toggles persisten en `isPlayer` (recordado); el orden en `seating`.
2. **¿Quién narra?** — selector de modo:
   - 🤖 **La app narra** (auto): chips para elegir el dispositivo que pone la
     voz (por defecto el recordado o este); puede jugar además de narrar.
     Botón pequeño «🗣️ Probar la voz».
   - 📖 **Narro yo (guiado)**: quien pulsa Empezar narra en persona y no juega.
   - 🎩 **Narro yo (manual)**: ídem sin guion.
3. **Resumen** («Jugarán 5: Ana, Bea… · 🐺 2 lobos») + avisos (mínimo de
   jugadores, inactivos excluidos) + **🎬 ¡Empezar!**.

`startGame(mode, narratorId, playerIds)` recibe la selección explícita.

### Durante la partida

- **Cabecera**: nombre + chip de fase + menú ⋯.
- **Menú ⋯** (para TODOS los dispositivos del grupo, incluidos los que no
  juegan): ⏸️ Pausar (auto) · 🗣️ Voz (auto) · 🔁 Repetir (auto) · 👁 Ver roles
  (guiado, narrador) · 🚪 Abandonar la partida (si juegas y estás vivo, con
  confirmación) · 🏳️ Terminar (cualquiera, con confirmación).
- **Espectadores** (dispositivos sin rol): ven fase, parrilla, tira de roles y
  crónica — pueden seguir la partida y usar el menú. El narrador-altavoz
  mantiene su tarjeta de «este dispositivo narra».
- **Acción** (noche/voto/pendientes): panel con título + pista + **una única
  parrilla** (los no elegibles, atenuados) + confirmación nombrada. Sin modal
  extra de confirmación de voto.
- **Abajo**: tira de **cartas en juego** (chips clicables → detalle del rol) +
  crónica.

### Abandonar la partida (nuevo)

`leaveGame()`: marca `alive=false`, `causeOfDeath='abandono'`, log público
«🚪 X abandona la partida y muestra su carta: era 🐺 Hombre Lobo.» — solo si
la mesa juega con «revelar rol al morir»; con roles ocultos, la carta se queda
boca abajo como en cualquier otra muerte. Sin cadena de muerte (ni cazador, ni
enamorado, ni sucesión de alguacil: si era alguacil, el cargo queda vacante).
Limpia sus `pending` y, en auto/guiado, re-chequea el ganador. En manual no
auto-termina (el narrador manda).

### Ayuda de roles estructurada

`texts/role-help.ts`: por rol, `steps[]` («cómo se desarrolla», en segunda
persona, mencionando la app y las palabras clave cuando tocan) + cuándo actúa.
Se muestra en: RoleDetailModal (tira de roles, ℹ️ de la configuración, «Cómo se
juega»), y en tu carta («🧭 Qué harás»). La palabra clave se muestra en un
recuadro grande `.kwbox`. Los textos que alimentan la VOZ (golden test) no se
tocan.

## Presencia

- Todos los dispositivos escriben `heartbeatAt` (~30 s, solo con la pestaña
  visible; ya permitido por las reglas). `isActiveDevice(p, now)`: latido con
  menos de 70 s. Sin latido nunca (docs antiguos) → se considera activo para
  no dar falsas alarmas, salvo en la preselección de inicio (ahí cuenta como
  inactivo solo si el campo existe y es viejo).

## Multi-juego (GameDefinition)

`games/registry.ts`:

```ts
interface GameDefinition {
  id: string; emoji: string; name: string; desc: string;
  minPlayers?: ...;
  Lobby: Component;   // configuración específica del juego
  Start: Component;   // pantalla «Empezar partida»
  Screen: Component;  // partida (elige internamente por modo/fase)
  modals: Record<string, Component>; // modales propios del juego
}
```

`GroupScreen` y `ModalHost` delegan según `group.currentGame`. Los componentes
específicos del juego (LobbyScreen, RolesModal, SettingsModal, ExplainModal,
StartScreen, RoleDetailModal…) viven en `games/hombres-lobo/`. El shell aporta:
mesa, identidad/reconexión, presencia, voz/audio, modales genéricos.

## Etapas (cada una: checks verdes + commit + deploy v2)

- S1 Presencia global + 💤.
- S2+S3 Mesa simple + pantalla de inicio (+ e2e afectados).
- S4 Espectadores útiles, terminar para todos, abandonar.
- S5 Acción integrada (una lista, confirmación nombrada).
- S6 role-help + tira de roles + palabra clave destacada.
- S7 GameDefinition y movimiento de ficheros.
- S8 e2e completos + deploy a producción.

---

## Panel de decisión (julio 2026 · B25/B26)

Iván, jugando a Love Letter: «no veo todas las cartas disponibles y lo que hacen…
solo veo el nombre y me deja elegir un jugador… es muy difícil de jugar y
recordar», y después: «en general las UIs son bastante poco intuitivas, se puede
revisar e intentar mejorar en todos los juegos y en toda la app».

Contrato que sale de ahí. Vale para **los 17 juegos y el shell**, y es
comprobable pantalla a pantalla:

1. **El botón dice lo que hace.** Ninguna opción se ofrece solo con su nombre.
   Cada carta, acción, rol o poder lleva **su efecto en una línea** (y su coste,
   si lo tiene) allí donde se elige. «👑 Rey (6)» no basta; «👑 Rey · 6 —
   intercambias tu mano con la de quien elijas · 1 en el mazo» sí.
2. **Elegir QUÉ y elegir A QUIÉN son dos pasos.** Al tocar la opción se marca y
   aparece en claro lo que va a pasar («👀 Sacerdote: verás en secreto la mano de
   quien elijas»), y solo entonces la lista de objetivos válidos. Siempre con
   **↩️ cambiar** para volver. Si la opción no lleva objetivo, se dice («no elige
   objetivo: solo se descarta») y se confirma con un botón.
3. **Nada irreversible de un solo toque.** Lo que puede acabar la ronda o la
   partida, gastar tu turno o destapar información pide un segundo gesto, y el
   botón final **nombra la consecuencia** («💥 Disparar a Carlos»).
4. **La referencia se consulta desde donde se decide.** Un desplegable «📖 …»
   plegado dentro del propio panel de acción, con el mazo/roles/costes y lo que
   ya ha salido. El botón flotante 🎴 (B19/B21) sigue, pero deja de ser el único
   camino: nadie debe salir de la pantalla en la que está decidiendo.
5. **Siempre se sabe de quién es el turno y qué se espera de MÍ.** Cabecera con
   el turno; y para quien no actúa, una línea que diga qué está pasando, a quién
   se espera (por nombre) y qué puede ir haciendo mientras.
6. **Lo deshabilitado explica por qué.** Nunca un botón gris mudo ni un `title=`
   (invisible en móvil): al lado, en pequeño, el motivo («con el Rey en la mano,
   la Condesa es obligatoria», «te faltan 2 ⚡»).
7. **Lo público, en pantalla.** Los números que en la mesa real están a la vista
   —copias del mazo, cuántos hay de cada bando, monedas, energía, descartes,
   rondas restantes— no se memorizan: se ven.
8. **Prohibido el estado sin salida.** Toda pantalla ofrece algo que hacer,
   aunque sea «esperando a Bea y Carlos» con nombres y, si procede, la forma de
   desatascar.
9. **Móvil primero.** Objetivo de toque ≥ 44 px, nada esencial por debajo de
   0,8 rem, sin texto partido a mitad de palabra y sin información escondida en
   atributos que solo se ven con ratón.

### Piezas compartidas que da el shell (para la pasada de UI)

- **`shell/CardFab.svelte`** — pastilla flotante rotulada «🎴 Mi carta / y las
  reglas» en todas las pantallas de partida (`data-a="open-mycard"`). Abre el
  `MyInfoModal` del juego.
- **`shell/RefRows.svelte`** — filas «emoji · nombre · nota · efecto» para la
  referencia del mazo/roles. Úsalo tanto en el modal 🎴 como plegado dentro del
  panel de acción (punto 4 del contrato).
- **`shell/modals/TableModal.svelte`** (`app.ui.modal = { type: 'table' }`) —
  «🪑 La mesa» desde DENTRO de una partida: lista de dispositivos con 💤 y
  acceso al menú de cada uno («⛔ Sacarlo de la partida»). Es el rescate cuando
  un móvil se queda sin batería y la fase espera por él. **Cada juego debe
  ofrecerlo en su menú ⋯.**
- **`shell/SeatPicker.svelte`** — «¿quién juega?» + orden de mesa, común a las
  17 pantallas de «Empezar partida».

---

## Postura del móvil: mesa · mano · equipo (julio 2026 · B28)

Criterio de Iván, y manda sobre el resto del contrato: **cómo se sostiene el
móvil en cada juego decide cómo tiene que ser su UI**. Son dos diseños opuestos
y confundirlos rompe el juego o lo hace incómodo.

### 🍽️ MESA — el móvil se queda plano y desbloqueado sobre la mesa
El jugador no lo está mirando: habla, discute y solo lo coge cuando le toca. En
Hombres Lobo pasa de noche **y de día**. Cualquiera puede echar un vistazo a los
móviles de al lado, así que:

1. **La pantalla EN REPOSO es idéntica en todos los móviles.** Mismo texto,
   mismo alto, mismos botones, mismos colores. Nada que dependa de tu rol, tu
   carta, tu bando o tu información puede verse sin un gesto tuyo.
2. **Prohibidos los chivatos de FORMA**, que se leen de reojo aunque no se lea
   el texto: un botón que solo tienes tú, un borde o fondo de color por bando,
   un contador que solo ves tú, un panel más largo, un icono distinto.
3. **Lo secreto vive tras un gesto explícito** (👁 / 🎴) y **se auto-oculta**
   (~12 s o al cambiar de fase). Las acciones privadas de día se abren desde la
   carta, no desde la pantalla principal.
4. **El punto de entrada para actuar es el mismo para todos**: quien no está
   llamado, al tocarlo, recibe «no es tu turno» — así tocar no delata.
5. El diario y la voz nunca dicen quién actuó ni qué vio.

### 🃏 MANO — el móvil se sujeta mirando hacia ti, como una mano de cartas
Nadie va a dejarlo boca arriba: *es* tu baraja. Aquí esconder estorba.

1. **Tu mano está siempre a la vista, sin gestos**: nada de «👁 Ver mi carta»
   para lo que necesitas en cada turno.
2. **Todo lo de decidir cabe en una pantalla**: efectos, costes y lo público de
   los demás (descartes, monedas, fichas), sin abrir modales ni hacer scroll.
3. La referencia completa, plegada en el propio panel.

### 👥 EQUIPO — un móvil por persona, pero el secreto es del equipo, que se sienta junto
Lo tuyo lo pueden ver los tuyos; el problema es el equipo rival. Se diseña como
**mano** hacia dentro, con un aviso claro de que esa pantalla no la puede ver el
rival, y sin nada que el rival pueda deducir mirando de lejos.

### Los 17, clasificados
- **🍽️ Mesa**: Hombres Lobo, Una Noche, El Espía, Insider, El Camaleón,
  Shadow Hunters, Good Cop Bad Cop, Ávalon, Secret Hitler, Two Rooms
  (excepto el acto deliberado de enseñar la carta, que es de mano).
- **🃏 Mano**: Love Letter, Coup, Skull.
- **👥 Equipo**: Codenames, Decrypto, Wavelength, Captain Sonar.

En los mixtos manda la fase: en Ávalon y Secret Hitler el reposo es de mesa y
los momentos privados (ver los decretos, investigar) son de mano y breves.

---

## Pasada de claridad: reescribir la pantalla entera (julio 2026 · B29)

Iván: «Aprovecha para repensar toda la UI. Por ejemplo, en la pantalla de intro
del juego (antes de empezar a jugar) ahora sale el nombre del juego en el header
+ de nuevo justo abajo en la sección introductoria. Aprovecha para reescribir
TODA la UI para que todo quede mucho más intuitivo y claro».

No es una lista de retoques: es permiso para **rehacer la pantalla** si sale
mejor. Reglas:

1. **Un dato, un sitio.** Nada se dice dos veces en la misma pantalla. Si la
   cabecera ya dice a qué juegas, la tarjeta de debajo no lo repite; si el botón
   dice «Empezar partida», el título no dice otra vez «Empezar partida».
2. **Jerarquía de tres alturas**: (a) lo que hay que hacer AHORA, arriba, grande
   y sin scroll; (b) el contexto que necesitas para decidirlo; (c) la referencia
   y lo accesorio, plegado o al pie.
3. **Menos tarjetas.** Una tarjeta por IDEA, no por párrafo. Si dos tarjetas
   seguidas se leen como una sola cosa, son una sola cosa.
4. **Verbos, no etiquetas.** Los botones dicen la acción y su consecuencia; los
   títulos dicen qué es esa pantalla en el juego, no cómo se llama en el código.
5. **Vocabulario estable.** El mismo concepto se llama igual en el catálogo, el
   lobby, la partida, la ayuda, el tutorial y la voz.
6. **Fuera el ruido.** Quita el texto que solo explica la app a sí misma
   («la app custodia las cartas y baraja…») cuando no cambia lo que haces;
   conserva lo que enseña a jugar o evita un error.
7. **Cabe en un móvil.** La acción principal se ve sin desplazar. Si no cabe,
   reordena o pliega, no encojas la letra.
8. **La primera pantalla de cada juego** (el lobby) tiene un solo trabajo:
   decir de qué va en dos líneas y dejar tres caminos claros — aprender
   (tutorial), consultar (cómo se juega) y jugar (empezar).

---

## Una sola puerta a tu carta (julio 2026 · B34)

Iván: «algunos juegos siguen teniendo un botón "Ver mi carta" y otro "Mi carta y
las reglas"». Regla, sin excepciones:

1. **Tu carta se abre desde UN solo sitio en cada pantalla.** En los juegos de
   **mesa** ese sitio es la pastilla flotante (`shell/CardFab`), que es idéntica
   en todos los móviles y está en todas las fases: los juegos **no** añaden su
   propio «👁 Ver mi carta» en el cuerpo. En los de **mano/equipo** es al revés:
   la carta vive en la pantalla y el flotante es solo «📖 Reglas».
2. **Actuar no es «ver mi carta».** Las cortinas de privacidad de B28 abren un
   TURNO o una ACCIÓN, y se rotulan por lo que hacen («👁 Abrir mi turno»,
   «🗡️ Abrir la mira»), nunca «ver mi carta». Si una pantalla necesita las dos
   cosas, son dos verbos distintos y se nota.
3. **Un nombre por cosa, en los 17 juegos.** «Mi carta» es tu identidad o tu
   mano; «las reglas» es la referencia del juego; «la chuleta» no existe como
   tercer nombre. Lo mismo en la voz, la ayuda y el tutorial.
4. Ningún juego repite en su pantalla algo que ya esté en el flotante, ni al
   revés: si la mano está en pantalla (mano/equipo), el flotante no la enseña.

**Excepción única**: durante el REPARTO (la fase en la que cada uno memoriza su
carta y confirma) la pantalla sí puede tener su propio botón grande, porque ahí
la instrucción es el contenido de la pantalla. En cuanto empieza la partida, la
única puerta es la pastilla.
