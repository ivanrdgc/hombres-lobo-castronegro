# Auditoría de roles — jugabilidad, secreto y disimulo

> La [tercera auditoría (23-07)](#tercera-auditoría-23-07--fidelidad-al-juego-original-en-los-tres-juegos)
> está al final: cubre los TRES juegos contra las reglas originales, con las
> correcciones aplicadas, las suites e2e nuevas y las dudas abiertas para Iván.

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
   pantalla con disimulo y confirma. Cada palabra pronunciada se **quema**, y
   se RENUEVA solo si otro rol podría volver a llamar a ese jugador (el
   Gaitero siempre que esté en juego — re-llama a sus encantados cada noche —;
   el Infecto solo mientras conserve su mordisco). La nueva se enseña en la
   MISMA pantalla de confirmar, antes del toque; sin reutilizador posible, el
   panel aclara «tu palabra no cambia». Despiertan por NOMBRE DE ROL solo los
   pasos cuyo protagonista ya se sabe aludido (vidente, lobos…: conoce su
   carta).
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
| 💘 Cupido | Enamorados llamados por palabra clave n1; con un REUTILIZADOR en juego (Gaitero o Infecto, o composición secreta que los active) sus palabras se reservan y rotan — la nueva a la vista ANTES de confirmar (B9). Llamada falsa si Cupido es fantasma. | ✔ |
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
| 🧛 Infecto | 🛠 **Rediseñado**: decisión muda (sin locución) + paso nuevo `infectado` — la voz llama UNA palabra (la del mordido; un señuelo las noches sin infección, con espera humana), el mordido confirma y la noche siguiente caza con la manada. Su palabra solo rota si además juega el Gaitero (el mordisco es la última llamada posible del Infecto). Su poder queda invisible para la mesa (crónica y amanecer no lo mencionan). | ✔ |
| ⭐ Alguacil | Cargo público; elección, voto doble y sucesión a la vista. | ✔ |

## Casos límite verificados (tests / e2e)

- Infección con víctima **protegida por el Defensor** (o el Actor-defensor):
  no hay mordisco → no hay infección → suenan señuelos; el poder se pierde en
  vano (documentado en la ayuda del rol). La **cura de la Bruja** NO impide la
  infección (llega después del mordisco).
- Paridad inmediata: en mesa de 4, infectar ya iguala 2-2 y cierra la partida
  al alba (motor correcto; el e2e usa 5 jugadores para ver la noche 2).
- Palabras: la llamada real y la falsa comparten piezas, número de palabras
  (una) y compás (±400 ms verificado con reloj simulado); ningún señuelo
  coincide jamás con la palabra viva de un jugador ni se repite entre noches.
- Partidas antiguas sin palabras clave (empezadas antes de este despliegue):
  el paso pasa de largo y el mordido se entera por su carta, como antes.
- `keywordsActive` ahora también se enciende con el Infecto en juego (antes
  solo Cupido/Gaitero).
- Al arrancar la partida, todo dispositivo corta su lectura local en voz alta
  (explicación del lobby, detalle de rol): nada se solapa con la primera
  locución del narrador (B8).

## Verificación

134→140 tests de motor y escenas (incluida la paridad temporal real/falsa de
la llamada de la sangre) · `e2e-infecto.mjs` nuevo (llamada, panel neutral en
los demás, manada n2, señuelos automáticos, 🧛 en el final) · `e2e-gaitero` y
`e2e2` re-ejecutados en verde contra la v2 desplegada · 12 clips nuevos
pre-generados (`npm run clips`).

---

# Tercera auditoría (23-07) — fidelidad al juego original, en los TRES juegos

Ámbito: **cada rol y cada funcionalidad** de Los Hombres Lobo (28 roles +
Alguacil), Una Noche (12 roles) y El Espía, contrastados con las reglas de los
juegos originales (Los Hombres Lobo de Castronegro + expansiones, One Night
Ultimate Werewolf, Spyfall). Preguntas guía: ¿se disimula bien en una mesa
real?, ¿todas las acciones nocturnas se pueden completar?, ¿las interacciones
entre roles están contempladas?, ¿puede colgarse la partida por algún camino?
Los hallazgos van marcados 🛠 (arreglados en este commit) o 💬 (duda/decisión).

## Correcciones aplicadas 🛠

1. **HL · Partida colgada si moría el designado del Cabeza de Turco.** Tras un
   empate, el Cabeza de Turco designa al ÚNICO registrador del voto siguiente.
   Si los lobos (o la flecha del Cazador) lo mataban antes de ese voto, NADIE
   podía registrar: partida muerta en silencio. Ahora, al amanecer (y tras cada
   flecha) el voto vuelve al pueblo con aviso en la crónica.
   (`runDawn`/`hunterShoot`; e2e `e2e-hl-pueblo.mjs` lo reproduce entero.)
2. **HL · El poder del Juez se perdía si lo pulsaba tras el juicio.** El botón
   vive en su carta durante todo el día, pero la segunda votación solo se abría
   al RESOLVERSE un juicio; pulsado después (votesLeft ya a 0) consumía el
   poder sin abrir nada. Ahora, con el juicio del día ya resuelto, la segunda
   votación se abre EN EL ACTO (regla oficial: la exige tras la primera).
   (`armJuez`; e2e `e2e-hl-roles.mjs`.)
3. **Una Noche · La carta de El Doble arrastrada valía «Aldeano» (regla de la
   casa) → ahora vale el ROL COPIADO (regla oficial).** Si el Ladrón/la
   Alborotadora mueven la carta doble a otra silla, quien acabe con ella gana y
   muere como el rol que El Doble copió (sin saberlo), exactamente como falla
   el juego original. Un doble que nunca copió (p. ej. pescado del centro por
   el Borracho) sigue contando como Aldeano. (`finalRoleOf`; tests nuevos.)
4. **Una Noche · Esbirro sin lobos: victoria mal repartida si SOLO moría él.**
   Regla oficial: sin lobos en juego, el Esbirro gana si muere alguien QUE NO
   SEA esbirro; si el único caído es el propio Esbirro, gana el Pueblo (cazó
   al único hombre del bando lobo). Antes ese caso lo daba a los lobos.
   (`checkWinner`; tests nuevos.)
5. **Una Noche · La Vidente ahora puede «No mirar nada»** (script oficial:
   *may* — mirar es opcional, como ya lo eran robar o intercambiar). Con
   reflejo en su historial («decidiste no mirar»). (`seerSkip` + panel.)
6. **Una Noche · La flecha del Cazador ya no puede apuntar a un caído** (en un
   empate, su pareja de condena salía aún tocable en la parrilla).
7. **Una Noche · Blindaje: la Alborotadora no puede intercambiarse a sí misma**
   (la UI ya lo impedía; ahora también la transacción, como El Doble-alborotadora).
8. **iPhone · Voz muda (403) al entrar por `*.firebaseapp.com`.** Cada site de
   Hosting responde en dos dominios, pero la clave TTS solo admite referers
   `*.web.app`: quien entraba por la URL vieja se quedaba sin síntesis.
   `index.html` canonicaliza a `.web.app` antes de cargar nada (B11).
9. **El Espía · gancho de test**: con la semilla e2e cada «minuto» dura 4 s,
   lo que por fin permite probar el flujo de tiempo agotado de punta a punta.

## Una Noche — auditoría rol a rol (contra One Night oficial)

| Rol | Regla original | Veredicto |
|---|---|---|
| 👯 El Doble | Copia mirando la carta de OTRO; roles instantáneos (vidente/ladrón/alborotadora/borracho) los ejecuta en su turno; lobo/masón/esbirro/insomne despierta con ellos; cazador/curtidor/aldeano pasivos. Su carta, una vez copiada, ES el rol copiado esté donde esté 🛠. | ✔ |
| 🐺 Lobo | Se reconocen; el lobo SOLITARIO puede mirar 1 del centro (opcional ✔). Con El Doble-lobo se ven mutuamente. | ✔ |
| 😈 Esbirro | Ve a los lobos (ellos a él no); sin lobos se le avisa. Victoria: con lobos, la de ellos; sin lobos, gana si cae alguien que no sea él 🛠. | ✔ |
| 🧱 Masón | Se reconocen; el masón solo sabe que el otro está en el centro. | ✔ |
| 🔮 Vidente | 1 carta de jugador O 2 del centro… o nada 🛠 (oficial: *may*). | ✔ |
| 🃏 Ladrón | Roba y MIRA su nueva carta; puede no robar. Actúa por carta REPARTIDA aunque se la hayan… (nadie puede antes: es wake 5, el doble ya actuó). | ✔ |
| 🌀 Alborotadora | Intercambia las de OTROS dos, sin mirar; puede no hacerlo. | ✔ |
| 🍺 Borracho | Cambio con el centro OBLIGATORIO y a ciegas (sin skip ✔ oficial). | ✔ |
| 😴 Insomne | Mira su propia carta al final; el Doble-insomne mira la suya también. | ✔ |
| 🧑‍🌾 Aldeano · 🏹 Cazador · 🪢 Curtidor | Sin acción nocturna (sin paso: correcto, la voz no debe llamarlos). Cazador: si muere en el juicio, su «voto» también cae (aquí: elige diana tras caer, modelo registrador). Curtidor: gana SOLO si lo linchan; su muerte anula la victoria lobuna; compatible con victoria del pueblo si además cae un lobo. | ✔ |
| ⚖️ Votación | Una persona registra: perdón, uno o VARIOS (empate → caen todos, oficial). Cadena de cazadores sin bucles (`huntersShot`). | ✔ |
| 👻 Anti-pistas | Cada rol de acción del mazo tiene paso aunque esté en el centro; llamada, re-llamadas y cadencia idénticas exista o no (auditoría 22-07). | ✔ |

## Los Hombres Lobo — lo revisado en esta pasada (además de la tabla del 21-07)

- **Cazador**: dispara al morir por CUALQUIER causa (lobos, veneno, pena,
  linchado) salvo castigo del Anciano — oficial. Muerte de noche → dispara al
  amanecer ANTES del debate; la voz anuncia víctima y rol. ✔ (e2e2)
- **Anciano**: primera dentellada sin morir Y SIN enterarse nadie (ni él ✔);
  castigo (pueblo/bruja/flecha) → poderes fuera, con noches aceleradas si la
  muerte es pública y disimulo completo si no. ✔ (e2e-hl-roles: dentellada)
- **Cupido/enamorados**: pareja de bandos cruzados = objetivo «quedar los 2
  últimos»; victoria `enamorados` si son los 2 últimos (cualquier bando) ✔;
  muerte de pena encadenada (también con flecha y óxido de por medio) ✔.
- **Defensor**: mismo protegido 2 noches seguidas prohibido ✔ (e2e); anula el
  mordisco ENTERO (también del Feroz/Albino) y la infección ✔; NO protege del
  veneno (oficial) ✔.
- **Zorro**: trío = objetivo + 2 vecinos VIVOS; con lobo conserva olfato, sin
  lobo lo pierde (y sigue despertando para disimular) ✔ (e2e ambos casos).
  Cuenta a los infectados como lobos (correcto: ya cazan) ✔.
- **Actor**: 3 papeles de un solo uso (vidente/defensor/cuervo); papel usado
  desaparece de su panel ✔ (e2e); hereda las reglas del papel (defensor: no
  repetir protegido) ✔; sin papeles, panel de disimulo ✔.
- **Cuervo**: +2 votos anunciados al alba ✔; si el señalado amaneció muerto,
  la voz lo cuenta con sorna sin delatar nada ✔.
- **Domador**: gruñido si un vecino vivo caza con la manada (incluye
  infectados y transformados) o si él mismo está infectado (oficial) ✔
  (e2e verifica gruñido ↔ vecindario real).
- **Juez**: segunda votación anónima; ahora también si la exige tras el
  juicio 🛠; el castigo del Anciano lo desarma ✔.
- **Sirvienta**: interviene ANTES de revelarse la carta del linchado; el
  muerto se entierra con la carta de Sirvienta a la vista (oficial) y ella
  hereda el rol DESDE CERO (poderes frescos, sin estados) ✔; no puede si está
  enamorada ✔; ventana con cuenta atrás idéntica para todos ✔ (e2e-sirvienta,
  rama «acepta», encadenada con la sucesión del Alguacil).
- **Cabeza de Turco**: muere él en los empates ✔; designa quién registra el
  voto del día siguiente ✔; si el designado muere antes, el voto vuelve al
  pueblo 🛠 (antes: partida colgada).
- **Tonto del Pueblo**: se salva del linchamiento, pierde el voto (panel de
  juicio fuera ✔ e2e), no cuenta como «resistencia» en la paridad ✔, y puede
  seguir registrando la decisión colectiva en la app (es un anotador, no un
  voto) ✔.
- **Gitana**: pregunta propia o de la lista; los espíritus responden al alba
  todos a una ✔ (e2e con pregunta escrita a mano).
- **Alguacil**: elección el día 1, voto doble (informativo: el recuento es de
  la mesa), sucesión al morir — también si muere linchado con la Sirvienta de
  por medio ✔ (e2e encadena ambos).
- **Ladrón**: 2 cartas sobrantes reales en el centro ✔; «ambas de lobo →
  cambio obligado» ✔ (motor); al robar, el guion de la noche se RECALCULA esa
  misma noche ✔ (e2e ambas ramas: roba / está en el centro).
- **Lobo Feroz / Albino**: segunda víctima mientras la manada esté intacta ✔;
  el Albino solo puede traicionar a la manada en noches pares ✔; su víctima
  cuenta como muerte lobuna (desarma al Feroz) ✔; victoria del Albino solo
  como único superviviente ✔; paridad con Albino vivo no cierra la partida ✔.
- **Perro Lobo / Niño Salvaje**: elección n1; transformación al morir el
  modelo (también de día) ✔; ambos cuentan para la paridad y despiertan con
  la manada ✔.
- **Sectario**: mitades por asiento; victoria al eliminar la mitad contraria ✔.
- **Ángel**: gana si muere la noche 1 (cualquier causa) o en el primer
  juicio ✔; después es un aldeano más ✔.

## El Espía — auditoría de mecánicas (contra Spyfall oficial)

| Mecánica | Regla original | Veredicto |
|---|---|---|
| Reparto | 1 espía; papeles únicos del lugar al resto; primer preguntador = repartidor (rota por ronda); lugares sin repetir hasta agotar el mazo. | ✔ |
| Parar el reloj | Una acusación por jugador y ronda; reloj congelado durante la votación; un «no» la tumba y devuelve el tiempo restante. | ✔ |
| Condena | Unanimidad de todos menos el acusado (el acusador cuenta como sí). | ✔ |
| El espía se revela | Solo DURANTE la ronda (nunca en votación ni tras el tiempo — oficial). | ✔ |
| Tiempo agotado | Acusaciones por turnos desde el primer preguntador, sin más debate; pases; si nadie condena, el espía escapa. | ✔ (e2e nuevo) |
| Puntuación | Espía: +2 escapa, +4 condena errada, +4 acierta el lugar. Agentes: +1, +2 el iniciador de la condena acertada. | ✔ (e2e ambas) |
| Salidas | Espía que abandona → victoria de agentes; sin quórum → ronda disuelta; reparto nuevo si alguien sale en el reveal. | ✔ |

## Cobertura e2e tras esta auditoría (17 suites, todas en verde)

| Suite | Cubre |
|---|---|
| `e2e.mjs` / `e2e2.mjs` | Mesa, sesiones, expulsión; manual; auto con cupido/defensor/cuervo/tonto/cazador + flecha + alguacil + dead-peek. |
| `e2e-gaitero` · `e2e-infecto` · `e2e-caballero` | Encantados+palabras rotadas; llamada de la sangre + señuelos + B9; óxido inmediato. |
| `e2e-hl-roles` 🆕 | Actor (3 papeles, descarte), Defensor (auto-protección y no-repetir), Zorro (con/sin rastro), Cuervo, Domador (oso ↔ vecinos reales), Anciano (1ª vida), Juez tras el juicio 🛠. |
| `e2e-hl-pueblo` 🆕 | Gitana (pregunta propia), Tonto (salvado y mudo), Cabeza de Turco (empate + designación), designado muerto 🛠. |
| `e2e-sirvienta` 🆕 | Sirvienta ACEPTA (herencia de rol desde cero, entierro con su carta) + sucesión del Alguacil en el mismo juicio. |
| `e2e-ladron` 🆕 | Ladrón roba del centro (recálculo del guion) o cae al centro (paso que avanza solo). |
| `e2e-una-noche` | Flujo completo, Doble, insomne, revancha. |
| `e2e-una-roles` 🆕 | Mazo con TODOS los roles de acción; invariante de permutación de cartas; empate doble; historial final; ganadores contrastados con reglas oficiales reimplementadas aparte. |
| `e2e-una-cazador` 🆕 | Cazador/Curtidor adaptativo: empate con flecha, parrilla sin muertos, ganadores oficiales. |
| `e2e-espia` · `e2e-espia-timeup` 🆕 | Acusaciones, fallo+condena, adivinanza; tiempo agotado + pases + escape del espía. |
| `e2e-guiado` · `e2e-deadpeek` · `e2e-navegacion` · `e2e-multimesa` | Modo guiado, espectadores/abandonos, rutas, partidas simultáneas. |

## Dudas y desviaciones deliberadas 💬 (decisión de Iván)

1. **Sirvienta solo en linchamientos.** El texto oficial habla de intervenir
   «antes de revelarse la carta del jugador eliminado» — aplica también a
   muertes nocturnas. Hoy solo se ofrece en el juicio (como en la v1).
   ¿La extendemos al amanecer? (Coste: ventana secreta tras cada muerte
   nocturna, con más pausas.)
2. **Defensor con «No proteger a nadie».** Oficial estricto: protege CADA
   noche a alguien. El skip es cómodo y no delata (la voz no cambia), pero es
   una licencia. ¿Se quita?
3. **Gaitero auto-encantable** (regla de la casa ya documentada en el panel):
   oficial encanta a otros. No afecta a su victoria (exige a los DEMÁS). Se
   mantiene.
4. **Caballero: óxido en el MISMO amanecer** (decisión de la mesa, B1;
   oficial lo demora una noche). Se mantiene.
5. **Infecto bloqueado por el Defensor: el poder se da por gastado** (pulsó
   «infectar»; el panel ya avisa de que puede perderse en vano). Alternativa
   oficial-friendly: devolvérselo. Se mantiene gastado.
6. **Una Noche, Doble-insomne**: despierta a la vez que la Insomne real
   (oficial: llamada aparte justo después). Mismo resultado informativo,
   una llamada menos. Se mantiene.
7. **Espía**: sin límite de rondas (el original sugiere jugar a N rondas o
   hasta X puntos); el marcador acumulado ya lo permite decidir en mesa.
8. **HL, vidente**: obligada a mirar cada noche (oficial); sin skip salvo
   poderes perdidos — fiel, pero distinta de la Vidente de Una Noche (esa sí
   puede pasar, también oficial). Ojo al explicar las dos.

## Verificación

`npm run check` 0 errores · 173 tests unitarios (nuevos: doble arrastrado
oficial, esbirro-solo, victoria con doble-lobo trasladado) · 17/17 suites e2e
en verde (108 s, semilla de test) · build limpio · desplegado a v2 y
producción con este commit.
