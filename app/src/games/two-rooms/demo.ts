// Tutorial de Two Rooms and a Boom: una partida de ejemplo continua, con quién
// actúa en cada momento y qué ve cada pantalla.
import type { DemoScript } from '../../shell/demo/types';

export const DEMO: DemoScript = {
  id: 'two_rooms',
  name: 'Two Rooms and a Boom',
  emoji: '💣',
  steps: [
    {
      icon: '🎯',
      title: 'La partida de ejemplo',
      text: [
        'Jugáis seis: TÚ, Bea y Carlos empezáis en la SALA 1; David, Eva y Fran, en la SALA 2 (dos espacios físicos separados). Cada uno es en secreto del bando 🔵 azul o 🔴 rojo.',
        'Entre los azules hay un PRESIDENTE; entre los rojos, un BOMBARDERO. Al final: misma sala → ¡BOOM!, gana el rojo; salas distintas → gana el azul. Todo el bando gana o pierde junto.',
      ],
      visual: { kind: 'chips', chips: [{ name: 'TÚ', badge: 'Sala 1' }, { name: 'Bea', badge: 'Sala 1' }, { name: 'Carlos', badge: 'Sala 1' }, { name: 'David', badge: 'Sala 2' }, { name: 'Eva', badge: 'Sala 2' }, { name: 'Fran', badge: 'Sala 2' }], caption: 'Quién está en cada sala es público; tu bando y tu rol, no.' },
    },
    {
      icon: '🎴',
      title: 'El reparto: carta y sala',
      who: { actor: 'TODOS pulsáis «👁 Ver mi carta y mi sala», la miráis A SOLAS y confirmáis con «✅ Lo tengo»', others: 'la pantalla enseña el tablero con quién va a cada sala, para que os coloquéis.' },
      text: [
        'A ti te toca 🔴 rojo, carta normal. Fran (aunque tú no lo sabes) es el 💣 BOMBARDERO. Nadie más que cada uno ve su carta.',
        'Tras confirmar, la carta se cierra. No se ha perdido: el botón redondo 🎴 de abajo a la derecha la vuelve a abrir siempre que quieras, y durante la ronda tienes también «👁 Ver mi carta».',
      ],
      visual: {
        kind: 'screens',
        panes: [
          { title: 'TÚ', lines: ['🔴 Equipo ROJO — carta normal', 'Tu sala inicial: Sala 1', 'Objetivo: que el Bombardero acabe con el Presidente.'] },
          { title: 'Fran (tú no lo ves)', lines: ['🔴 Equipo ROJO — 💣 BOMBARDERO', 'Sala 2. Debe acabar donde esté el Presidente.'] },
        ],
      },
    },
    {
      icon: '🗣️',
      title: 'Ronda 1: hablar y enseñar cartas',
      who: { actor: 'TODOS habláis DENTRO de vuestra sala mientras corre el reloj (3 min)', others: 'el temporizador se ve en cada móvil; la voz suena según el modo elegido al empezar.' },
      text: [
        'Enseñar la carta es EL mecanismo del juego, y se hace con el móvil: abres tu carta, tapas la pantalla con la mano y se la enseñas a esa persona, cara a cara. Solo a quien tú decidas, y solo si quieres.',
        'También puedes enseñar SOLO EL COLOR: el botón «🎨 Enseñar solo el color» deja en pantalla un panel con tu bando y nada más. Es la jugada favorita del Presidente, que necesita azules de confianza sin cantar que es el Presidente.',
        'Los azules quieren localizar y proteger al Presidente; los rojos, averiguar dónde está para acercarle al Bombardero.',
      ],
      visual: {
        kind: 'screens',
        panes: [
          { title: 'Carta entera', lines: ['🔵 Equipo AZUL', '🎖️ Eres el PRESIDENTE'], buttons: [{ label: '🎨 Enseñar solo el color', kind: 'ghost' }] },
          { title: 'Solo el color', lines: ['🔵 EQUIPO AZUL', 'Solo el bando: tu rol no sale en pantalla.'] },
        ],
      },
    },
    {
      icon: '🤔',
      title: 'Ponte a prueba',
      who: { actor: 'Imagina por un momento que TÚ fueras el Presidente', others: 'en tu sala te piden enseñar la carta.' },
      text: ['Bea te susurra: «enséñamela y te protejo».'],
      ask: {
        prompt: '¿Se la enseñas?',
        choices: [
          { label: 'Solo si ella me enseña antes una carta azul', good: true, reply: 'Eso es: confirma primero y gana escoltas de verdad. El Presidente necesita azules que lo mantengan lejos del Bombardero… sin que ningún rojo lo localice.' },
          { label: 'A toda la sala, para que me protejan', reply: 'Si hay un rojo delante, ya sabe a quién acercar al Bombardero en los intercambios. Enseñar la carta de Presidente a la ligera suele costar la partida.' },
          { label: 'Solo el color, para empezar', reply: 'Prudente: «soy azul» abre conversación sin destapar que eres el Presidente. Muchas partidas se ganan enseñando el color a media sala y el rol a una sola persona.' },
        ],
      },
    },
    {
      icon: '🔄',
      title: 'Fin del reloj: el voto de rehén',
      who: { actor: 'CADA SALA vota en su móvil a quién manda de rehén (tocas a alguien de TU sala y pulsas «🗳️ Votar»)', others: 'el voto es secreto: en pantalla solo se ve cuántos han votado y a quién se espera.' },
      text: [
        'En la Sala 1 os ponéis de acuerdo… o no: puedes votarte a ti mismo para ofrecerte. Cruza el más votado de cada sala (con salas grandes, uno de cada cuatro; empate: decide el orden de la mesa).',
        'La votación se cierra cuando ha votado toda la sala. Si alguien no vota, con la mayoría echada aparece «🔒 Cerrar la votación» y, si nadie lo pulsa, un minuto de reloj la cierra sola.',
        'Hasta que las dos salas no han decidido no se dice a quién manda ninguna: el trueque se elige a ciegas.',
      ],
      visual: {
        kind: 'screens',
        panes: [
          { title: 'TÚ (Sala 1)', lines: ['¿A quién mandáis de tu sala?', 'Tocas a Carlos.'], buttons: [{ label: '🗳️ Votar a Carlos', kind: 'primary' }] },
          { title: 'David (Sala 2)', lines: ['Su sala vota a la vez.', 'Sala 2: 2 de 3 votos…'] },
        ],
      },
    },
    {
      icon: '🚶',
      title: 'La colocación: los rehenes cruzan',
      who: { actor: 'Los rehenes se levantan y CAMBIAN de sala físicamente', others: 'los demás se quedan donde están y el reloj NO corre: sin prisa.' },
      text: [
        'A quien le toca cruzar se lo dice su propia pantalla, con todas las letras: «TE TOCA CRUZAR a la Sala 2». Los demás leen a quién reciben, y el tablero de arriba muestra cómo quedan las dos salas.',
        'Cuando cada uno está en su sitio, cualquiera pulsa «▶️ Empezar la ronda 2» y arranca el reloj de la siguiente (2 minutos; la ronda 3 dura 1).',
      ],
      visual: {
        kind: 'screens',
        panes: [
          { title: 'Carlos', lines: ['🚶 TE TOCA CRUZAR a la Sala 2.'], buttons: [{ label: '▶️ Empezar la ronda 2', kind: 'primary' }] },
          { title: 'TÚ (Sala 1)', lines: ['🚶 Os quedáis donde estáis.', 'Recibís a Fran.'] },
        ],
      },
    },
    {
      icon: '💥',
      title: 'El desenlace',
      who: { actor: 'Tras el intercambio de la última ronda, la APP destapa todas las cartas y dictamina', others: 'nadie tiene que contar nada: el veredicto es automático.' },
      text: [
        'En nuestra partida, Fran (Bombardero) logró cruzar hasta la sala del Presidente: ¡BOOM! Gana el equipo rojo (el tuyo), y cada jugador rojo suma 1 punto en el marcador de la mesa.',
        'Bajas a mitad: la partida sigue (sus votos caen), pero si abandona el Presidente o el Bombardero su bando se rinde. Marcador guardado y revancha con «🔁 Otra partida». 💣',
      ],
      visual: { kind: 'log', lines: ['🔔 ¡Fin de la ronda! Cada sala vota a quién manda de rehén.', '🔄 Intercambio: de la Sala 1 cruza Bea; de la Sala 2, Fran.', '🏁 El Presidente era Carlos y el Bombardero Fran. Misma sala: ¡BOOM! Gana el ROJO.'] },
    },
  ],
};
