// Tutorial de Good Cop Bad Cop: una partida de ejemplo continua, con quién
// actúa en cada momento y qué ve cada pantalla.
import type { DemoScript } from '../../shell/demo/types';

export const DEMO: DemoScript = {
  id: 'good_cop',
  name: 'Good Cop Bad Cop',
  emoji: '🚔',
  steps: [
    {
      icon: '🎯',
      title: 'La partida de ejemplo',
      text: [
        'Jugáis TÚ, Bea, Carlos y David. Cada uno tiene 3 cartas de integridad boca abajo: tu BANDO es su mayoría (👮 honestos o 🦹 corruptos), y nadie más lo sabe.',
        'Entre los honestos se esconde el 🕵️ AGENTE; entre los corruptos, el 👑 JEFE. Si cae un líder, su bando pierde en el acto. Encontrad al líder rival… antes de que os encuentren.',
      ],
    },
    {
      icon: '🎴',
      title: 'El reparto: tres cartas, una mayoría',
      who: { actor: 'TODOS miráis vuestras 3 cartas a la vez (botón 🎴, cuando queráis)', others: 'en el tablero, las cartas ajenas son dorsos 🂠.' },
      text: [
        'Tus cartas: 👮 👮 🦹 → eres HONESTO (mayoría). Y una de ellas es… el 🕵️ Agente: ¡eres el líder honesto! Que nadie lo huela.',
      ],
      visual: {
        kind: 'screens',
        panes: [
          { title: 'TÚ', lines: ['🕵️ Agente · 👮 Honesto · 🦹 Corrupto', 'Mayoría honesta → tu bando. Y llevas al líder.'] },
          { title: 'Lo que ven de ti', lines: ['🂠 🂠 🂠', 'Tres dorsos. Nada más.'] },
        ],
      },
    },
    {
      icon: '🔍',
      title: 'Turno de Bea: investigar',
      who: { actor: 'Bea (su turno) elige «Investigar», te señala y elige una de tus cartas', others: 'la mesa VE que te investiga… pero solo Bea ve el resultado.' },
      text: [
        'Bea mira tu carta 2 (👮 Honesto). En su pantalla le sale una tarjeta privada; en el diario, todos leen solo «Bea investiga una carta de TÚ».',
        'Cada turno es UNA acción: investigar, armarse, apuntar o disparar.',
      ],
      visual: {
        kind: 'screens',
        panes: [
          { title: 'Bea (investiga)', lines: ['🔍 «TÚ, carta 2: 👮 Honesto. Solo tú lo sabes.»'], buttons: [{ label: 'Entendido', kind: 'ghost' }] },
          { title: 'TÚ', lines: ['📜 «Bea investiga una carta de TÚ.»', 'No sabes CUÁL ha visto ni qué opina.'] },
        ],
      },
    },
    {
      icon: '🤔',
      title: 'Tu turno',
      who: { actor: 'TÚ eliges tu acción', others: 'Carlos va armado 🔫 y apunta 🎯 a David; la mesa entera lo ve.' },
      text: ['Eres el Agente (líder honesto). Carlos —¿corrupto?— apunta a David, que a ti te huele a honesto.'],
      ask: {
        prompt: '¿Qué haces?',
        choices: [
          { label: '🔍 Investigo a Carlos, a ver de qué pie cojea', good: true, reply: 'Información antes que pólvora: si le ves cartas corruptas, ya tienes candidato a Jefe… y argumentos para que la mesa lo frene.' },
          { label: '🔫 Me armo, por si acaso', good: true, reply: 'También válido: un Agente armado disuade. Eso sí, armarte te pone en el radar («¿por qué se arma ESTE?»).' },
          { label: 'Anuncio que soy el Agente para que me protejan', reply: 'Suicidio: el Jefe y los suyos te apuntarán a la primera. El Agente sobrevive callado; que hablen tus votos y tus balas.' },
        ],
      },
    },
    {
      icon: '💥',
      title: 'Apuntar y disparar',
      who: { actor: 'Carlos (armado y apuntando) elige «Disparar» en su turno', others: 'todos veis caer a David: sus 3 cartas se destapan.' },
      text: [
        'David era 🦹 corrupto… pero NO el Jefe: la partida sigue, con más información sobre la mesa. Disparar gasta la bala (Carlos tendrá que rearmarse).',
        'Apuntar es público y se puede cambiar: es tanto amenaza como farol.',
      ],
      visual: { kind: 'log', lines: ['🎯 Carlos apunta a David.', '💥 Carlos dispara a David: era de 🦹 los Corruptos.', '🔍 Bea investiga una carta de Carlos.'] },
    },
    {
      icon: '🏆',
      title: 'El final',
      who: { actor: 'Quien dispara a un LÍDER acaba la partida en el acto', others: 'pierde el bando entero del líder caído; el otro puntúa.' },
      text: [
        'Si cae el 👑 Jefe, ganan los honestos; si cae el 🕵️ Agente (tú), ganan los corruptos. Al final se destapan todas las cartas.',
        'Habla, acusa, promete… y consulta tu 🎴 siempre que dudes de tus propias cartas. 🚔',
      ],
      visual: { kind: 'log', lines: ['💥 Bea dispara a Carlos: era de 🦹 los Corruptos ¡y su LÍDER!', '🏆 ¡Ganan 👮 los Honestos! Ha caído el Jefe.'] },
    },
  ],
};
