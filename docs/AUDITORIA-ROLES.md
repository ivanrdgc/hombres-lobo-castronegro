# Auditoría de roles — jugabilidad, secreto y disimulo

Fecha: 2026-07-21 (segunda auditoría completa; la primera fue `e20d361`).
Ámbito: los 26 roles + Alguacil, sus efectos sobre otros jugadores, y los tres
contratos transversales de la mesa. Los hallazgos de esta pasada están
marcados con 🛠 (arreglados en el commit de esta auditoría).

## Los tres contratos de la mesa

1. **De día, todas las pantallas se ven IGUALES** (móviles desbloqueados sobre
   la mesa). Toda información o acción privada vive DENTRO de la carta plegada
   («👁 Mostrar mi rol»), que es el único canal privado sancionado y se
   auto-oculta a los 12 s. Excepciones públicas por naturaleza: los pendientes
   de jugadores ya muertos/revelados (flecha del Cazador, sucesor del
   Alguacil, Cabeza de Turco) y las pantallas de los espectadores muertos
   (ven marcas 🧛🐾💘🎶 y pueden espiar roles: están fuera de la partida).
2. **De noche, todo lo que un jugador deba saber en secreto se comunica con
   PALABRAS CLAVE**: la voz llama, solo el aludido se reconoce, mira su
   pantalla con disimulo y confirma. Cada palabra pronunciada se **quema** y
   rota (la nueva se enseña en la MISMA pantalla de confirmar, antes del
   toque): quien pueda ser llamado más de una noche jamás oye la misma
   palabra dos veces. Despiertan por NOMBRE DE ROL solo los pasos cuyo
   protagonista ya se sabe aludido (vidente, lobos…: conoce su carta).
3. **La voz disimula con SEÑUELOS**: si en algún momento de la partida una
   llamada real es posible, las noches sin llamada real suenan palabras sin
   dueño y una espera humana muestreada (4–9 s). Señuelos sin repetición
   entre noches y con calendarios separados (encantados desde el principio
   del mazo; la llamada de la sangre desde el final). Con la muerte del rol
   emisor hecha pública la llamada puede cesar: ya no hay nada que ocultar.

Inventario de canales secretos nocturnos: **enamorados** (Cupido, noche 1),
**encantados** (Gaitero, cada noche), 🛠 **infectado** (Infecto, la noche del
mordisco — nuevo en esta auditoría). No hay más efectos entre jugadores que
exijan llamada: el resto son automáticos y públicos (óxido, oso, cuervo…),
propios del actor (visiones, pociones…) o deducibles solo por su dueño
(transformación del Niño Salvaje).

## Auditoría rol a rol

| Rol | Efectos sobre otros / canal | Veredicto |
|---|---|---|
| 🐺 Hombre Lobo | Se reconocen por rol (paso propio); víctima al alba (público). | ✔ Jugable |
| 🧑‍🌾 Aldeano / 👥 Aldeano-Aldeano | Sin secretos (el A-A se anuncia al empezar: público a propósito). | ✔ |
| 🔮 Vidente | Resultado solo en SU panel + historial en su carta. | ✔ |
| 🧪 Bruja | Ve a la víctima en su paso (info propia). Veneno: muerte pública al alba. Sin pociones sigue despertando (disimulo). | ✔ |
| 🏹 Cazador | Dispara al morir: pendiente público (ya está muerto y revelado). | ✔ |
| 💘 Cupido | Enamorados llamados por palabra clave n1; con Gaitero en juego sus palabras se reservan y rotan. Llamada falsa si Cupido es fantasma. | ✔ |
| 🃏 Ladrón | Cambio de carta privado; los pasos de la noche se recalculan al instante (probado con lobo/roles nocturnos). | ✔ |
| 👧 Niña | Espía físicamente; la app ni ayuda ni delata. | ✔ |
| 🛡️ Defensor | Protección invisible (también anula la infección: sin mordisco no hay contagio). | ✔ |
| 👴 Anciano | Aguanta el primer mordisco SIN enterarse nadie (tampoco él: ni su carta lo marca — oficial). Castigo del pueblo: público. | ✔ |
| 🐐 Cabeza de Turco | Muerte por empate y designación: públicas por naturaleza. | ✔ |
| 🤪 Tonto | Revelación al lincharlo: pública (es la regla). | ✔ |
| 🎶 Gaitero | Encantados llamados TODOS cada noche por palabra clave, palabras quemadas y rotadas; auto-encantable; señuelos si es fantasma u oculto. | ✔ |
| 🔯 Gitana | Pregunta secreta de noche; respuesta pública al alba (regla). | ✔ |
| 🐦‍⬛ Cuervo | Marca anunciada al alba a todos (regla); sin voz delatora de noche. | ✔ |
| 👭 Hermanas / 👨‍👨‍👦 Hermanos | Se reconocen n1 por rol (solo ellas/os saben quiénes son). | ✔ |
| 😇 Ángel | Condición pasiva; su carta le recuerda el objetivo. | ✔ |
| 🦊 Zorro | Resultado propio; si pierde el olfato la voz sigue llamándole (disimulo). | ✔ |
| ⚔️ Caballero | Óxido automático y público en el MISMO amanecer (regla de la mesa, B1). | ✔ |
| ⚖️ Juez | Botón secreto DENTRO de su carta; el anuncio de la segunda votación no le señala. | ✔ |
| 🧹 Sirvienta | Decide contrarreloj DENTRO de su carta; todos ven el mismo «el juicio se resuelve…». 🛠 Afinado: el panel «Juicio en curso…» ya no menciona a la Sirvienta (texto neutro). | ✔ |
| 🎭 Actor | Poderes propios; sin cartas restantes sigue despertando (disimulo). | ✔ |
| 🌗 Sectario | Mitades en su carta desde el reparto (estático, privado). | ✔ |
| 🐻 Domador | Gruñido público al alba (regla); cuenta también su propia infección. | ✔ |
| 🐾 Niño Salvaje | Solo ÉL conoce a su modelo → solo él puede deducir su transformación: no necesita llamada (nada es secreto PARA él). Despierta con la manada la noche siguiente; su panel de lobos y su carta se lo recuerdan. 🛠 Ayuda del rol reescrita para dejarlo explícito. | ✔ |
| 🌕 Lobo Albino | Caza con la manada; traición en paso propio (noches pares); víctima pública al alba. | ✔ |
| 🐺🔥 Lobo Feroz | Segunda víctima en paso propio; deja de despertar si cayó un lobo (público al alba). | ✔ |
| 🐕 Perro Lobo | Elección propia n1; si elige manada, se reconoce con ella esa misma noche. | ✔ |
| 🧛 Infecto | 🛠 **Rediseñado**: decisión muda (sin locución) + paso nuevo `infectado` — la voz llama SIEMPRE dos palabras (mordido + señuelo, orden sorteado), el mordido confirma con su palabra nueva a la vista, y la noche siguiente caza con la manada. Noches sin infección: dos señuelos y espera humana. Su poder queda invisible para la mesa (crónica y amanecer no lo mencionan). | ✔ |
| ⭐ Alguacil | Cargo público; elección, voto doble y sucesión a la vista. | ✔ |

## Casos límite verificados (tests / e2e)

- Infección con víctima **protegida por el Defensor** (o el Actor-defensor):
  no hay mordisco → no hay infección → suenan señuelos; el poder se pierde en
  vano (documentado en la ayuda del rol). La **cura de la Bruja** NO impide la
  infección (llega después del mordisco).
- Paridad inmediata: en mesa de 4, infectar ya iguala 2-2 y cierra la partida
  al alba (motor correcto; el e2e usa 5 jugadores para ver la noche 2).
- Palabras: la llamada real y la falsa comparten piezas, número de palabras
  (dos) y compás (±400 ms verificado con reloj simulado); ningún señuelo
  coincide jamás con la palabra viva de un jugador ni se repite entre noches.
- Partidas antiguas sin palabras clave (empezadas antes de este despliegue):
  el paso pasa de largo y el mordido se entera por su carta, como antes.
- `keywordsActive` ahora también se enciende con el Infecto en juego (antes
  solo Cupido/Gaitero).

## Verificación

134→140 tests de motor y escenas (incluida la paridad temporal real/falsa de
la llamada de la sangre) · `e2e-infecto.mjs` nuevo (llamada, panel neutral en
los demás, manada n2, señuelos automáticos, 🧛 en el final) · `e2e-gaitero` y
`e2e2` re-ejecutados en verde contra la v2 desplegada · 12 clips nuevos
pre-generados (`npm run clips`).
