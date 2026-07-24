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
      who: { actor: 'TODOS miráis vuestras 2 cartas a la vez («👁 Ver mis influencias» → «✅ Lo tengo»)', others: 'cuando el último confirma, cualquiera pulsa «▶️ Todos listos».' },
      text: [
        'A ti te tocan 🎩 Duque y 🎭 Embajador. Buen combo: puedes cobrar impuestos con la verdad… y farolear el resto.',
      ],
      visual: {
        kind: 'screens',
        panes: [
          { title: 'TÚ', lines: ['🎩 Duque — Impuestos (+3)', '🎭 Embajador — intercambia con la corte'] },
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
      icon: '🗡️',
      title: 'Un asesinato y su defensa',
      who: { actor: 'Bea (otro turno) paga 3 y declara «Asesinar» contra TI', others: 'primero todos pueden desafiar su Asesino; si nadie lo hace, TÚ decides si bloqueas.' },
      text: [
        'En tu pantalla: «🛡️ Bloquear · digo ser Condesa» o «👍 Paso». Bloquear es OTRA declaración —puede ser farol— y cualquiera puede desafiarla a su vez.',
        'Regla fina (oficial): aunque pierdas un desafío contra el Asesino, CONSERVAS tu opción de bloquear con la Condesa. Eso sí: farolear la Condesa y que te cacen son las dos cartas de una tacada.',
      ],
      visual: {
        kind: 'screens',
        panes: [
          { title: 'TÚ (víctima)', lines: ['«🗡️ Bea declara Asesinar contra ti.»'], buttons: [{ label: '🛡️ Bloquear · digo ser Condesa', kind: 'primary' }, { label: '👍 Paso (me lo como)', kind: 'ghost' }] },
          { title: 'Carlos', lines: ['Ya pasó su ventana de desafío.', 'Mira el duelo con palomitas.'] },
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
        'Chuleta rápida: 🪙 Renta +1 (nadie la para) · 🤝 Ayuda +2 (la bloquea cualquier «Duque») · 🎩 Impuestos +3 · ⚓ Robar 2 · 🗡️ Asesinar (3 monedas) · 🎭 Intercambiar cartas · 💥 Golpe 7 monedas (imparable).',
        'Farolea, duda de todos y no enseñes la pantalla. 🎭',
      ],
    },
  ],
};
