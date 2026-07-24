// Tutorial de Coup: un turno de ejemplo continuo, con quién actúa en cada
// momento y qué ve cada pantalla.
import type { DemoScript } from '../../shell/demo/types';

export const DEMO: DemoScript = {
  id: 'coup',
  name: 'Coup',
  emoji: '🃏',
  steps: [
    {
      icon: '🎯',
      title: 'La partida de ejemplo',
      text: [
        'Jugáis TÚ, Bea y Carlos. Cada uno esconde 2 influencias (cartas) y tiene 2 monedas. Perder una influencia es descubrir una carta para siempre; con las dos descubiertas, fuera. Gana el último en pie.',
        'El truco: las mejores jugadas pertenecen a personajes, y basta con DECIR que tienes el personaje… lo tengas o no. Los demás deciden si tragárselo o desafiarte.',
      ],
      visual: { kind: 'chips', chips: [{ name: 'TÚ', emoji: '🂠🂠', badge: '2 monedas' }, { name: 'Bea', emoji: '🂠🂠', badge: '2 monedas' }, { name: 'Carlos', emoji: '🂠🂠', badge: '2 monedas' }], caption: 'El tablero: todos ven CUÁNTAS cartas te quedan, nunca cuáles.' },
    },
    {
      icon: '🎴',
      title: 'El reparto',
      who: { actor: 'TODOS veis vuestras 2 cartas en pantalla y pulsáis «Lo tengo»', others: 'cuando el último confirma, cualquiera pulsa «Empezar la partida».' },
      text: [
        'A ti te tocan 🎩 Duque y 🎭 Embajador. Buen combo: puedes cobrar impuestos con la verdad… y farolear el resto.',
        'Tus dos cartas se quedan ancladas arriba en tu pantalla toda la partida, con tus monedas al lado: sujeta el móvil mirando a ti, como una mano de cartas, y no lo dejes en la mesa.',
        'Las 15 cartas de la corte (el mazo) son 5 personajes con 3 copias de cada uno. La chuleta completa está en el botón flotante de abajo a la derecha, para consultarla en cualquier fase.',
      ],
      visual: {
        kind: 'screens',
        panes: [
          { title: 'TÚ', lines: ['🎩 Duque — Impuestos (+3)', '🎭 Embajador — intercambia cartas con la corte (el mazo)'] },
          { title: 'Bea (tú no lo ves)', lines: ['🗡️ Asesino y ⚓ Capitán', 'Ella tampoco ve las tuyas.'] },
        ],
      },
    },
    {
      icon: '🎬',
      title: 'Turno de Bea: declara una jugada',
      who: { actor: 'Bea (su turno) elige una jugada en su móvil y la app la anuncia a todos', others: 'tú y Carlos veréis abrirse vuestra ventana de reacción.' },
      text: [
        'Bea declara «Impuestos» (+3), o sea: dice ser Duque. La app solo le ofrece lo que puede pagar; con 10+ monedas, solo Golpe de Estado (obligatorio).',
        'Salvo la Renta y el Golpe (inmediatos), la jugada queda EN EL AIRE esperando la reacción de la mesa.',
      ],
      visual: { kind: 'log', lines: ['🎬 Turno de Bea.', '🎩 Bea declara Impuestos (dice ser Duque). ¿Alguien lo desafía?'] },
    },
    {
      icon: '🤔',
      title: 'Tu ventana de reacción',
      who: { actor: 'TÚ y Carlos tenéis botones «❗ Desafiar» y «👍 Paso»', others: 'Bea espera: su jugada no avanza hasta que TODOS paséis o alguien desafíe.' },
      text: ['Sospechas del Duque de Bea (¡tú tienes uno de los tres que hay!).'],
      ask: {
        prompt: '¿Qué haces?',
        choices: [
          { label: '❗ La desafío', good: true, reply: 'Se resuelve al instante: si Bea NO era Duque, pierde una influencia y su jugada cae. Pero si SÍ lo era… la enseña, roba carta nueva y la influencia la pierdes TÚ. Desafía con motivos.' },
          { label: '👍 Paso y tomo nota', good: true, reply: 'También es jugar bien: deja que gaste el farol y guárdate el dato. Si Carlos también pasa, Bea cobra sus +3 (fuera verdad o mentira).' },
          { label: '🛡️ Bloqueo sus impuestos', reply: 'Los Impuestos no se pueden bloquear. Se bloquean: la Ayuda exterior (con Duque), el Robo (Capitán/Embajador) y el Asesinato (Condesa).' },
        ],
      },
    },
    {
      icon: '🎭',
      title: 'Tu turno: robar e intercambiar',
      who: { actor: 'TÚ eliges «⚓ Robar» o «🎭 Intercambiar» en tu móvil', others: 'los demás abren su ventana de desafío; el intercambio, además, no se puede bloquear.' },
      text: [
        '⚓ Robar (Capitán): le quitas 2 monedas a quien elijas. Si solo tiene 1, te llevas esa; a quien no tiene ninguna la app ni te deja apuntarle. La víctima puede bloquearte diciendo ser Capitán o Embajador.',
        '🎭 Intercambiar (Embajador): la app roba 2 cartas de la corte (el mazo) y te enseña CUATRO —tus 2 ocultas y las 2 nuevas—. Conservas tantas como influencias te queden (2 si estás entero, 1 si ya perdiste una) y el resto vuelve barajado a la corte. Nadie ve qué te has quedado: es la forma limpia de dejar de ser el Duque que todos creen que eres.',
      ],
      visual: {
        kind: 'screens',
        panes: [
          {
            title: 'TÚ (Embajador) · elige 2 de 4',
            lines: ['🎩 Duque (tuya)', '🎭 Embajador (tuya)', '👑 Condesa (de la corte)', '⚓ Capitán (de la corte)'],
            buttons: [{ label: '🎭 Conservar estas 2 y devolver el resto', kind: 'primary' }],
          },
          { title: 'Bea y Carlos', lines: ['«🎭 Barajas con la corte…»', 'No ven las 4 cartas ni con cuáles te quedas.'] },
        ],
      },
    },
    {
      icon: '🗡️',
      title: 'Un asesinato y sus DOS ventanas',
      who: { actor: 'Bea (otro turno) paga 3 y declara «Asesinar» contra TI', others: 'se abren dos ventanas seguidas: 1) desafiar su Asesino (todos), 2) bloquear con la Condesa (solo tú, la víctima).' },
      text: [
        'Por eso te sale un botón y, después, otro distinto: son dos preguntas seguidas. Bloquear es OTRA declaración —puede ser farol— y abre a su vez su propia ventana de desafío.',
        'Regla fina (oficial): aunque pierdas un desafío contra el Asesino, CONSERVAS tu opción de bloquear con la Condesa. Eso sí: farolear la Condesa y que te cacen son las dos cartas de una tacada.',
      ],
      visual: {
        kind: 'screens',
        panes: [
          {
            title: 'TÚ · paso 1: ¿la desafías?',
            lines: ['«🗡️ Bea declara Asesinar contra ti (dice ser Asesino).»', 'Aquí reaccionáis TODOS: tú y Carlos.'],
            buttons: [{ label: '❗ Desafiar', kind: 'danger' }, { label: '👍 No lo desafío', kind: 'ghost' }],
          },
          {
            title: 'TÚ · paso 2: ¿lo bloqueas?',
            lines: ['Nadie desafió: ahora decides SOLO tú, la víctima.'],
            buttons: [{ label: '🛡️ Bloquear · digo ser Condesa', kind: 'primary' }, { label: '👍 Paso, me lo como', kind: 'ghost' }],
          },
          { title: 'Carlos', lines: ['En el paso 1 desafía o pasa, como tú.', 'En el paso 2 solo mira: el bloqueo es cosa de la víctima.'] },
        ],
      },
    },
    {
      icon: '💥',
      title: 'Perder influencias',
      who: { actor: 'Quien deba perder influencia elige CUÁL de sus cartas descubre en su móvil', others: 'la carta descubierta queda boca arriba en el tablero, a la vista de todos.' },
      text: [
        'Si te comes el asesinato con dos cartas, eliges cuál sacrificas; con una sola, cae ella sola. Todo lo descubierto es información pública: apunta qué personajes ya no pueden estar en otras manos.',
      ],
      visual: { kind: 'buttons', buttons: [{ label: '💥 Descubrir mi Duque', kind: 'danger' }, { label: '💥 Descubrir mi Embajador', kind: 'danger' }], caption: 'Elegir bien qué carta sacrificas es parte del farol.' },
    },
    {
      icon: '👑',
      title: 'Y a ganar',
      who: { actor: 'El último con influencia gana; la voz va cantando cada jugada', others: 'revancha con «🔁 Otra partida»: el marcador se guarda.' },
      text: [
        'Chuleta rápida: 🪙 Renta +1 (nadie la para) · 🤝 Ayuda +2 (la bloquea cualquier «Duque») · 🎩 Impuestos +3 · ⚓ Robar 2 · 🗡️ Asesinar (3 monedas) · 🎭 Intercambiar cartas · 💥 Golpe 7 monedas (imparable) · 👑 Condesa: sin acción propia, solo bloquea el asesinato.',
        'Tus cartas están siempre arriba en tu pantalla y esa chuleta, en el botón flotante de abajo a la derecha: consúltalo cuando quieras, es privado. Ganas si eres quien queda en pie: 1 punto al marcador y se destapan todas las manos.',
        'Farolea, duda de todos y no enseñes la pantalla. 🎭',
      ],
    },
  ],
};
