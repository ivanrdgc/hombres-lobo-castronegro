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
      who: { actor: 'TODOS pulsáis «👁 Ver mi carta y mi sala», la miráis A SOLAS y confirmáis', others: 'cuando confirma el último, os separáis físicamente y cualquiera pulsa «▶️ Empezar la ronda 1».' },
      text: [
        'A ti te toca 🔴 rojo, carta normal. Fran (aunque tú no lo sabes) es el 💣 BOMBARDERO. Nadie más que cada uno ve su carta.',
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
        'Dentro de tu sala puedes ENSEÑAR tu carta a quien quieras, cara a cara y en privado (eso es cosa vuestra, la app no interviene: solo custodia quién es quién).',
        'Los azules quieren localizar y proteger al Presidente; los rojos, averiguar dónde está para acercarle al Bombardero.',
      ],
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
          { label: 'A nadie, jamás', reply: 'Legítimo… pero si ningún azul confía en ti, no podrán protegerte en los votos de rehén. El silencio total también tiene precio.' },
        ],
      },
    },
    {
      icon: '🔄',
      title: 'Fin del reloj: el voto de rehén',
      who: { actor: 'CADA SALA vota en su móvil a quién manda de rehén (tocas a alguien de TU sala y pulsas «🗳️ Votar»)', others: 'el voto es secreto: en pantalla solo se ve cuántos han votado.' },
      text: [
        'En la Sala 1 os ponéis de acuerdo… o no: puedes votarte a ti mismo para ofrecerte. El más votado de cada sala CRUZA a la otra (empate: decide el orden de la mesa).',
        'Tras el intercambio el reloj NO corre: los rehenes se colocan con calma y, cuando todos están en su sala, cualquiera pulsa «▶️ Empezar la ronda 2» (2 minutos; la ronda 3 dura 1).',
      ],
      visual: {
        kind: 'screens',
        panes: [
          { title: 'TÚ (Sala 1)', lines: ['¿A quién mandáis de tu sala?', 'Tocas a Carlos.'], buttons: [{ label: '🗳️ Votar a Carlos', kind: 'primary' }] },
          { title: 'David (Sala 2)', lines: ['Su sala vota a la vez.', 'Sala 2: 2/3 votos…'] },
        ],
      },
    },
    {
      icon: '💥',
      title: 'El desenlace',
      who: { actor: 'Tras el intercambio de la ronda 3, la APP destapa todas las cartas y dictamina', others: 'nadie tiene que contar nada: el veredicto es automático.' },
      text: [
        'En nuestra partida, Fran (Bombardero) logró cruzar hasta la sala del Presidente: ¡BOOM! Gana el equipo rojo (el tuyo).',
        'Bajas a mitad: la partida sigue (sus votos caen), pero si abandona el Presidente o el Bombardero su bando se rinde. Marcador guardado y revancha con «🔁 Otra partida». 💣',
      ],
      visual: { kind: 'log', lines: ['🔔 ¡Fin de la ronda! Cada sala vota a quién manda de rehén.', '🔄 Intercambio: Fran pasa a la Sala 1 y Bea a la Sala 2.', '🏁 El Presidente era Carlos y el Bombardero Fran. Misma sala: ¡BOOM! Gana el ROJO.'] },
    },
  ],
};
