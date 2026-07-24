// Tutorial de Shadow Hunters: una partida de ejemplo continua, con quién
// actúa en cada momento y qué ve cada pantalla.
import type { DemoScript } from '../../shell/demo/types';

export const DEMO: DemoScript = {
  id: 'shadow_hunters',
  name: 'Shadow Hunters',
  emoji: '🌘',
  steps: [
    {
      icon: '🎯',
      title: 'La partida de ejemplo',
      text: [
        'Jugáis TÚ, Bea, Carlos, David y Emma. La app reparte identidades SECRETAS de tres bandos: 🏹 Cazadores, 🌑 Sombras y 🧭 neutrales (con objetivo propio).',
        'Con 5 jugadores el reparto es PÚBLICO: 2 Cazadores, 2 Sombras y 1 neutral. Lo secreto es quién es quién, no cuántos hay.',
        'Cazadores ganan si mueren TODAS las Sombras; Sombras, si mueren TODOS los Cazadores. Todos empezáis con 8 puntos de vida ❤️, y nadie sabe quién es quién.',
      ],
    },
    {
      icon: '🎴',
      title: 'El reparto: tu personaje secreto',
      who: { actor: 'TODOS miráis vuestro personaje a la vez (botón 🎴, cuando queráis)', others: 'en el tablero, los demás aparecen como «❓ oculto».' },
      text: [
        'Te toca 🐺 el Licántropo: eres una SOMBRA. Tu poder (un solo uso, al revelarte): curarte 3 puntos. Tu misión: que caigan los Cazadores… sin que te descubran pronto.',
      ],
      visual: {
        kind: 'screens',
        panes: [
          { title: 'TÚ', lines: ['🐺 Licántropo · 🌑 las Sombras', 'Poder al revelarte: te curas 3 puntos.', '🤫 Nadie más lo sabe.'] },
          { title: 'Lo que ven de ti', lines: ['TÚ · ❓ oculto · ❤️ 8', 'Un nombre, una vida y un misterio.'] },
        ],
      },
    },
    {
      icon: '🔮',
      title: 'Turno de Bea: pista secreta',
      who: { actor: 'Bea (su turno) elige «🔮 Pista» y te señala a TI', others: 'la mesa VE que te da una pista y el resultado… pero el texto solo lo leéis Bea y tú.' },
      text: [
        'Tu pantalla dice: «Si eres Sombra, pierdes 1 punto de vida»… y lo pierdes ❤️. Bea ya SABE que eres Sombra (¡lo leyó al darla!). El resto solo ve que perdiste vida: deducen que la carta «te pilló».',
        'La carta se queda en las dos pantallas hasta que los DOS pulsáis «Entendido»: nadie te la puede cerrar antes de que la leas.',
        'Cada turno es UNA acción: 🔮 pista, ⚔️ ataque, 💊 descanso (recuperas 1 punto de vida) o 🎭 revelarte. Al terminarla, el turno pasa al siguiente jugador VIVO en el orden de la mesa.',
      ],
      visual: {
        kind: 'screens',
        panes: [
          { title: 'TÚ (recibes la pista)', lines: ['🔮 «Si eres Sombra, pierdes 1 punto de vida.»', 'Resultado público: pierdes 1 ❤️.'], buttons: [{ label: 'Entendido', kind: 'ghost' }] },
          { title: 'Carlos (mira la mesa)', lines: ['📜 «Bea entrega una pista a ti… y pierdes 1 punto de vida.»', 'Hmm. ¿Qué ponía esa carta?'] },
        ],
      },
    },
    {
      icon: '🤔',
      title: 'Tu turno',
      who: { actor: 'TÚ eliges tu acción', others: 'Bea te mira con cara de saber demasiado.' },
      text: ['Eres el Licántropo (Sombra) con 7 puntos de vida ❤️. Bea acaba de leer tu pista: sospecha de ti. ¿Qué haces?'],
      ask: {
        prompt: '¿Qué haces?',
        choices: [
          { label: '⚔️ Ataco a Bea antes de que hable', good: true, reply: 'Agresivo pero lógico: Bea es la única que SABE. La app tira dos dados y el daño es su diferencia. Eso sí, atacar tú primero también te señala…', },
          { label: '💊 Descanso y disimulo', good: true, reply: 'Discreto: recuperas el punto perdido y no confirmas nada. Si Bea te acusa, «esa pista pudo decir cualquier cosa». Mentir es gratis.' },
          { label: '🎭 Me revelo ya y me curo 3', reply: 'Pronto: revelarte destapa tu bando ante TODOS los Cazadores con la partida entera por delante. El poder se guarda para el momento crítico.' },
        ],
      },
    },
    {
      icon: '⚔️',
      title: 'Ataques y dados',
      who: { actor: 'Carlos (su turno) elige «⚔️ Atacar» y señala a David', others: 'todos veis los dados y el daño en el diario; la voz lo relata.' },
      text: [
        'La app tira 1 dado de 6 y 1 de 4: el daño es la DIFERENCIA, de 0 a 5, y 1 de cada 6 tiradas falla. Carlos saca 5 y 2 y le hace 3 de daño a David. No hace falta saber quién es: se ataca por sospecha… o por si acaso.',
        'Cuando alguien llega a 0 puntos de vida queda eliminado y su personaje se destapa para todos.',
      ],
      visual: { kind: 'log', lines: ['🎬 Turno de Carlos.', '⚔️ Carlos ataca a David: saca 5 y 2, y le hace 3 de daño.', '💊 David descansa y recupera 1 punto de vida.', '🔮 Emma entrega una pista a Carlos… y no le afecta.'] },
    },
    {
      icon: '🎭',
      title: 'Revelarse: el momento crítico',
      who: { actor: 'Emma (su turno, con 3 de vida ❤️) pulsa «🎭 Revelarte» y elige objetivo', others: 'la mesa entera descubre su identidad y sufre su poder.' },
      text: [
        'Emma se revela: ¡es 🧛 el Vampiro (Sombra)! Roba 2 ❤️ a Carlos y se los queda. Ahora los Cazadores saben a quién cazar… pero el Vampiro ya sacó ventaja.',
        'Revelarse es UNA vez por partida: hazlo cuando el poder gane la jugada, no antes.',
      ],
      visual: { kind: 'log', lines: ['🎭 Emma se revela: es 🧛 Vampiro (🌑 las Sombras).', '☠️ Carlos cae: era 🏹 Georg (🏹 los Cazadores).'] },
    },
    {
      icon: '🏆',
      title: 'El final',
      who: { actor: 'La app comprueba la victoria tras cada acción', others: 'al caer el último Cazador (o la última Sombra), destapa a todos.' },
      text: [
        'Cae el último Cazador: ¡ganáis las Sombras (tú y Emma)! Los neutrales ganan aparte: 🧸 Allie si acaba VIVA, 💰 Bob si remató a alguien. Pueden ganar a la vez que un bando.',
        'Deduce con las pistas, miente con soltura y guarda tu poder para el momento justo. En el botón 🎴 tienes siempre la chuleta de los ocho personajes. 🌘',
      ],
      visual: { kind: 'log', lines: ['☠️ David cae: era ⚡ Franklin (🏹 los Cazadores).', '🏆 Ganan 🌑 las Sombras. No queda ningún Cazador en pie.', '🧸 Bea estaba viva y era Allie: también gana.'] },
    },
  ],
};
