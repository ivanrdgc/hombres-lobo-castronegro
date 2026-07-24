// Tutorial de Coup: el flujo real de la app paso a paso, con los botones tal
// cual se ven. Un solo dispositivo, sin partida de verdad.
import type { DemoScript } from '../../shell/demo/types';

export const DEMO: DemoScript = {
  id: 'coup',
  name: 'Coup',
  emoji: '🃏',
  steps: [
    {
      icon: '🎯',
      title: 'Dos cartas y mucho morro',
      text: [
        'Tienes 2 influencias secretas y 2 monedas. Perder una influencia es descubrir una carta para siempre; con las dos descubiertas, estás fuera. Gana el último con influencia.',
        'El truco del juego: para usar las mejores jugadas basta con DECIR que tienes el personaje… lo tengas o no. Los demás deciden si tragárselo o desafiarte.',
      ],
      visual: {
        kind: 'chips',
        chips: [
          { name: 'Ana', emoji: '🂠🂠', badge: '2 monedas' },
          { name: 'Bea', emoji: '🂠🂠', badge: '2 monedas' },
          { name: 'Carlos', emoji: '🂠💥', badge: '5 monedas', dim: false },
        ],
        caption: 'El tablero: todos ven cuántas cartas te quedan, nunca cuáles.',
      },
    },
    {
      icon: '🎴',
      title: 'Mira tus cartas y confirma',
      text: [
        'Al empezar, toca «👁 Ver mis influencias» y míralas SIN que nadie vea tu pantalla. Después pulsa «✅ Lo tengo»; cuando todos confirman, cualquiera pulsa «▶️ Todos listos».',
      ],
      visual: {
        kind: 'card',
        emoji: '🎩🎭',
        title: 'Tus dos influencias',
        lines: ['🎩 Duque — cobra Impuestos (+3)', '🎭 Embajador — intercambia cartas con la corte'],
      },
    },
    {
      icon: '🎬',
      title: 'Tu turno: elige jugada',
      text: [
        'Cuando te toca, la app te ofrece SOLO lo que puedes pagar. Eliges jugada (y víctima, si la lleva) y la voz la anuncia a toda la mesa.',
        'Con 10 monedas o más, la app solo te dejará dar un Golpe de Estado (es obligatorio).',
      ],
      visual: {
        kind: 'buttons',
        buttons: [
          { label: '🪙 Renta (+1)', kind: 'ghost' },
          { label: '🤝 Ayuda exterior (+2)', kind: 'ghost' },
          { label: '🎩 Impuestos (+3) · «soy el Duque»', kind: 'primary' },
          { label: '⚓ Robar 2 monedas · «soy el Capitán»', kind: 'ghost' },
        ],
        caption: 'Renta y Golpe van directas; el resto espera la reacción de la mesa.',
      },
    },
    {
      icon: '❗',
      title: 'La ventana de reacción',
      text: [
        'Declarada una jugada de personaje, a los demás les salen «❗ Desafiar» y «👍 Paso». La jugada queda en el aire hasta que todos pasan o alguien desafía.',
        'Si el desafiado TENÍA el personaje: lo enseña, lo cambia por otro de la corte, y quien dudó pierde una influencia. Si NO lo tenía: el farol le cuesta una influencia y la jugada se cae.',
      ],
      visual: {
        kind: 'log',
        lines: [
          '🎩 Ana declara Impuestos (dice ser Duque). ¿Alguien lo desafía?',
          '❗ Bea desafía a Ana: «no eres Duque».',
          '✅ Ana SÍ era Duque: lo enseña y roba otra carta.',
          '💥 Bea descubre Capitán.',
        ],
      },
    },
    {
      icon: '🤔',
      title: 'Ponte a prueba',
      text: ['Ana declara Impuestos diciendo ser el Duque, y tú sospechas.'],
      ask: {
        prompt: '¿Qué haces?',
        choices: [
          { label: '❗ La desafío', good: true, reply: 'Si mentía, pierde una influencia y no cobra. Pero ojo: si SÍ era Duque, la influencia la pierdes tú. Desafía con motivos.' },
          { label: '👍 Paso y tomo nota', good: true, reply: 'También es jugar bien: deja que gaste el farol y guárdate el dato. No hace falta desafiarlo todo.' },
          { label: '🛡️ Bloqueo sus impuestos', reply: 'Los Impuestos no se pueden bloquear: solo la Ayuda exterior (Duque), el Robo (Capitán/Embajador) y el Asesinato (Condesa).' },
        ],
      },
    },
    {
      icon: '🛡️',
      title: 'Bloqueos (y sus faroles)',
      text: [
        'Si te asesinan o te roban, te saldrá «🛡️ Bloquear» diciendo ser Condesa (asesinato) o Capitán/Embajador (robo). La Ayuda exterior la puede bloquear cualquiera con el Duque.',
        'Bloquear es otra declaración: también se puede desafiar. Y una finura oficial: aunque pierdas un desafío contra el Asesino, CONSERVAS tu opción de bloquear con la Condesa.',
      ],
    },
    {
      icon: '💥',
      title: 'Perder influencias',
      text: [
        'Cuando te toque perder una influencia y tengas las dos, tu móvil te pedirá elegir CUÁL descubres. Con una sola, cae ella sola.',
        'Las cartas descubiertas quedan a la vista en el tablero: apunta mentalmente qué personajes ya no pueden estar en otras manos.',
      ],
      visual: { kind: 'buttons', buttons: [{ label: '💥 Descubrir mi Duque', kind: 'danger' }, { label: '💥 Descubrir mi Embajador', kind: 'danger' }], caption: 'Elegir bien qué carta sacrificas es parte del farol.' },
    },
    {
      icon: '👑',
      title: 'Y a ganar',
      text: [
        'El último jugador con influencia gana. La voz va cantando cada jugada (jamás tus cartas ocultas) y el marcador se guarda entre partidas.',
        'Eso es todo: farolea, duda de todos y no enseñes la pantalla. 🎭',
      ],
      visual: { kind: 'board', rows: [{ label: '👑 Ana', value: '2' }, { label: 'Bea', value: '1' }, { label: 'Carlos', value: '0' }] },
    },
  ],
};
