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
        'Lo que SÍ sabéis todos: sois 4, así que hay 2 honestos y 2 corruptos, y cada uno lleva siempre 2 cartas de su bando y 1 del contrario. Sin esos números no se puede deducir nada.',
        'Entre los honestos se esconde el 🕵️ AGENTE; entre los corruptos, el 👑 JEFE. Si cae un líder, su bando pierde en el acto. Encontrad al líder rival… antes de que os encuentren.',
      ],
    },
    {
      icon: '🎴',
      title: 'El reparto: tres cartas, una mayoría',
      who: { actor: 'TODOS miráis vuestras 3 cartas con el botón 🎴 de abajo, cuando queráis', others: 'en el tablero, TODAS las cartas se ven por el dorso: también las tuyas.' },
      text: [
        'Tus cartas 👮 👮 🦹 son dos honestas y una corrupta: tu bando por mayoría es el HONESTO. Y una de esas dos es… el 🕵️ Agente: ¡eres el líder honesto! Que nadie lo huela.',
        'El móvil se queda plano en la mesa: las cuatro pantallas son idénticas y lo tuyo solo sale al tocar el 🎴 —y se tapa solo a los pocos segundos, por si lo dejas ahí—.',
      ],
      visual: {
        kind: 'screens',
        panes: [
          { title: '🎴 Mi carta (solo tú)', lines: ['🕵️ Agente · 👮 Honesto · 🦹 Corrupto', 'Mayoría honesta → tu bando. Y llevas al líder.'] },
          { title: 'El tablero (todos)', lines: ['🂠 🂠 🂠', 'Tres dorsos. Nada más.'] },
        ],
      },
    },
    {
      icon: '🔍',
      title: 'Turno de Bea: investigar',
      who: { actor: 'Bea (su turno) elige «Investigar», te señala y elige una de tus cartas', others: 'la mesa VE que te investiga… pero solo Bea ve el resultado.' },
      text: [
        'Bea mira tu carta 2 (👮 Honesto). El resultado se abre en su botón 🎴 y en ningún otro sitio; en el diario, todos leen «Bea investiga la carta 2 de TÚ»: se sabe QUÉ carta ha mirado, no lo que ha visto.',
        'Cuidado: al investigar puede salir la carta de LÍDER. Si Bea llega a ver tu 🕵️ Agente (o el 👑 Jefe de un corrupto), sabe de golpe a quién hay que disparar. Ese es todo el juego.',
        'Todo lo que investigues se queda guardado en tu botón 🎴, en «lo que has visto»: no hace falta memorizarlo… ni asoma en la pantalla que ve la mesa.',
      ],
      visual: {
        kind: 'screens',
        panes: [
          { title: '🎴 Mi carta, en el móvil de Bea', lines: ['🔍 «TÚ, carta 2: 👮 Honesto.»', 'Si hubiera elegido tu carta 1: 🕵️ Agente.'], buttons: [{ label: '🙈 Tapar', kind: 'ghost' }] },
          { title: 'La pantalla de todos', lines: ['📜 «Bea investiga la carta 2 de TÚ.»', 'Sabes cuál ha mirado, no qué ha visto.'] },
        ],
      },
    },
    {
      icon: '🤔',
      title: 'Tu turno',
      who: { actor: 'TÚ eliges tu acción', others: 'Carlos acaba de coger una pistola 🔫; la mesa entera lo ve.' },
      text: ['Eres el Agente (líder honesto). Carlos —¿corrupto?— se ha armado y todavía no ha apuntado a nadie: tienes un turno de margen.'],
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
      icon: '⏱️',
      title: 'Matar cuesta TRES turnos tuyos',
      who: { actor: 'Carlos necesita tres turnos suyos seguidos: 🔫 armarse, 🎯 apuntar y 💥 disparar', others: 'entre medias juegan todos los demás, y lo ven venir.' },
      text: [
        'No se puede disparar de sopetón: para apuntar hay que ir armado, y para disparar hay que tener a alguien apuntado. Cada paso gasta un turno entero.',
        'Y los dos primeros son PÚBLICOS: la mesa ve el arma y ve la diana, así que el apuntado tiene tiempo de defenderse, de negociar… o de armarse él.',
      ],
      visual: {
        kind: 'log',
        lines: [
          '🔫 Carlos empuña una pistola.',
          '🎬 Turno de David.',
          '🎯 Carlos apunta a David.',
          '🎬 Turno de David. Le apuntan: tiene UN turno para reaccionar.',
        ],
      },
    },
    {
      icon: '💥',
      title: 'El disparo (con confirmación)',
      who: { actor: 'Carlos elige «💥 Disparar a David» y confirma', others: 'todos veis caer a David: sus 3 cartas se destapan.' },
      text: [
        'La app pregunta «¿seguro?» antes de disparar: es irreversible y puede acabar la partida de un toque.',
        'David era 🦹 corrupto… pero NO el Jefe: la partida sigue, con más información sobre la mesa. Disparar gasta la bala (Carlos tendrá que rearmarse).',
        'David queda eliminado: no juega más turnos y sus cartas se quedan boca arriba, pero sigue en la mesa mirando, comentando y sufriendo.',
      ],
      visual: { kind: 'log', lines: ['💥 Carlos dispara a David: era de 🦹 los Corruptos.', '🎬 Turno de TÚ.', '🔍 Bea investiga la carta 1 de Carlos.'] },
    },
    {
      icon: '🏆',
      title: 'El final',
      who: { actor: 'Quien dispara a un LÍDER acaba la partida en el acto', others: 'pierde el bando entero del líder caído; el otro puntúa.' },
      text: [
        'Si cae el 👑 Jefe, ganan los honestos; si cae el 🕵️ Agente (tú), ganan los corruptos. Al final se destapan todas las cartas y sale el marcador (gana un punto TODO el bando ganador, también los eliminados).',
        'Desde ahí, «🔁 Otra partida» reparte de nuevo con los mismos jugadores y conserva el marcador; «🏁 Terminar» os devuelve al lobby.',
        'Habla, acusa, promete… y consulta tus cartas con el botón 🎴 siempre que dudes de lo que llevas. 🚔',
      ],
      visual: { kind: 'log', lines: ['💥 Bea dispara a Carlos: era de 🦹 los Corruptos ¡y su LÍDER!', '🏆 ¡Ganan 👮 los Honestos! Ha caído el Jefe.'] },
    },
  ],
};
