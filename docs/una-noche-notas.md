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
