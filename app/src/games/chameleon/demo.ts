// Tutorial de El Camaleón: una ronda de ejemplo continua, con quién actúa en
// cada momento y qué ve cada pantalla.
import type { DemoScript } from '../../shell/demo/types';

const WORDS = [
  'Tiburón', 'Arena', 'Faro', 'Medusa',
  'Socorrista', 'Marea', 'Coral', 'Velero',
  'Gaviota', 'Buceo', 'Isla', 'Puerto',
  'Ola', 'Cangrejo', 'Ancla', 'Naufragio',
];

export const DEMO: DemoScript = {
  id: 'chameleon',
  name: 'El Camaleón',
  emoji: '🦎',
  steps: [
    {
      icon: '🎯',
      title: 'La ronda de ejemplo',
      text: [
        'Jugáis TÚ, Bea, Carlos y David. Todos veis la misma rejilla de 16 palabras del tema «El mar». Todos sabéis cuál es la SECRETA… menos uno: el CAMALEÓN, que solo ve la rejilla y tiene que fingir.',
        'La rejilla es pública y se ve así, sin nada marcado: cuál es la secreta te lo dice tu carta privada, no la pantalla de todos.',
        'El grupo gana si lo desenmascara (y él no adivina la palabra); el Camaleón gana si pasa desapercibido o si, pillado, la acierta.',
      ],
      // Sin `hl`: esta es la pantalla PÚBLICA. Marcar aquí la secreta hacía creer
      // que la app la resalta en la rejilla que todos ven.
      visual: { kind: 'grid', words: WORDS },
    },
    {
      icon: '🎴',
      title: 'El reparto: dos cartas muy distintas',
      who: { actor: 'TODOS miráis vuestra carta a la vez, a solas, y confirmáis', others: 'la rejilla queda a la vista de todos, sin resaltar nada.' },
      text: [
        'A ti te escribe la palabra secreta: «Tiburón». A Bea (aunque nadie lo sabe) le ha tocado ser el Camaleón: su carta le dice que disimule.',
      ],
      // Las dos cartas son la MISMA carta: mismo marco, mismo emoji, mismo alto
      // y mismo texto. Solo cambia la palabra del centro, para que el móvil
      // pueda quedarse plano sin que el vecino deduzca nada de reojo.
      visual: {
        kind: 'screens',
        panes: [
          { title: 'TÚ', lines: ['🎴 Tu carta de esta ronda', '«Tiburón»', 'Una palabra del tema: es la secreta.'] },
          { title: 'Bea (tú no lo ves)', lines: ['🎴 Tu carta de esta ronda', '«Camaleón»', 'Idéntica por fuera: de reojo no se distinguen.'] },
        ],
      },
    },
    {
      icon: '🗣️',
      title: 'Las pistas, por turnos y en voz alta',
      who: {
        actor: 'La app marca de quién es el turno; quien acaba de hablar confirma en el móvil con el botón de ya he dicho mi pista',
        others: 'nadie más toca el móvil, salvo para releer su propia carta con el botón redondo 🎴 de la esquina o con el de ver mi carta.',
      },
      text: [
        'Carlos: «aleta». David: «peligro». Bea (¡el Camaleón, improvisando!): «playa». Te toca a ti…',
        'La pantalla siempre dice a quién le toca y quién va después. Si alguien se salta un turno por error, el botón de atrás lo devuelve.',
      ],
      ask: {
        prompt: 'La secreta es «Tiburón». ¿Qué pista das?',
        choices: [
          { label: '«Mandíbula»', good: true, reply: 'Relacionada pero no evidente: los del grupo la entienden, y Bea sigue a ciegas. Ese es el punto dulce de El Camaleón.' },
          { label: '«Escualo»', reply: 'Demasiado obvia: le acabas de regalar la palabra a Bea. Si la pillan, adivinará «Tiburón» y ganará igualmente.' },
          { label: '«Agua»', reply: 'Tan vaga que vale para media rejilla… justo lo que hace un Camaleón. Las sospechas caerán sobre TI.' },
        ],
      },
    },
    {
      icon: '👉',
      title: 'El voto, en secreto',
      who: { actor: 'Cuando ha hablado toda la mesa, cualquiera pulsa el botón de votar; luego TODOS señalan a la vez a su sospechoso (a ti mismo no)', others: 'antes de señalar se comenta en voz alta lo que ha chirriado: ese debate es media partida.' },
      text: [
        'La pista playa ha chirriado: tú, Carlos y David votáis a Bea; ella vota a David. La app espera al último voto y destapa el recuento entero: quién señaló a quién.',
      ],
      visual: {
        kind: 'screens',
        panes: [
          { title: 'TÚ (votando)', lines: ['Tocas a Bea.'], buttons: [{ label: '👉 Señalar a Bea', kind: 'danger' }] },
          { title: 'Bea (votando)', lines: ['Vota como una más para no cantarse.', 'Han votado 2/4…'] },
        ],
      },
    },
    {
      icon: '🎲',
      title: 'Los tres finales posibles',
      text: [
        'Este es el final más frecuente y el que más se olvida: si señaláis a un INOCENTE, o si hay empate en cabeza, la ronda acaba ahí mismo. El Camaleón gana 2 puntos sin tener que adivinar nada.',
        'Solo si el señalado ES el Camaleón hay última bala: tiene que acertar la palabra secreta. Si acierta, gana 1 punto; si falla, gana el grupo y suma 1 punto cada jugador que no era el Camaleón.',
      ],
      visual: {
        kind: 'board',
        rows: [
          { label: 'Señaláis a un inocente o empatáis', value: 'gana el Camaleón · 2 puntos' },
          { label: 'Lo pilláis y acierta la palabra', value: 'gana el Camaleón · 1 punto' },
          { label: 'Lo pilláis y falla', value: 'gana el grupo · 1 punto cada uno' },
        ],
      },
    },
    {
      icon: '🎯',
      title: 'La última bala del Camaleón',
      who: { actor: 'Bea (pillada) toca en la rejilla la palabra que cree secreta', others: 'los demás contenéis la respiración: si acierta, gana ella.' },
      text: [
        'La app le muestra la rejilla tocable SOLO a ella. Con las pistas «aleta», «peligro», «mandíbula»… Bea apuesta por «Tiburón». ¡Acierta! Escapa por la puerta grande y se lleva 1 punto.',
        'Si hubiera fallado, 1 punto para cada uno del grupo.',
      ],
      visual: { kind: 'log', lines: ['🗳️ Recuento: Bea 3 (tú, Carlos, David) · David 1 (Bea).', '🗳️ La mesa señala a Bea.', '🦎 ¡Bea era el Camaleón! Pero aún puede escapar si adivina la palabra…', '🦎 El Camaleón apuesta por «Tiburón». La palabra era «Tiburón».'] },
    },
    {
      icon: '🏆',
      title: 'Rondas y puntos',
      who: { actor: 'Cualquiera pulsa «🔁 Otra ronda»: tema nuevo y Camaleón nuevo (nunca repite el de la ronda anterior)', others: 'el marcador se acumula entre rondas.' },
      text: [
        'Si el Camaleón no cae, se lleva 2 puntos. Si lo pilláis pero acierta la palabra, se lleva 1 punto. Si lo pilláis y falla, suma 1 punto cada jugador del grupo.',
        'La lección de hoy: pistas ni obvias ni vagas… y cuidado con los que hablan en genérico. 🦎',
      ],
    },
  ],
};
