# Una Noche en Castronegro — notas y peticiones de Iván (pulido)

Seguimiento de todo lo comentado tras estrenar el juego, para no olvidar nada.
Estados: ✅ hecho · 🔧 en curso · ⏳ pendiente · 💬 aclarado (sin cambio de código)

1. ✅ **Botón ▶️ para leer en voz alta** la intro y los roles, como en el juego
   original (lectura local en el dispositivo). Intro del lobby, «Cómo se juega»
   y cada rol.
2. ✅ **Explicación completa de cada rol**, con el formato de Los Hombres Lobo
   (ayuda estructurada `when` + pasos + consejo en `role-help.ts`; modal de
   detalle `RoleDetailModal`; la carta muestra «🧭 Qué harás»).
3. ✅ **Configuración del mazo movida al lobby** (botón «Elegir mazo» → modal),
   no al pulsar «Empezar». Explicación + selección organizadas como en Los
   Hombres Lobo. «Empezar» solo elige quién juega + narrador y valida el mazo.
4. ✅ **Roles activados clicables** → abren el modal de detalle (`RoleDetailModal`)
   desde «Cómo se juega» (chips), el mazo (ℹ️) y las chips del mazo en lobby y
   empezar.
5. ✅ **Re-consultar la carta durante el juego** (`MyCard`, formato de Los
   Hombres Lobo). EXCEPCIÓN del juego: en One Night, una vez mirada, la carta
   puede cambiarte sin que lo sepas → solo se muestra la carta INICIAL con aviso
   claro de que pudo cambiar (disponible en la noche y el día).
6. ✅ **Bug audio**: «Volved a cerrar los ojos» sonaba antes de terminar la
   acción. Arreglado: llamada (abrir ojos + instrucción) → esperar acción →
   «cerrad los ojos» (nunca antes).
7. ✅ **Pausa de disimulo**: si el rol NO existe (está en el centro, paso
   fantasma), pausa humana más larga entre abrir y cerrar ojos (4–9 s), para no
   delatar que el rol no está en juego.
8. 💬 **Alborotadora original despierta aunque el Ladrón le robó la carta**: es
   CORRECTO por reglas de One Night — cada uno actúa según la carta que le TOCÓ
   al empezar, aunque luego se la roben. Añadida aclaración en «Cómo se juega».
9. (Reemplazado por 10.) ~~Poder votarse a uno mismo.~~
10. ✅ **Votación como en Los Hombres Lobo**: una persona registra la decisión
    del pueblo (condenar a alguien —puedes incluirte— o perdonar), no voto
    simultáneo. La flecha del Cazador es un pendiente (`pendingHunter`), como allí.
11. ✅ Escribir todo esto en un archivo (este).

Notas de implementación:
- Al reorganizar la votación, se retira el voto simultáneo (`votes`/`allVoted`/
  `tallyDeaths`/`resolveDay` del motor) y se usa el modelo registrador +
  `checkWinner`/`finalRolesOf`. Estado nuevo: `lynched` (decisión) y
  `pendingHunter` (cazador que debe disparar).
- Tras cualquier cambio de textos de voz: `npm run clips` y re-desplegar.

---

## Segunda tanda (22-07, tras estrenar)

12. ✅ **Una Noche al 2.º puesto** del catálogo, dejando SpyFall (El Espía) 3.º
    (`GAME_DEFS = [hombresLobo, unaNoche, espia]`).
13. ✅ **Modal del mazo bien maquetado** (bug B10): los botones ℹ️ − nº + del
    stepper usaban `.btnrow`, cuya regla global los estiraba a 3/4 del ancho y
    tapaba la ℹ️. Ahora usan clase propia `.stepper` (compacta). La ℹ️ se ve en
    cada carta al crear el mazo.
14. ✅ **Cartas en juego durante la partida** (`DeckStrip`): tira de chips con
    TODAS las cartas del mazo (la composición es pública en One Night), clicables
    → modal de detalle. Visible en reveal/noche/día, como la tira de Los HL.
15. ✅ **Disimulo del rol ausente, mejor**: la voz RE-llama a un rol que tarda,
    una o dos veces, y si se alarga suelta un recordatorio genérico («¿alguien se
    ha dormido? recordad vuestro rol»). Ocurre IGUAL en pasos reales (jugador
    lento) y fantasma (rol en el centro) — misma cadencia (`unaCallNag` 12–17 s)
    y mismas frases → el tiempo nunca delata qué hay en el centro. El nº de
    re-llamadas fantasma es aleatorio (casi siempre 0, a veces 1-2). Textos
    nuevos `STEP_NAG` + `NAG_FORGOT`; primitivo `waitOrNag` del secuenciador.
16. ✅ **Historial personal en «Mi carta»**: bajo tu carta inicial, un resumen
    privado de lo que VISTE e HICISTE esta noche (`history.ts` → `playerHistory`).
    Se ve durante la noche (se va llenando) y el día.
17. ✅ **Historial completo al final** (`EndPhase`): qué hizo cada jugador,
    agrupado por jugador, con la misma redacción que el personal.
18. ✅ **Empate en la votación** (pregunta de reglas): en One Night ORIGINAL, si
    hay empate mueren TODOS los empatados (y si nadie saca más de un voto, no
    muere nadie). Con el modelo registrador se reproduce dejando condenar a
    VARIOS a la vez (empate → caen todos), a uno, o perdonar. `castVote` pasa a
    recibir una lista; `lynched` pasa a `string[] | null`.

Extra técnico: se arreglaron 5 errores de tipos preexistentes que el `vite build`
no detecta (DayPhase/EndPhase/scenes.test) — ahora `npm run check` da 0 errores.
