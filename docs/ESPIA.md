# El Espía (Spyfall) — Diseño del segundo juego (julio 2026)

Contrato de diseño del segundo juego de la mesa: **El Espía**, implementación
fiel de las reglas oficiales de *Spyfall* (Alexandr Ushan). Además de un juego
completo, es la prueba de fuego de la arquitectura `GameDefinition`: el shell
(mesa, identidad, presencia, voz, modales, URLs) se reutiliza entero.

## Reglas oficiales implementadas

- **3–8 jugadores.** Cada ronda, todos reciben la MISMA localización y un
  papel en ella… menos uno: el **espía**, que no sabe dónde está.
- **8 minutos por ronda** (elegible 5/8/10; oficial 8). El **repartidor** hace
  la primera pregunta llamando a alguien por su nombre; el interrogado pregunta
  después a quien quiera. Prohibido devolver la pregunta a quien te la acaba de
  hacer (regla social: la app la recuerda, no la vigila).
- **Parar el reloj (acusar).** Cada jugador puede parar el reloj UNA vez por
  ronda para acusar. Votan todos menos el acusado (el acusador cuenta como sí).
  Voto **unánime** → se revela la carta y la ronda termina (¡aunque sea
  inocente!). Si alguien discrepa, el reloj se reanuda.
- **La confesión del espía.** En cualquier momento de la ronda (nunca durante
  una votación), el espía puede revelarse e intentar adivinar la localización.
  Acierte o falle, la ronda termina.
- **Fin del tiempo.** Nadie habla más del caso. Empezando por el repartidor y
  en orden de mesa, cada jugador acusa (o pasa) y se vota igual. El primer voto
  unánime termina la ronda; si nadie es condenado, **gana el espía**.
- **Puntuación oficial** (rondas acumulativas, marcador en pantalla):
  - Espía: **+2** si nadie es condenado · **+4** si condenan a un inocente ·
    **+4** si adivina la localización.
  - Agentes (victoria): **+1** cada uno · **+1 extra** a quien inició la
    acusación acertada (durante la ronda o tras el tiempo).
- El repartidor **rota** cada ronda en el orden de mesa. La localización no se
  repite hasta agotar el mazo (30 localizaciones propias, 7 papeles cada una).
- **La lista de localizaciones es pública** (como la carta de referencia del
  juego físico): todos pueden consultarla — el espía para adivinar, los agentes
  para calibrar sus respuestas.

## Estado (`group.game`, con `espia: true` como discriminante)

```
phase: reveal | play | timeup | end     (la votación es un overlay: game.vote)
round, startedAt, playerIds (orden de mesa congelado), names {pid→nombre}
dealerId, spyId, locationId, roles {pid→papel}, seen {pid→bool}
durationMs, deadline (epoch | null), voteSeq
accusedUsed {pid→bool}
vote: null | { accuserId, accusedId, votes {pid→bool}, frozenMs, fromTimeup }
timeupTurn: number | null, usedLocations, scores {pid→n}, history [...], outcome
```

- **Todo vive en `group.game`**: El Espía NO escribe en los docs de jugador
  (cero riesgo de esquema; los campos de Hombres Lobo no se tocan). Mismo
  modelo de confianza que Hombres Lobo: el estado es legible por clientes,
  la UI decide qué enseña (partida presencial entre amigos).
- **Temporizador**: `deadline` (epoch). Al acusar se congela
  (`frozenMs = deadline − now`); si el voto fracasa, `deadline = now + frozenMs`.
  Cuando expira, CUALQUIER dispositivo intenta `timeUp()` (tx con guarda:
  primero gana, idempotente) — sin conductor único ni punto de fallo.
- El altavoz (voz) es `masterId`, elegido en «Empezar» (recordado en
  `lastNarratorId`, con la misma lógica de relevo por inactividad).

## Pantallas

- **Lobby** (`/g/<mesa>/espia`): introducción con lectura en voz alta local,
  «Cómo se juega» (modal), «📍 Las localizaciones» (modal), Empezar.
- **Empezar** (`/g/<mesa>/espia/empezar`): quién juega + orden (SeatPicker
  compartido del shell, extraído de Hombres Lobo: mismos data-a), dispositivo
  de la voz (chips + relevo por inactividad), duración (5/8/10, recordada en
  `settings.espiaMin`), avisos 3–8, ¡Empezar!
- **Partida** (`/g/<mesa>/espia/partida`):
  - *reveal*: puerta de revelado (cartas boca abajo), lista de espera, y
    «▶️ Poner el reloj en marcha» cuando todos confirman.
  - *play*: cronómetro grande, carta propia mini (desplegable, se auto-oculta),
    quién pregunta primero, «🛑 Acusar» (una vez), «🎭 Adivinar el lugar»
    (solo el espía), y la parrilla pública de localizaciones.
  - *vote* (overlay): «A acusa a B» — votan todos menos ambos; cualquier ❌
    reanuda el reloj al instante.
  - *timeup*: turnos de acusación desde el repartidor; acusa o pasa.
  - *end*: espía y localización revelados, desenlace, puntos de la ronda,
    marcador acumulado, historial de rondas, «▶️ Otra ronda» / «🏁 Terminar».
- **Espectadores** (dispositivos fuera de la ronda): cronómetro, votaciones y
  marcador — nunca la localización ni los papeles hasta el final de la ronda.

## Voz (segundo narrador, mismo secuenciador)

`createNarrator` de `core/narrator` con inyección propia (instalado junto al
de Hombres Lobo; cada uno se activa solo con su `currentGame`):
introducción de la ronda 1, «nuevas identidades», arranque del reloj con
«empieza preguntando X», avisos de mitad / último minuto / diez segundos,
«¡alto! A acusa a B», turnos tras el tiempo y desenlace con nombres.
Piezas estáticas pregeneradas (build-clips ampliado + test de manifest propio);
nombres y desenlaces por síntesis en vivo con precalentamiento al abrirse la
votación.

## Refactor que desbloquea esto (pendiente desde el rediseño)

Las **acciones de grupo** genéricas (crear/unirse/expulsar/asientos/ajustes/
narrador/latido…) salen de `games/hombres-lobo/actions.ts` a
`core/sync/group-actions.ts`; Hombres Lobo las re-exporta (compatibilidad) y el
shell importa del core. `SeatPicker` (lista quién-juega + arrastre de orden) se
extrae a `shell/` y lo usan ambas pantallas de inicio.
