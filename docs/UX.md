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
