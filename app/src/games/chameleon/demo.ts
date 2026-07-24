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
        'El grupo gana si lo desenmascara (y él no adivina la palabra); el Camaleón gana si pasa desapercibido o si, pillado, la acierta.',
      ],
      visual: { kind: 'grid', words: WORDS, hl: 0 },
    },
    {
      icon: '🎴',
      title: 'El reparto: dos cartas muy distintas',
      who: { actor: 'TODOS miráis vuestra carta a la vez, a solas, y confirmáis', others: 'la rejilla queda a la vista de todos, sin resaltar nada.' },
      text: [
        'A ti te marca la palabra secreta: «Tiburón». A Bea (aunque nadie lo sabe) le ha tocado ser el Camaleón: su carta solo dice «disimula».',
      ],
      visual: {
        kind: 'screens',
        panes: [
          { title: 'TÚ', lines: ['🔑 La palabra secreta es:', '«TIBURÓN»', 'Da una pista que demuestre que la conoces… sin regalarla.'] },
          { title: 'Bea (tú no lo ves)', lines: ['🦎 Eres el CAMALEÓN', 'No conoce la palabra: escuchará las pistas e improvisará.'] },
        ],
      },
    },
    {
      icon: '🗣️',
      title: 'Las pistas, por turnos y en voz alta',
      who: { actor: 'Cada uno, en su turno de mesa, dice UNA palabra en voz alta (empieza quien marque la app)', others: 'no se toca el móvil en esta fase: es todo hablado.' },
      text: [
        'Carlos: «aleta». David: «peligro». Bea (¡el Camaleón, improvisando!): «playa». Te toca a ti…',
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
      who: { actor: 'TODOS señaláis a la vez en el móvil a vuestro sospechoso (a ti mismo no)', others: 'la app espera a que vote el último y destapa el recuento de golpe.' },
      text: [
        '«Playa» ha chirriado: tú, Carlos y David votáis a Bea; ella vota a David. La app anuncia: «La mesa señala a Bea».',
        'Ojo: si hay EMPATE en cabeza, la mesa no se aclara… y el Camaleón escapa (+2).',
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
      icon: '🎯',
      title: 'La última bala del Camaleón',
      who: { actor: 'Bea (pillada) toca en la rejilla la palabra que cree secreta', others: 'los demás contenéis la respiración: si acierta, gana ella.' },
      text: [
        'La app le muestra la rejilla tocable SOLO a ella. Con las pistas «aleta», «peligro», «mandíbula»… Bea apuesta por «Tiburón». ¡Acierta! Escapa por la puerta grande (+1).',
        'Si hubiera fallado, punto para cada uno del grupo.',
      ],
      visual: { kind: 'log', lines: ['🗳️ La mesa señala a Bea.', '🦎 ¡Bea era el Camaleón! Pero aún puede escapar si adivina la palabra…', '🦎 El Camaleón apuesta por «Tiburón». La palabra era «Tiburón».', '🦎 El Camaleón gana la ronda (+1).'] },
    },
    {
      icon: '🏆',
      title: 'Rondas y puntos',
      who: { actor: 'Cualquiera pulsa «🔁 Otra ronda»: tema nuevo y Camaleón nuevo', others: 'el marcador se acumula entre rondas.' },
      text: [
        'Puntos: Camaleón sin pillar +2 · pillado pero acierta +1 · pillado y falla, +1 a cada uno del grupo.',
        'La lección de hoy: pistas ni obvias ni vagas… y cuidado con los que hablan en genérico. 🦎',
      ],
    },
  ],
};
