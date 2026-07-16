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
